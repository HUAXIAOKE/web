package handler

import (
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

// GetTimeline GET /api/timeline
func GetTimeline(w http.ResponseWriter, r *http.Request) {
	// header
	var h model.TimelineHeader
	err := store.DB.QueryRow(`SELECT title, subtitle FROM timeline_header WHERE id = 1`).
		Scan(&h.Title, &h.Subtitle)
	if err != nil {
		h = model.TimelineHeader{Title: "心路历程", Subtitle: "我们的成长足迹"}
	}

	// events
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
