package handler

import (
	"encoding/json"
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

func GetActivities(w http.ResponseWriter, r *http.Request) {
	rows, err := store.DB.Query(
		`SELECT id, tags, date, image, headline, excerpt, href FROM activity ORDER BY date DESC`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []model.Activity
	for rows.Next() {
		var a model.Activity
		if err := rows.Scan(&a.ID, &a.Tags, &a.Date, &a.Image, &a.Headline, &a.Excerpt, &a.Href); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		list = append(list, a)
	}
	writeJSON(w, list)
}

func CreateActivity(w http.ResponseWriter, r *http.Request) {
	var a model.Activity
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := store.DB.Exec(
		`INSERT INTO activity (tags,date,image,headline,excerpt,href) VALUES (?,?,?,?,?,?)`,
		a.Tags, a.Date, a.Image, a.Headline, a.Excerpt, a.Href,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()
	a.ID = int(id)
	writeJSON(w, a)
}

func UpdateActivity(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var a model.Activity
	if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := store.DB.Exec(
		`UPDATE activity SET tags=?,date=?,image=?,headline=?,excerpt=?,href=? WHERE id=?`,
		a.Tags, a.Date, a.Image, a.Headline, a.Excerpt, a.Href, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func DeleteActivity(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := store.DB.Exec(`DELETE FROM activity WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
