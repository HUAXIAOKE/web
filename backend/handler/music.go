package handler

import (
	"encoding/json"
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

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

func CreateMusic(w http.ResponseWriter, r *http.Request) {
	var t model.MusicTrack
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := store.DB.Exec(
		`INSERT INTO music (title,artist,src,cover) VALUES (?,?,?,?)`,
		t.Title, t.Artist, t.Src, t.Cover,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()
	t.ID = int(id)
	writeJSON(w, t)
}

func UpdateMusic(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var t model.MusicTrack
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := store.DB.Exec(
		`UPDATE music SET title=?,artist=?,src=?,cover=? WHERE id=?`,
		t.Title, t.Artist, t.Src, t.Cover, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func DeleteMusic(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := store.DB.Exec(`DELETE FROM music WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}
