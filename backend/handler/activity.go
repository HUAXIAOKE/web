package handler

import (
	"encoding/json"
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

// GetActivities GET /api/activities
func GetActivities(w http.ResponseWriter, r *http.Request) {
	rows, err := store.DB.Query(
		`SELECT id, type, tag, date, image, headline, excerpt, href FROM activity ORDER BY date DESC`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []model.Activity
	for rows.Next() {
		var a model.Activity
		if err := rows.Scan(&a.ID, &a.Type, &a.Tag, &a.Date, &a.Image, &a.Headline, &a.Excerpt, &a.Href); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		list = append(list, a)
	}

	writeJSON(w, list)
}

// --- util ---

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
