package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

func GetDownloads(w http.ResponseWriter, r *http.Request) {
	query := `SELECT id, name, description, category, file_url, thumb_url, rating, downloads, date, sort_order, rating_count FROM download_resource`

	cat := r.URL.Query().Get("category")
	var args []interface{}
	if cat != "" && cat != "all" {
		query += " WHERE category = ?"
		args = append(args, cat)
	}

	sort := r.URL.Query().Get("sort")
	order := " ORDER BY sort_order, id"
	switch sort {
	case "new":
		order = " ORDER BY date DESC, id DESC"
	case "old":
		order = " ORDER BY date ASC, id ASC"
	case "rating":
		order = " ORDER BY rating DESC, id DESC"
	case "downloads":
		order = " ORDER BY downloads DESC, id DESC"
	}
	query += order

	rows, err := store.DB.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []model.DownloadResource
	for rows.Next() {
		var d model.DownloadResource
		if err := rows.Scan(&d.ID, &d.Name, &d.Description, &d.Category, &d.FileURL, &d.ThumbURL, &d.Rating, &d.Downloads, &d.Date, &d.SortOrder, &d.RatingCount); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		list = append(list, d)
	}
	writeJSON(w, list)
}

func GetDownload(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var d model.DownloadResource
	err := store.DB.QueryRow(
		`SELECT id, name, description, category, file_url, thumb_url, rating, downloads, date, sort_order, rating_count FROM download_resource WHERE id=?`, id,
	).Scan(&d.ID, &d.Name, &d.Description, &d.Category, &d.FileURL, &d.ThumbURL, &d.Rating, &d.Downloads, &d.Date, &d.SortOrder, &d.RatingCount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, d)
}

func CreateDownload(w http.ResponseWriter, r *http.Request) {
	var d model.DownloadResource
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := store.DB.Exec(
		`INSERT INTO download_resource (name,description,category,file_url,thumb_url,rating,downloads,date,sort_order) VALUES (?,?,?,?,?,?,?,?,?)`,
		d.Name, d.Description, d.Category, d.FileURL, d.ThumbURL, d.Rating, d.Downloads, d.Date, d.SortOrder,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id, _ := res.LastInsertId()
	d.ID = int(id)
	writeJSON(w, d)
}

func UpdateDownload(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var d model.DownloadResource
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, err := store.DB.Exec(
		`UPDATE download_resource SET name=?,description=?,category=?,file_url=?,thumb_url=?,rating=?,date=?,sort_order=? WHERE id=?`,
		d.Name, d.Description, d.Category, d.FileURL, d.ThumbURL, d.Rating, d.Date, d.SortOrder, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func DeleteDownload(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	_, err := store.DB.Exec(`DELETE FROM download_resource WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func IncrementDownload(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var fileURL string
	err := store.DB.QueryRow(
		`UPDATE download_resource SET downloads = downloads + 1 WHERE id=? RETURNING file_url`, id,
	).Scan(&fileURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	if !strings.HasPrefix(fileURL, "/") {
		fileURL = "/" + strings.TrimPrefix(fileURL, "/")
	}
	writeJSON(w, map[string]string{"fileUrl": fileURL})
}

func RateDownload(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var body struct {
		Score int `json:"score"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Score < 1 || body.Score > 5 {
		http.Error(w, "invalid score", http.StatusBadRequest)
		return
	}
	if _, err := store.DB.Exec(`INSERT INTO download_rating (resource_id, score) VALUES (?, ?)`, id, body.Score); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if _, err := store.DB.Exec(
		`UPDATE download_resource
		SET rating = (rating * rating_count + ?) / (rating_count + 1),
		    rating_count = rating_count + 1
		WHERE id = ?`, body.Score, id,
	); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}
