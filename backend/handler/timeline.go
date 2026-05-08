package handler

import (
	"encoding/json"
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

func GetTimeline(w http.ResponseWriter, r *http.Request) {
	var h model.TimelineHeader
	err := store.DB.QueryRow(`SELECT title, subtitle FROM timeline_header WHERE id = 1`).
		Scan(&h.Title, &h.Subtitle)
	if err != nil {
		h = model.TimelineHeader{Title: "心路历程", Subtitle: "我们的成长足迹"}
	}

	rows, err := store.DB.Query(
		`SELECT id, date, title, description, image, label FROM timeline_event ORDER BY id`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var events []model.TimelineEvent
	for rows.Next() {
		var e model.TimelineEvent
		if err := rows.Scan(&e.ID, &e.Date, &e.Title, &e.Description, &e.Image, &e.Label); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		events = append(events, e)
	}
	writeJSON(w, model.TimelineData{Header: h, Events: events})
}

func UpdateTimelineHeader(w http.ResponseWriter, r *http.Request) {
	var h model.TimelineHeader
	if err := json.NewDecoder(r.Body).Decode(&h); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := store.DB.Exec(
		`INSERT OR REPLACE INTO timeline_header (id,title,subtitle) VALUES (1,?,?)`,
		h.Title, h.Subtitle,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func CreateTimelineEvent(w http.ResponseWriter, r *http.Request) {
	var e model.TimelineEvent
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := store.DB.Exec(
		`INSERT INTO timeline_event (date,title,description,image,label) VALUES (?,?,?,?,?)`,
		e.Date, e.Title, e.Description, e.Image, e.Label,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()
	e.ID = int(id)
	writeJSON(w, e)
}

func UpdateTimelineEvent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var e model.TimelineEvent
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := store.DB.Exec(
		`UPDATE timeline_event SET date=?,title=?,description=?,image=?,label=? WHERE id=?`,
		e.Date, e.Title, e.Description, e.Image, e.Label, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func DeleteTimelineEvent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := store.DB.Exec(`DELETE FROM timeline_event WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}
