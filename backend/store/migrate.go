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

// RunMigrations 根据 SchemaVersion 自动执行数据库迁移
func RunMigrations() error {
	// 确保 schema_version 表存在
	if _, err := DB.Exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`); err != nil {
		return fmt.Errorf("创建 schema_version 表失败: %w", err)
	}

	currentVer := 0
	row := DB.QueryRow(`SELECT COALESCE(version, 0) FROM schema_version ORDER BY version DESC LIMIT 1`)
	if err := row.Scan(&currentVer); err != nil {
		// 表为空（新建数据库），插入当前版本
		currentVer = 0
	}

	if currentVer >= config.SchemaVersion {
		fmt.Printf("[迁移] 数据库版本已经是最新 (%d >= %d)，跳过迁移\n", currentVer, config.SchemaVersion)
		return nil
	}

	fmt.Printf("[迁移] 开始迁移: 当前版本 %d -> 目标版本 %d\n", currentVer, config.SchemaVersion)

	for v := currentVer; v < config.SchemaVersion; v++ {
		fmt.Printf("[迁移] 执行迁移: %d -> %d\n", v, v+1)
		switch v {
		case 0:
			if err := migrateToV1(); err != nil {
				return fmt.Errorf("迁移 0->1 失败: %w", err)
			}
		case 1:
			if err := migrateV1ToV2(); err != nil {
				return fmt.Errorf("迁移 1->2 失败: %w", err)
			}
		}
	}

	// 更新版本号
	if _, err := DB.Exec(`INSERT INTO schema_version (version) VALUES (?)`, config.SchemaVersion); err != nil {
		return fmt.Errorf("更新 schema_version 失败: %w", err)
	}

	fmt.Printf("[迁移] 迁移完成，数据库版本已更新到 %d\n", config.SchemaVersion)
	return nil
}

// migrateToV1 初始化版本表（从旧版本迁移到 V1）
func migrateToV1() error {
	// V1 没有任何 schema 变更，仅表示迁移系统就绪
	// 清除旧的 schema_version 记录（如果存在）
	DB.Exec(`DELETE FROM schema_version`)
	return nil
}

// migrateV1ToV2 删除 joinus_submission 表和相关数据
func migrateV1ToV2() error {
	// 1. 检查 joinus_submission 表是否存在
	var tableName string
	err := DB.QueryRow(`SELECT name FROM sqlite_master WHERE type='table' AND name='joinus_submission'`).Scan(&tableName)
	if err != nil || tableName != "joinus_submission" {
		fmt.Println("[迁移] joinus_submission 表不存在，跳过清理")
		return nil
	}

	// 2. 导出数据为 JSON 备份
	fmt.Println("[迁移] 导出 joinus_submission 数据...")
	if err := exportJoinusData(); err != nil {
		log.Printf("[迁移] 警告: 导出 joinus 数据失败: %v，继续执行", err)
	}

	// 3. 删除表
	if _, err := DB.Exec(`DROP TABLE IF EXISTS joinus_submission`); err != nil {
		return fmt.Errorf("删除 joinus_submission 表失败: %w", err)
	}
	fmt.Println("[迁移] 已删除 joinus_submission 表")

	return nil
}

func exportJoinusData() error {
	rows, err := DB.Query(`SELECT id, submitted_at, data FROM joinus_submission ORDER BY id`)
	if err != nil {
		return fmt.Errorf("查询 joinus_submission 失败: %w", err)
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

	// 确保 data 目录存在
	dataDir := filepath.Dir(config.DBPath)
	os.MkdirAll(dataDir, 0755)

	backupPath := filepath.Join(dataDir, fmt.Sprintf("joinus_backup_%s.json", time.Now().Format("20060102_150405")))
	jsonData, err := json.MarshalIndent(submissions, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化数据失败: %w", err)
	}

	if err := os.WriteFile(backupPath, jsonData, 0644); err != nil {
		return fmt.Errorf("写入备份文件失败: %w", err)
	}

	fmt.Printf("[迁移] joinus 数据已备份到: %s (共 %d 条记录)\n", backupPath, len(submissions))
	return nil
}
