package handler

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"huaxiaoke-backend/model"
	"huaxiaoke-backend/store"
)

func GetActivityDetail(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	row := store.DB.QueryRow(
		`SELECT id, activity_id, content, updated_at FROM activity_detail WHERE activity_id=? LIMIT 1`, id,
	)
	var detail model.ActivityDetail
	if err := row.Scan(&detail.ID, &detail.ActivityID, &detail.Content, &detail.UpdatedAt); err != nil {
		detail.Content = ""
		detail.ActivityID, _ = strconv.Atoi(id)
	}
	writeJSON(w, detail)
}

func UpdateActivityDetail(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	exists := 0
	store.DB.QueryRow(`SELECT COUNT(*) FROM activity_detail WHERE activity_id=?`, id).Scan(&exists)
	if exists > 0 {
		store.DB.Exec(`UPDATE activity_detail SET content=?, updated_at=datetime('now') WHERE activity_id=?`, req.Content, id)
	} else {
		store.DB.Exec(`INSERT INTO activity_detail (activity_id, content) VALUES (?, ?)`, id, req.Content)
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

const defaultSignupFields = `[{"name":"name","label":"昵称","placeholder":"该如何称呼呢～","required":true},{"name":"qq","label":"QQ 号","placeholder":"留个QQ让我们联系你！","required":true},{"name":"department","label":"院系","placeholder":"Where are you from?","required":true},{"name":"remark","label":"备注","type":"textarea","placeholder":"还有什么想告诉我们的？"}]`

const defaultSignupInstructions = `<ul>
<li>请确保填写信息真实有效</li>
<li>请递交至少包含完整视频文件的压缩包</li>
<li>压缩包命名需要包含歌名</li>
<li>报名成功后我们可以重复提交来覆盖</li>
<li>会根据报名情况与作品质量甄选，会尽可能让每一份稿件都被看到</li>
<li>如有疑问请通过 B 站私信或在 QQ 相关群聊内联系我们</li>
</ul>`

func GetSignupForm(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	row := store.DB.QueryRow(
		`SELECT id, activity_id, fields, instructions, attachment, attachment_dir FROM signup_form WHERE activity_id=? LIMIT 1`, id,
	)
	var form model.SignupForm
	if err := row.Scan(&form.ID, &form.ActivityID, &form.Fields, &form.Instructions, &form.Attachment, &form.AttachmentDir); err != nil {
		form.Fields = defaultSignupFields
		form.Instructions = defaultSignupInstructions
		form.Attachment = 1
		form.ActivityID, _ = strconv.Atoi(id)
	}
	writeJSON(w, form)
}

func UpdateSignupForm(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req model.SignupForm
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.AttachmentDir == "" {
		req.AttachmentDir = "signups/" + id
	}
	exists := 0
	store.DB.QueryRow(`SELECT COUNT(*) FROM signup_form WHERE activity_id=?`, id).Scan(&exists)
	if exists > 0 {
		store.DB.Exec(`UPDATE signup_form SET fields=?, instructions=?, attachment=?, attachment_dir=? WHERE activity_id=?`,
			req.Fields, req.Instructions, req.Attachment, req.AttachmentDir, id)
	} else {
		store.DB.Exec(`INSERT INTO signup_form (activity_id, fields, instructions, attachment, attachment_dir) VALUES (?, ?, ?, ?, ?)`,
			id, req.Fields, req.Instructions, req.Attachment, req.AttachmentDir)
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

func SubmitSignup(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Data        string `json:"data"`
		Attachments string `json:"attachments"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	a, err := GetActivityByID(id)
	if err != nil {
		http.Error(w, "活动不存在", http.StatusNotFound)
		return
	}
	if a.SignupStatus != "active" {
		http.Error(w, "报名未开放", http.StatusForbidden)
		return
	}
	store.DB.Exec(`INSERT INTO signup_submission (activity_id, data, attachments) VALUES (?, ?, ?)`,
		a.ID, req.Data, req.Attachments)
	writeJSON(w, map[string]string{"status": "ok"})
}

func GetSubmissions(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	rows, err := store.DB.Query(
		`SELECT id, activity_id, data, attachments, submitted_at FROM signup_submission WHERE activity_id=? ORDER BY id`, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []model.SignupSubmission
	for rows.Next() {
		var s model.SignupSubmission
		rows.Scan(&s.ID, &s.ActivityID, &s.Data, &s.Attachments, &s.SubmittedAt)
		list = append(list, s)
	}
	writeJSON(w, list)
}

func ExportSubmissions(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	rows, err := store.DB.Query(
		`SELECT attachments FROM signup_submission WHERE activity_id=?`, id,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allFiles []string
	for rows.Next() {
		var attachments string
		rows.Scan(&attachments)
		var files []string
		json.Unmarshal([]byte(attachments), &files)
		allFiles = append(allFiles, files...)
	}

	if len(allFiles) == 0 {
		writeJSON(w, map[string]string{"status": "ok", "message": "no attachments"})
		return
	}

	zipPath := filepath.Join(StaticDir, "signups", id+"_export.zip")
	os.MkdirAll(filepath.Dir(zipPath), 0755)
	zipFile, err := os.Create(zipPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer zipFile.Close()

	zw := zip.NewWriter(zipFile)
	added := 0
	for _, f := range allFiles {
		localPath := filepath.Join(StaticDir, filepath.FromSlash(strings.TrimPrefix(f, "/")))
		src, err := os.Open(localPath)
		if err != nil {
			continue
		}
		fw, err := zw.Create(filepath.Base(localPath) + fmt.Sprintf("_%d", added))
		if err != nil {
			src.Close()
			continue
		}
		io.Copy(fw, src)
		src.Close()
		added++
	}
	zw.Close()

	if added == 0 {
		os.Remove(zipPath)
		writeJSON(w, map[string]string{"status": "ok", "message": "no valid attachments"})
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="submissions_`+id+`.zip"`)
	http.ServeFile(w, r, zipPath)
	go os.Remove(zipPath)
}

func UploadSignupFile(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(64 << 20)

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "读取文件失败: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	if header.Size > 64<<20 {
		http.Error(w, "文件过大，最大允许 64 MB", http.StatusBadRequest)
		return
	}

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".bin"
	}

	newName := fmt.Sprintf("%d%s", time.Now().UnixMilli(), ext)
	destDir := filepath.Join(StaticDir, "signups")
	os.MkdirAll(destDir, 0755)
	destPath := filepath.Join(destDir, newName)

	out, err := os.Create(destPath)
	if err != nil {
		http.Error(w, "保存文件失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer out.Close()
	if _, err := io.Copy(out, file); err != nil {
		os.Remove(destPath)
		http.Error(w, "写入文件失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	urlPath := "/signups/" + newName
	writeJSON(w, map[string]string{"url": urlPath})
}
