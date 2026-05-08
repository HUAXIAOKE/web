package handler

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"huaxiaoke-backend/store"
	"mime/multipart"

	"github.com/xuri/excelize/v2"
)

const JoinusUploadDir = "joinus_uploads"

func norm(s string) string   { return strings.TrimSpace(s) }
func normPhone(s string) string {
	re := regexp.MustCompile(`\D`)
	return re.ReplaceAllString(strings.TrimSpace(s), "")
}

func SubmitJoinus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseMultipartForm(200 << 20); err != nil {
		writeJSON(w, map[string]interface{}{"ok": false, "error": "提交内容过大或解析失败，请适当压缩后重试"})
		return
	}

	record := make(map[string]interface{})
	record["_submittedAt"] = time.Now().UTC().Format(time.RFC3339)

	var fileEntries []struct {
		key  string
		name string
		file interface{}
	}
	for key, values := range r.MultipartForm.Value {
		if key == "overwrite" {
			continue
		}
		if len(values) > 0 {
			record[key] = values[0]
		}
	}
	for key, headers := range r.MultipartForm.File {
		if len(headers) == 0 {
			continue
		}
		for i, h := range headers {
			fileEntries = append(fileEntries, struct {
				key  string
				name string
				file interface{}
			}{key, h.Filename, h})
			if i == 0 {
				record[key] = h.Filename
			} else {
				record[key] = fmt.Sprintf("%v; %s", record[key], h.Filename)
			}
		}
	}

	nameField, contactField, qqField := "name", "contact", "qq"
	nameVal := norm(getStr(record, nameField))
	contactVal := normPhone(getStr(record, contactField))
	qqVal := norm(getStr(record, qqField))
	overwrite := r.FormValue("overwrite") == "1" || r.FormValue("overwrite") == "true"

	if contactVal == "" || len(contactVal) != 11 || !regexp.MustCompile(`^1[3-9]\d{9}$`).MatchString(contactVal) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		writeJSON(w, map[string]interface{}{"ok": false, "error": "请输入合规的 11 位手机号"})
		return
	}
	if qqVal == "" || !regexp.MustCompile(`^\d+$`).MatchString(strings.TrimSpace(getStr(record, qqField))) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		writeJSON(w, map[string]interface{}{"ok": false, "error": "QQ 号须为数字"})
		return
	}

	var existingID *int
	row := store.DB.QueryRow(
		`SELECT id FROM joinus_submission WHERE 
		TRIM(json_extract(data,'$.'||?))=? AND 
		REPLACE(REPLACE(REPLACE(TRIM(json_extract(data,'$.'||?)),' ',''),'-',''),'+','')=?`,
		nameField, nameVal, contactField, contactVal,
	)
	var id int
	if err := row.Scan(&id); err == nil {
		existingID = &id
	}

	if existingID != nil && !overwrite {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Duplicate", "true")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": false, "duplicate": true})
		return
	}

	if existingID != nil && overwrite {
		oldDir := filepath.Join(StaticDir, JoinusUploadDir, contactVal)
		_ = os.RemoveAll(oldDir)
		_, _ = store.DB.Exec(`DELETE FROM joinus_submission WHERE id=?`, *existingID)
	}

	dataJSON, _ := json.Marshal(record)
	_, err := store.DB.Exec(`INSERT INTO joinus_submission (submitted_at, data) VALUES (?,?)`,
		record["_submittedAt"], string(dataJSON))
	if err != nil {
		writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}

	if len(fileEntries) > 0 {
		uploadBase := filepath.Join(StaticDir, JoinusUploadDir, contactVal)
		_ = os.MkdirAll(uploadBase, 0755)
		for _, e := range fileEntries {
			h, _ := e.file.(*multipart.FileHeader)
			if h == nil {
				continue
			}
			f, err := h.Open()
			if err != nil {
				continue
			}
			safeName := sanitizeFilename(fmt.Sprintf("%s_%s", e.key, h.Filename))
			destPath := filepath.Join(uploadBase, safeName)
			out, err := os.Create(destPath)
			if err != nil {
				f.Close()
				continue
			}
			io.Copy(out, f)
			f.Close()
			out.Close()
		}
	}
	writeJSON(w, map[string]interface{}{"ok": true})
}

