package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

var StaticDir = "../public"

var allowedMimeTypes = map[string]string{
	"image/jpeg":                      ".jpg",
	"image/png":                       ".png",
	"image/gif":                       ".gif",
	"image/webp":                      ".webp",
	"image/svg+xml":                   ".svg",
	"audio/mpeg":                      ".mp3",
	"audio/wav":                       ".wav",
	"audio/ogg":                       ".ogg",
	"audio/flac":                      ".flac",
	"application/zip":                 ".zip",
	"application/pdf":                 ".pdf",
	"application/octet-stream":        ".bin",
	"application/x-rar-compressed":    ".rar",
	"application/x-7z-compressed":     ".7z",
	"application/x-tar":               ".tar",
	"application/gzip":                ".gz",
	"application/x-bzip2":             ".bz2",
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
	if ok && filepath.Ext(header.Filename) == "" {
		header.Filename = header.Filename + ext
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

	contentType := header.Header.Get("Content-Type")
	shouldConvertWebP := contentType == "image/jpeg" || contentType == "image/png"

	extName := filepath.Ext(header.Filename)
	if extName == "" && ok {
		extName = ext
	}
	if extName == "" {
		extName = ".bin"
	}

	newName := fmt.Sprintf("%d%s", time.Now().UnixMilli(), extName)
	destPath := filepath.Join(destDir, newName)

	if shouldConvertWebP {
		tmpName := fmt.Sprintf("%d_raw%s", time.Now().UnixNano(), extName)
		tmpPath := filepath.Join(destDir, tmpName)
		tmpOut, err := os.Create(tmpPath)
		if err != nil {
			http.Error(w, "保存临时文件失败: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if _, err := io.Copy(tmpOut, file); err != nil {
			tmpOut.Close()
			os.Remove(tmpPath)
			http.Error(w, "写入临时文件失败: "+err.Error(), http.StatusInternalServerError)
			return
		}
		tmpOut.Close()
		defer os.Remove(tmpPath)

		newName = fmt.Sprintf("%d.webp", time.Now().UnixMilli())
		destPath = filepath.Join(destDir, newName)
		cmd := exec.Command("cwebp", "-quiet", "-q", "82", tmpPath, "-o", destPath)
		if output, err := cmd.CombinedOutput(); err != nil {
			http.Error(w, "转换 WebP 失败: "+string(output), http.StatusInternalServerError)
			return
		}
	} else {
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
	}

	urlPath := "/" + subDir + "/" + newName
	writeJSON(w, map[string]string{"url": urlPath})
}
