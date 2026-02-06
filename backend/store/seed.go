package store

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

// Seed 从 ../public/json/ 读取已有 JSON 数据并导入数据库
func Seed() {
	seedActivities()
	seedTimeline()
	seedGallery()
	seedAbout()
	seedMusic()
	fmt.Println("种子数据导入完成")
}

// --- helpers ---

func readJSON(path string, v interface{}) {
	data, err := os.ReadFile(path)
	if err != nil {
		log.Printf("读取 %s 失败: %v (跳过)", path, err)
		return
	}
	if err := json.Unmarshal(data, v); err != nil {
		log.Printf("解析 %s 失败: %v (跳过)", path, err)
	}
}

// --- seed functions ---

func seedActivities() {
	type raw struct {
		Type     string `json:"type"`
		Tag      string `json:"tag"`
		Date     string `json:"date"`
		Image    string `json:"image"`
		Headline string `json:"headline"`
		Excerpt  string `json:"excerpt"`
		Href     string `json:"href"`
	}
	var items []raw
	readJSON("../public/json/activity.json", &items)
	for _, a := range items {
		_, err := DB.Exec(
			`INSERT INTO activity (type, tag, date, image, headline, excerpt, href) VALUES (?,?,?,?,?,?,?)`,
			a.Type, a.Tag, a.Date, a.Image, a.Headline, a.Excerpt, a.Href,
		)
		if err != nil {
			log.Printf("插入 activity 失败: %v", err)
		}
	}
}

func seedTimeline() {
	// header
	type header struct {
		Title    string `json:"title"`
		Subtitle string `json:"subtitle"`
	}
	type headerWrap struct {
		Header header `json:"header"`
	}
	var h headerWrap
	readJSON("../public/json/timeline.json", &h)
	if h.Header.Title != "" {
		_, _ = DB.Exec(
			`INSERT OR REPLACE INTO timeline_header (id, title, subtitle) VALUES (1, ?, ?)`,
			h.Header.Title, h.Header.Subtitle,
		)
	}

	// events
	type event struct {
		Date        string `json:"date"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Image       string `json:"image"`
		Label       string `json:"label"`
	}
	var events []event
	readJSON("../public/json/timelineData.json", &events)
	for _, e := range events {
		_, err := DB.Exec(
			`INSERT INTO timeline_event (date, title, description, image, label) VALUES (?,?,?,?,?)`,
			e.Date, e.Title, e.Description, e.Image, e.Label,
		)
		if err != nil {
			log.Printf("插入 timeline_event 失败: %v", err)
		}
	}
}

func seedGallery() {
	type item struct {
		Image       string `json:"image"`
		Illustrator string `json:"illustrator"`
		Scene       string `json:"scene"`
		Description string `json:"description"`
	}
	var items []item
	readJSON("../public/json/gallery.json", &items)
	for _, g := range items {
		_, _ = DB.Exec(
			`INSERT INTO gallery (image, illustrator, scene, description) VALUES (?,?,?,?)`,
			g.Image, g.Illustrator, g.Scene, g.Description,
		)
	}
}

func seedAbout() {
	type card struct {
		ID         int    `json:"id"`
		SmallTitle string `json:"smallTitle"`
		Title      string `json:"title"`
		Content    string `json:"content"`
		Image      string `json:"image"`
	}
	type wrap struct {
		Cards []card `json:"cards"`
	}
	var w wrap
	readJSON("../public/json/about.json", &w)
	for _, c := range w.Cards {
		_, _ = DB.Exec(
			`INSERT INTO about_card (small_title, title, content, image) VALUES (?,?,?,?)`,
			c.SmallTitle, c.Title, c.Content, c.Image,
		)
	}
}

func seedMusic() {
	type track struct {
		Title  string `json:"title"`
		Artist string `json:"artist"`
		Src    string `json:"src"`
		Cover  string `json:"cover"`
	}
	var tracks []track
	readJSON("../public/json/music.json", &tracks)
	for _, t := range tracks {
		_, _ = DB.Exec(
			`INSERT INTO music (title, artist, src, cover) VALUES (?,?,?,?)`,
			t.Title, t.Artist, t.Src, t.Cover,
		)
	}
}