// ClearJoinus 清除所有报名记录及附件（需管理员认证）
func ClearJoinus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	_, _ = store.DB.Exec(`DELETE FROM joinus_submission`)
	uploadRoot := filepath.Join(StaticDir, JoinusUploadDir)
	entries, err := os.ReadDir(uploadRoot)
	if err == nil {
		for _, e := range entries {
			if e.IsDir() {
				_ = os.RemoveAll(filepath.Join(uploadRoot, e.Name()))
			}
		}
	}
	w.Header().Set("Content-Type", "application/json")
	writeJSON(w, map[string]interface{}{"ok": true, "message": "已清除所有报名数据与附件"})
}

func getStr(m map[string]interface{}, k string) string {
	v, ok := m[k]
	if !ok {
		return ""
	}
	s, _ := v.(string)
	return s
}

func sanitizeFilename(name string) string {
	return regexp.MustCompile(`[^\w\.\-]`).ReplaceAllString(name, "_")
}

func GetJoinusSubmissions(w http.ResponseWriter, r *http.Request) {
	rows, err := store.DB.Query(`SELECT id, submitted_at, data FROM joinus_submission ORDER BY id DESC`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var list []map[string]interface{}
	for rows.Next() {
		var id int
		var submittedAt, dataStr string
		if err := rows.Scan(&id, &submittedAt, &dataStr); err != nil {
			continue
		}
		var data map[string]interface{}
		_ = json.Unmarshal([]byte(dataStr), &data)
		if data == nil {
			data = make(map[string]interface{})
		}
		data["id"] = id
		data["_submittedAt"] = submittedAt
		list = append(list, data)
	}
	writeJSON(w, list)
}

func joinusPhoneByID(submissionID string) string {
	var dataStr string
	err := store.DB.QueryRow(`SELECT data FROM joinus_submission WHERE id = ?`, submissionID).Scan(&dataStr)
	if err != nil {
		return ""
	}
	var data map[string]interface{}
	_ = json.Unmarshal([]byte(dataStr), &data)
	return normPhone(getStr(data, "contact"))
}

func GetJoinusSubmissionFiles(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "missing id", http.StatusBadRequest)
		return
	}
	phone := joinusPhoneByID(id)
	if phone == "" {
		writeJSON(w, map[string]interface{}{"files": []interface{}{}})
		return
	}
	dir := filepath.Join(StaticDir, JoinusUploadDir, phone)
	entries, err := os.ReadDir(dir)
	if err != nil {
		writeJSON(w, map[string]interface{}{"files": []interface{}{}})
		return
	}
	var files []string
	for _, e := range entries {
		if e.IsDir() || e.Name() == "" || e.Name() == ".DS_Store" {
			continue
		}
		files = append(files, e.Name())
	}
	writeJSON(w, map[string]interface{}{"files": files})
}

func ServeJoinusSubmissionFile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	filename := r.PathValue("filename")
	if id == "" || filename == "" {
		http.Error(w, "missing id or filename", http.StatusBadRequest)
		return
	}
	if strings.Contains(filename, "/") || strings.Contains(filename, "..") {
		http.Error(w, "invalid filename", http.StatusBadRequest)
		return
	}
	phone := joinusPhoneByID(id)
	if phone == "" {
		http.NotFound(w, r)
		return
	}
	path := filepath.Join(StaticDir, JoinusUploadDir, phone, filename)
	f, err := os.Open(path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}
	http.ServeContent(w, r, filename, info.ModTime(), f)
}

