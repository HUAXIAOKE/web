package store

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"huaxiaoke-backend/config"
)

func RunMigrations() error {
	if _, err := DB.Exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`); err != nil {
		return fmt.Errorf("schema_version: %w", err)
	}

	currentVer := 0
	row := DB.QueryRow(`SELECT COALESCE(version, 0) FROM schema_version ORDER BY version DESC LIMIT 1`)
	if err := row.Scan(&currentVer); err != nil {
		currentVer = 0
	}

	if currentVer >= config.SchemaVersion {
		fmt.Printf("[migrate] version up-to-date (%d >= %d)\n", currentVer, config.SchemaVersion)
		return nil
	}

	fmt.Printf("[migrate] %d -> %d\n", currentVer, config.SchemaVersion)

	for v := currentVer; v < config.SchemaVersion; v++ {
		switch v {
		case 0:
			if err := migrateToV1(); err != nil {
				return fmt.Errorf("v1: %w", err)
			}
		case 1:
			if err := migrateV1ToV2(); err != nil {
				return fmt.Errorf("v2: %w", err)
			}
		}
	}

	if _, err := DB.Exec(`INSERT INTO schema_version (version) VALUES (?)`, config.SchemaVersion); err != nil {
		return fmt.Errorf("update version: %w", err)
	}

	fmt.Printf("[migrate] done -> %d\n", config.SchemaVersion)
	return nil
}

func migrateToV1() error {
	DB.Exec(`DELETE FROM schema_version`)
	return nil
}

func migrateV1ToV2() error {
	var tableName string
	err := DB.QueryRow(`SELECT name FROM sqlite_master WHERE type='table' AND name='joinus_submission'`).Scan(&tableName)
	if err != nil || tableName != "joinus_submission" {
		return nil
	}

	if err := exportJoinusData(); err != nil {
		log.Printf("[migrate] warn: export joinus failed: %v", err)
	}

	if _, err := DB.Exec(`DROP TABLE IF EXISTS joinus_submission`); err != nil {
		return fmt.Errorf("drop joinus_submission: %w", err)
	}

	return nil
}

func exportJoinusData() error {
	rows, err := DB.Query(`SELECT id, submitted_at, data FROM joinus_submission ORDER BY id`)
	if err != nil {
		return fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	type submission struct {
		ID          int                    `json:"id"`
		SubmittedAt string                 `json:"submitted_at"`
		Data        map[string]interface{} `json:"data"`
	}

	var submissions []submission
	for rows.Next() {
		var id int
		var submittedAt, dataStr string
		if err := rows.Scan(&id, &submittedAt, &dataStr); err != nil {
			continue
		}
		var data map[string]interface{}
		json.Unmarshal([]byte(dataStr), &data)
		submissions = append(submissions, submission{
			ID:          id,
			SubmittedAt: submittedAt,
			Data:        data,
		})
	}

	dataDir := filepath.Dir(config.DBPath)
	os.MkdirAll(dataDir, 0755)

	backupPath := filepath.Join(dataDir, fmt.Sprintf("joinus_backup_%s.json", time.Now().Format("20060102_150405")))
	jsonData, err := json.MarshalIndent(submissions, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}

	if err := os.WriteFile(backupPath, jsonData, 0644); err != nil {
		return fmt.Errorf("write: %w", err)
	}

	fmt.Printf("[migrate] backup: %s (%d records)\n", backupPath, len(submissions))
	return nil
}