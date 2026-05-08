package store

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"huaxiaoke-backend/config"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

// PublicAssetsDir 与 handler.StaticDir 一致，由 main 在 RunMigrations 之前设置（解析后的 public 绝对路径）。
var PublicAssetsDir string

// Init 初始化数据库连接，建表，导入种子数据
func Init() {
	needSeed := false
	if _, err := os.Stat(config.DBPath); os.IsNotExist(err) {
		needSeed = true
	}

	if err := os.MkdirAll(filepath.Dir(config.DBPath), 0755); err != nil {
		log.Fatalf("创建数据目录失败: %v", err)
	}

	var err error
	DB, err = sql.Open("sqlite", config.DBPath)
	if err != nil {
		log.Fatalf("打开数据库失败: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	migrate()

	if needSeed {
		fmt.Println("首次启动，根据json配置初始化...")
		Seed()
	}
}

func migrate() {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS activity (
			id        INTEGER PRIMARY KEY AUTOINCREMENT,
			tags      TEXT    NOT NULL DEFAULT '',
			date      TEXT    NOT NULL,
			image     TEXT    NOT NULL DEFAULT '',
			headline  TEXT    NOT NULL,
			excerpt   TEXT    NOT NULL DEFAULT '',
			href      TEXT    NOT NULL DEFAULT '#'
		)`,
		`CREATE TABLE IF NOT EXISTS timeline_header (
			id       INTEGER PRIMARY KEY CHECK (id = 1),
			title    TEXT NOT NULL,
			subtitle TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS timeline_event (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			date        TEXT NOT NULL,
			title       TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			image       TEXT NOT NULL DEFAULT '',
			label       TEXT NOT NULL DEFAULT ''
		)`,
		`CREATE TABLE IF NOT EXISTS gallery (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			image       TEXT NOT NULL,
			illustrator TEXT NOT NULL DEFAULT '',
			scene       TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT ''
		)`,
		`CREATE TABLE IF NOT EXISTS about_card (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			small_title TEXT NOT NULL DEFAULT '',
			title       TEXT NOT NULL,
			content     TEXT NOT NULL DEFAULT '',
			image       TEXT NOT NULL DEFAULT ''
		)`,
		`CREATE TABLE IF NOT EXISTS music (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			bvid       TEXT NOT NULL DEFAULT '',
			title      TEXT NOT NULL,
			artist     TEXT NOT NULL DEFAULT '',
			src        TEXT NOT NULL DEFAULT '',
			cover      TEXT NOT NULL DEFAULT '',
			duration   INTEGER NOT NULL DEFAULT 0,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT DEFAULT (datetime('now'))
		)`,
	}

	for _, s := range statements {
		if _, err := DB.Exec(s); err != nil {
			log.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
}