func ExportJoinus(w http.ResponseWriter, r *http.Request) {
	rows, err := store.DB.Query(`SELECT id, submitted_at, data FROM joinus_submission ORDER BY id ASC`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var submissions []map[string]interface{}
	for rows.Next() {
		var id int
		var submittedAt, dataStr string
		if err := rows.Scan(&id, &submittedAt, &dataStr); err != nil {
			continue
		}
		var data map[string]interface{}
		_ = json.Unmarshal([]byte(dataStr), &data)
		if data == nil {
			data = make(map[string]interface{})
		}
		data["id"] = id
		data["_submittedAt"] = submittedAt
		submissions = append(submissions, data)
	}

	type formQuestion struct {
		ID    string `json:"id"`
		Label string `json:"label"`
	}
	var form struct {
		Questions []formQuestion `json:"questions"`
	}
	formPath := filepath.Join(StaticDir, "joinus", "form.json")
	if raw, err := os.ReadFile(formPath); err == nil {
		_ = json.Unmarshal(raw, &form)
	}

	orderedIds := []string{"_submittedAt"}
	idToLabel := map[string]string{"_submittedAt": "提交时间"}
	nameFieldID := "name"
	for _, q := range form.Questions {
		orderedIds = append(orderedIds, q.ID)
		idToLabel[q.ID] = q.Label
		if q.ID == "name" || strings.Contains(q.Label, "姓名") {
			nameFieldID = q.ID
		}
	}
	if len(orderedIds) == 1 {
		for _, row := range submissions {
			for k := range row {
				if k != "id" && k != "_submittedAt" && idToLabel[k] == "" {
					idToLabel[k] = "字段_" + k
					orderedIds = append(orderedIds, k)
				}
			}
		}
	}

	// 构建 Excel
	f := excelize.NewFile()
	defer f.Close()
	sheet := "Sheet1"
	headers := []string{"序号", "提交时间"}
	for i := 1; i < len(orderedIds); i++ {
		headers = append(headers, idToLabel[orderedIds[i]]+"")
	}
	for col, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		_ = f.SetCellValue(sheet, cell, h)
	}
	for rowIdx, row := range submissions {
		_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", rowIdx+2), rowIdx+1)
		_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", rowIdx+2), row["_submittedAt"])
		// 表头列 2,3,... 对应 orderedIds[1], orderedIds[2], ...，故第 col 列取 row[orderedIds[col-1]]
		for col := 2; col <= len(orderedIds); col++ {
			id := orderedIds[col-1]
			v, _ := row[id]
			cell, _ := excelize.CoordinatesToCellName(col+1, rowIdx+2)
			_ = f.SetCellValue(sheet, cell, fmt.Sprintf("%v", v))
		}
	}
	excelBuf := &bytes.Buffer{}
	if _, err := f.WriteTo(excelBuf); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	zipBuf := &bytes.Buffer{}
	zw := zip.NewWriter(zipBuf)

	wZip, _ := zw.Create("报名表.xlsx")
	wZip.Write(excelBuf.Bytes())

	nameCounts := make(map[string]int)
	displayNameRe := regexp.MustCompile(`^[^_]+_\d+_`)

	for i, row := range submissions {
		phone := normPhone(getStr(row, "contact"))
		if phone == "" {
			continue
		}
		dir := filepath.Join(StaticDir, JoinusUploadDir, phone)
		entries, err := os.ReadDir(dir)
		if err != nil || len(entries) == 0 {
			continue
		}
		innerBuf := &bytes.Buffer{}
		innerZip := zip.NewWriter(innerBuf)
		for _, e := range entries {
			if e.IsDir() || e.Name() == "" || e.Name() == ".DS_Store" {
				continue
			}
			path := filepath.Join(dir, e.Name())
			data, err := os.ReadFile(path)
			if err != nil {
				continue
			}
			displayName := displayNameRe.ReplaceAllString(e.Name(), "")
			if displayName == "" {
				displayName = e.Name()
			}
			ew, _ := innerZip.Create(displayName)
			ew.Write(data)
		}
		innerZip.Close()

		personRaw := "未命名_" + fmt.Sprintf("%d", i+1)
		if nameFieldID != "" {
			if v, ok := row[nameFieldID]; ok {
				personRaw = strings.TrimSpace(fmt.Sprintf("%v", v))
			}
		}
		safePerson := regexp.MustCompile(`[\s\\/:*?"<>|]+`).ReplaceAllString(personRaw, "_")
		if len(safePerson) > 50 {
			safePerson = safePerson[:50]
		}
		if safePerson == "" {
			safePerson = "未命名_" + fmt.Sprintf("%d", i+1)
		}
		n := nameCounts[safePerson] + 1
		nameCounts[safePerson] = n
		innerName := safePerson + ".zip"
		if n > 1 {
			innerName = fmt.Sprintf("%s_%d.zip", safePerson, n)
		}
		wInner, _ := zw.Create(innerName)
		wInner.Write(innerBuf.Bytes())
	}

	zw.Close()
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename*=UTF-8''`+strings.ReplaceAll(url.QueryEscape("报名导出_"+time.Now().Format("2006-01-02")+".zip"), "+", "%20"))
	w.Write(zipBuf.Bytes())
}