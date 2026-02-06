package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var StaticDir = "../public"

func UploadFile(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(0)

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "读取文件失败: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	subDir := r.FormValue("dir")
	if subDir == "" {
		subDir = "img/uploads"
	}
	subDir = strings.TrimPrefix(subDir, "/")

	destDir := filepath.Join(StaticDir, subDir)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		http.Error(w, "创建目录失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	ext := filepath.Ext(header.Filename)
	newName := fmt.Sprintf("%d%s", time.Now().UnixMilli(), ext)
	destPath := filepath.Join(destDir, newName)

	out, err := os.Create(destPath)
	if err != nil {
		http.Error(w, "保存文件失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		http.Error(w, "写入文件失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	urlPath := "/" + subDir + "/" + newName
	writeJSON(w, map[string]string{"url": urlPath})
}
