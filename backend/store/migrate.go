package store

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
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
		case 2:
			if err := migrateV2ToV3(); err != nil {
				return fmt.Errorf("v3: %w", err)
			}
		case 3:
			if err := migrateV3ToV4(); err != nil {
				return fmt.Errorf("v4: %w", err)
			}
		case 4:
			if err := migrateV4ToV5(); err != nil {
				return fmt.Errorf("v5: %w", err)
			}
		case 5:
			if err := migrateV5ToV6(); err != nil {
				return fmt.Errorf("v6: %w", err)
			}
		case 6:
			if err := migrateV6ToV7(); err != nil {
				return fmt.Errorf("v7: %w", err)
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

func migrateV2ToV3() error {
	addCol := func(col, def string) error {
		var count int
		row := DB.QueryRow(`SELECT COUNT(*) FROM pragma_table_info('music') WHERE name=?`, col)
		if err := row.Scan(&count); err != nil || count > 0 {
			return nil
		}
		_, err := DB.Exec(fmt.Sprintf(`ALTER TABLE music ADD COLUMN %s %s`, col, def))
		return err
	}
	if err := addCol("bvid", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return fmt.Errorf("add bvid: %w", err)
	}
	if err := addCol("duration", "INTEGER NOT NULL DEFAULT 0"); err != nil {
		return fmt.Errorf("add duration: %w", err)
	}
	if err := addCol("sort_order", "INTEGER NOT NULL DEFAULT 0"); err != nil {
		return fmt.Errorf("add sort_order: %w", err)
	}
	if err := addCol("created_at", "TEXT"); err != nil {
		return fmt.Errorf("add created_at: %w", err)
	}
	DB.Exec(`UPDATE music SET created_at = datetime('now') WHERE created_at IS NULL`)
	return nil
}

func migrateV3ToV4() error {
	tables := []struct {
		table string
		col   string
	}{
		{"activity", "image"},
		{"timeline_event", "image"},
		{"gallery", "image"},
		{"about_card", "image"},
		{"music", "cover"},
	}

	for _, t := range tables {
		sql := fmt.Sprintf(`
			UPDATE %s
			SET %s = REPLACE(
				REPLACE(
					REPLACE(
						REPLACE(
							REPLACE(
								REPLACE(%s, '.jpeg', '.webp'),
							'.jpg', '.webp'),
						'.png', '.webp'),
					'.JPEG', '.webp'),
				'.JPG', '.webp'),
			'.PNG', '.webp')
			WHERE %s LIKE '%%.jpeg' OR %s LIKE '%%.jpg' OR %s LIKE '%%.png'
				OR %s LIKE '%%.JPEG' OR %s LIKE '%%.JPG' OR %s LIKE '%%.PNG'`,
			t.table, t.col, t.col, t.col, t.col, t.col, t.col, t.col, t.col)

		if _, err := DB.Exec(sql); err != nil {
			return fmt.Errorf("update %s.%s: %w", t.table, t.col, err)
		}
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

func migrateV4ToV5() error {
	var candidates []string
	if PublicAssetsDir != "" {
		candidates = append(candidates, filepath.Join(PublicAssetsDir, "img", "Illustration"))
	}
	candidates = append(candidates,
		filepath.Join(filepath.Dir(config.DBPath), "..", "public", "img", "Illustration"),
		filepath.Join("..", "public", "img", "Illustration"),
		filepath.Join("public", "img", "Illustration"),
	)
	seen := make(map[string]bool)
	galleryDir := ""
	for _, c := range candidates {
		c = filepath.Clean(c)
		if seen[c] {
			continue
		}
		seen[c] = true
		fi, err := os.Stat(c)
		if err == nil && fi.IsDir() {
			galleryDir = c
			break
		}
	}
	if galleryDir == "" {
		return fmt.Errorf("gallery dir not found (tried paths relative to cwd and PublicAssetsDir)")
	}
	entries, err := os.ReadDir(galleryDir)
	if err != nil {
		return fmt.Errorf("read gallery dir: %w", err)
	}

	type galleryInfo struct {
		Image, Illustrator, Scene, Desc string
	}
	existing := make(map[string]galleryInfo)
	rows, err := DB.Query(`SELECT image, illustrator, scene, description FROM gallery`)
	if err != nil {
		return fmt.Errorf("query gallery: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var info galleryInfo
		if rows.Scan(&info.Image, &info.Illustrator, &info.Scene, &info.Desc) == nil {
			existing[filepath.Base(info.Image)] = info
		}
	}

	added := 0
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(strings.ToLower(name), ".webp") {
			continue
		}
		if _, ok := existing[name]; ok {
			continue
		}
		DB.Exec(`INSERT INTO gallery (image,illustrator,scene,description) VALUES (?,?,?,?)`,
			"/img/Illustration/"+name, "xxx", "xxx", "xxx")
		added++
	}

	fmt.Printf("[migrate] v5: added %d gallery records from filesystem\n", added)
	return nil
}

func migrateV5ToV6() error {
	if PublicAssetsDir == "" {
		return fmt.Errorf("PublicAssetsDir is empty, cannot resolve image paths")
	}

	rows, err := DB.Query(`SELECT id, image FROM gallery`)
	if err != nil {
		return fmt.Errorf("query gallery: %w", err)
	}

	type row struct {
		id    int
		image string
	}
	var toDelete []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.image); err != nil {
			continue
		}
		if !strings.HasPrefix(r.image, "/img/") {
			continue
		}
		absPath := filepath.Join(PublicAssetsDir, filepath.FromSlash(strings.TrimPrefix(r.image, "/")))
		if _, err := os.Stat(absPath); os.IsNotExist(err) {
			toDelete = append(toDelete, r)
		}
	}
	rows.Close()

	for _, r := range toDelete {
		if _, err := DB.Exec(`DELETE FROM gallery WHERE id=?`, r.id); err != nil {
			log.Printf("[migrate] v6: delete gallery id=%d failed: %v", r.id, err)
			continue
		}
		log.Printf("[migrate] v6: removed orphan gallery id=%d image=%s", r.id, r.image)
	}

	fmt.Printf("[migrate] v6: removed %d orphan gallery records\n", len(toDelete))
	return nil
}

func migrateV6ToV7() error {
	addCol := func(table, col, def string) error {
		var count int
		row := DB.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM pragma_table_info('%s') WHERE name=?`, table), col)
		if err := row.Scan(&count); err != nil || count > 0 {
			return nil
		}
		_, err := DB.Exec(fmt.Sprintf(`ALTER TABLE %s ADD COLUMN %s %s`, table, col, def))
		return err
	}

	if err := addCol("activity", "is_signup", "INTEGER NOT NULL DEFAULT 0"); err != nil {
		return fmt.Errorf("add is_signup: %w", err)
	}
	if err := addCol("activity", "signup_start", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return fmt.Errorf("add signup_start: %w", err)
	}
	if err := addCol("activity", "signup_end", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return fmt.Errorf("add signup_end: %w", err)
	}

	activities := `CREATE TABLE IF NOT EXISTS activity_detail (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		activity_id INTEGER NOT NULL,
		content     TEXT NOT NULL DEFAULT '',
		updated_at  TEXT DEFAULT (datetime('now'))
	)`
	if _, err := DB.Exec(activities); err != nil {
		return fmt.Errorf("create activity_detail: %w", err)
	}

	signupForm := `CREATE TABLE IF NOT EXISTS signup_form (
		id             INTEGER PRIMARY KEY AUTOINCREMENT,
		activity_id    INTEGER NOT NULL,
		fields         TEXT NOT NULL DEFAULT '[]',
		instructions   TEXT NOT NULL DEFAULT '',
		attachment     INTEGER NOT NULL DEFAULT 0,
		attachment_dir TEXT NOT NULL DEFAULT ''
	)`
	if _, err := DB.Exec(signupForm); err != nil {
		return fmt.Errorf("create signup_form: %w", err)
	}

	submissions := `CREATE TABLE IF NOT EXISTS signup_submission (
		id           INTEGER PRIMARY KEY AUTOINCREMENT,
		activity_id  INTEGER NOT NULL,
		data         TEXT NOT NULL DEFAULT '{}',
		attachments  TEXT NOT NULL DEFAULT '[]',
		submitted_at TEXT DEFAULT (datetime('now'))
	)`
	if _, err := DB.Exec(submissions); err != nil {
		return fmt.Errorf("create signup_submission: %w", err)
	}

	fmt.Println("[migrate] v7: added signup fields and tables")
	return nil
}
