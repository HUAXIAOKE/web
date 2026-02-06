package handler

import (
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

// GetAbout GET /api/about
func GetAbout(w http.ResponseWriter, r *http.Request) {
	rows, err := store.DB.Query(
		`SELECT id, small_title, title, content, image FROM about_card ORDER BY id`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var cards []model.AboutCard
	for rows.Next() {
		var c model.AboutCard
		if err := rows.Scan(&c.ID, &c.SmallTitle, &c.Title, &c.Content, &c.Image); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		cards = append(cards, c)
	}

	writeJSON(w, model.AboutData{Cards: cards})
}
