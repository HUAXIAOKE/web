package handler

import (
	"encoding/json"
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

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

func CreateGallery(w http.ResponseWriter, r *http.Request) {
	var g model.GalleryItem
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := store.DB.Exec(
		`INSERT INTO gallery (image,illustrator,scene,description) VALUES (?,?,?,?)`,
		g.Image, g.Illustrator, g.Scene, g.Description,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()
	g.ID = int(id)
	writeJSON(w, g)
}

func UpdateGallery(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var g model.GalleryItem
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := store.DB.Exec(
		`UPDATE gallery SET image=?,illustrator=?,scene=?,description=? WHERE id=?`,
		g.Image, g.Illustrator, g.Scene, g.Description, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func DeleteGallery(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := store.DB.Exec(`DELETE FROM gallery WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}
