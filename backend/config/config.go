package config

const (
	Port          = ":1037"
	DBPath        = "data/data.db"
	SchemaVersion = 2 // 每次改 schema 递增，启动时自动迁移
)
