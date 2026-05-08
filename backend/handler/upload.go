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

var allowedMimeTypes = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/gif":       ".gif",
	"image/webp":      ".webp",
	"image/svg+xml":   ".svg",
	"audio/mpeg":      ".mp3",
	"audio/wav":       ".wav",
	"audio/ogg":       ".ogg",
	"audio/flac":      ".flac",
	"application/zip": ".zip",
	"application/pdf": ".pdf",
}

var maxUploadSizes = map[string]int64{
	"image/":    10 << 20,
	"audio/":    50 << 20,
	"applicati": 50 << 20,
}

func UploadFile(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(64 << 20)

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "读取文件失败: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext, ok := allowedMimeTypes[header.Header.Get("Content-Type")]
	if !ok && header.Header.Get("Content-Type") != "" {
		http.Error(w, "不支持的文件类型", http.StatusBadRequest)
		return
	}
	if ok {
		fileExt := filepath.Ext(header.Filename)
		if fileExt == "" {
			header.Filename = header.Filename + ext
		}
	}

	for prefix, limit := range maxUploadSizes {
		if strings.HasPrefix(header.Header.Get("Content-Type"), prefix) && header.Size > limit {
			http.Error(w, fmt.Sprintf("文件过大，最大允许 %d MB", limit/(1<<20)), http.StatusBadRequest)
			return
		}
	}
	if header.Size > 50<<20 {
		http.Error(w, "文件过大，最大允许 50 MB", http.StatusBadRequest)
		return
	}

	subDir := r.FormValue("dir")
	if subDir == "" {
		subDir = "img/uploads"
	}
	subDir = strings.TrimPrefix(subDir, "/")
	subDir = filepath.Clean(subDir)
	if strings.Contains(subDir, "..") {
		http.Error(w, "非法目录", http.StatusBadRequest)
		return
	}

	destDir := filepath.Join(StaticDir, subDir)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		http.Error(w, "创建目录失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	newName := fmt.Sprintf("%d%s", time.Now().UnixMilli(), filepath.Ext(header.Filename))
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