package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

func calcSignupStatus(isSignup int, start, end string) string {
	if isSignup == 0 {
		return "not_enabled"
	}
	now := time.Now()
	if start != "" {
		t, err := time.Parse("2006-01-02T15:04", start)
		if err == nil && now.Before(t) {
			return "not_started"
		}
	}
	if end != "" {
		t, err := time.Parse("2006-01-02T15:04", end)
		if err == nil && now.After(t) {
			return "expired"
		}
	}
	return "active"
}

func GetActivities(w http.ResponseWriter, r *http.Request) {
	rows, err := store.DB.Query(
		`SELECT id, tags, date, image, headline, excerpt, href, is_signup, signup_start, signup_end FROM activity ORDER BY date DESC`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []model.Activity
	for rows.Next() {
		var a model.Activity
		if err := rows.Scan(&a.ID, &a.Tags, &a.Date, &a.Image, &a.Headline, &a.Excerpt, &a.Href, &a.IsSignup, &a.SignupStart, &a.SignupEnd); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		a.SignupStatus = calcSignupStatus(a.IsSignup, a.SignupStart, a.SignupEnd)
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
		`INSERT INTO activity (tags,date,image,headline,excerpt,href,is_signup,signup_start,signup_end) VALUES (?,?,?,?,?,?,?,?,?)`,
		a.Tags, a.Date, a.Image, a.Headline, a.Excerpt, a.Href, a.IsSignup, a.SignupStart, a.SignupEnd,
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
		`UPDATE activity SET tags=?,date=?,image=?,headline=?,excerpt=?,href=?,is_signup=?,signup_start=?,signup_end=? WHERE id=?`,
		a.Tags, a.Date, a.Image, a.Headline, a.Excerpt, a.Href, a.IsSignup, a.SignupStart, a.SignupEnd, id,
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

func SetActivitySignup(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		IsSignup int `json:"isSignup"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.IsSignup == 1 {
		store.DB.Exec(`UPDATE activity SET is_signup = 0`)
	}
	_, err := store.DB.Exec(`UPDATE activity SET is_signup = ? WHERE id = ?`, req.IsSignup, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func GetActivityByID(idStr string) (*model.Activity, error) {
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return nil, err
	}
	var a model.Activity
	err = store.DB.QueryRow(
		`SELECT id, tags, date, image, headline, excerpt, href, is_signup, signup_start, signup_end FROM activity WHERE id=?`, id,
	).Scan(&a.ID, &a.Tags, &a.Date, &a.Image, &a.Headline, &a.Excerpt, &a.Href, &a.IsSignup, &a.SignupStart, &a.SignupEnd)
	if err != nil {
		return nil, err
	}
	a.SignupStatus = calcSignupStatus(a.IsSignup, a.SignupStart, a.SignupEnd)
	return &a, nil
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
