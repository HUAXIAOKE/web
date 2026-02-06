package handler

import (
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

// GetMusic GET /api/music
func GetMusic(w http.ResponseWriter, r *http.Request) {
	rows, err := store.DB.Query(
		`SELECT id, title, artist, src, cover FROM music ORDER BY id`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []model.MusicTrack
	for rows.Next() {
		var t model.MusicTrack
		if err := rows.Scan(&t.ID, &t.Title, &t.Artist, &t.Src, &t.Cover); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		list = append(list, t)
	}

	writeJSON(w, list)
}
