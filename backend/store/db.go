package store

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"huaxiaoke-backend/config"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

// Init 初始化数据库连接，建表，导入种子数据
func Init() {
	needSeed := false
	if _, err := os.Stat(config.DBPath); os.IsNotExist(err) {
		needSeed = true
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
		fmt.Println("首次启动，导入种子数据...")
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
			id     INTEGER PRIMARY KEY AUTOINCREMENT,
			title  TEXT NOT NULL,
			artist TEXT NOT NULL DEFAULT '',
			src    TEXT NOT NULL,
			cover  TEXT NOT NULL DEFAULT ''
		)`,
	}

	for _, s := range statements {
		if _, err := DB.Exec(s); err != nil {
			log.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
}
