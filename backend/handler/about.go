package handler

import (
	"encoding/json"
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

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

func CreateAbout(w http.ResponseWriter, r *http.Request) {
	var c model.AboutCard
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := store.DB.Exec(
		`INSERT INTO about_card (small_title,title,content,image) VALUES (?,?,?,?)`,
		c.SmallTitle, c.Title, c.Content, c.Image,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()
	c.ID = int(id)
	writeJSON(w, c)
}

func UpdateAbout(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var c model.AboutCard
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := store.DB.Exec(
		`UPDATE about_card SET small_title=?,title=?,content=?,image=? WHERE id=?`,
		c.SmallTitle, c.Title, c.Content, c.Image, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func DeleteAbout(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := store.DB.Exec(`DELETE FROM about_card WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}
