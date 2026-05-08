package handler

import (
	"encoding/json"
	"net/http"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

func GetMusic(w http.ResponseWriter, r *http.Request) {
	rows, err := store.DB.Query(
		`SELECT id, bvid, title, artist, src, cover, duration, sort_order FROM music ORDER BY sort_order, id`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []model.MusicTrack
	for rows.Next() {
		var t model.MusicTrack
		if err := rows.Scan(&t.ID, &t.BVID, &t.Title, &t.Artist, &t.Src, &t.Cover, &t.Duration, &t.SortOrder); err != nil {
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
	if t.BVID != "" {
		info, err := fetchBilibiliVideoInfo(t.BVID)
		if err == nil && info != nil {
			if t.Title == "" {
				t.Title = info.Title
			}
			if t.Artist == "" {
				t.Artist = info.Owner
			}
			if t.Cover == "" {
				t.Cover = info.Cover
			}
			if t.Duration == 0 {
				t.Duration = info.Duration
			}
		}
	}
	res, err := store.DB.Exec(
		`INSERT INTO music (bvid,title,artist,src,cover,duration,sort_order) VALUES (?,?,?,?,?,?,?)`,
		t.BVID, t.Title, t.Artist, t.Src, t.Cover, t.Duration, t.SortOrder,
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
		`UPDATE music SET bvid=?,title=?,artist=?,src=?,cover=?,duration=?,sort_order=? WHERE id=?`,
		t.BVID, t.Title, t.Artist, t.Src, t.Cover, t.Duration, t.SortOrder, id,
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

func SyncMusic(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BVIDs []string `json:"bvids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	existing := make(map[string]bool)
	rows, err := store.DB.Query(`SELECT bvid FROM music WHERE bvid != ''`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var bvid string
			if rows.Scan(&bvid) == nil {
				existing[bvid] = true
			}
		}
	}

	added := 0
	for _, bvid := range req.BVIDs {
		if bvid == "" || existing[bvid] {
			continue
		}
		info, err := fetchBilibiliVideoInfo(bvid)
		if err != nil || info == nil {
			continue
		}
		store.DB.Exec(
			`INSERT INTO music (bvid,title,artist,cover,duration,sort_order) VALUES (?,?,?,?,?,?)`,
			bvid, info.Title, info.Owner, info.Cover, info.Duration, 0,
		)
		added++
		existing[bvid] = true
	}
	writeJSON(w, map[string]interface{}{"added": added})
}