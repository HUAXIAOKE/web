package handler

import (
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

// GetGallery GET /api/gallery
func GetGallery(w http.ResponseWriter, r *http.Request) {
	rows, err := store.DB.Query(
		`SELECT id, image, illustrator, scene, description FROM gallery ORDER BY id`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []model.GalleryItem
	for rows.Next() {
		var g model.GalleryItem
		if err := rows.Scan(&g.ID, &g.Image, &g.Illustrator, &g.Scene, &g.Description); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		list = append(list, g)
	}

	writeJSON(w, list)
}
