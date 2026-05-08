package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"huaxiaoke-backend/config"
	"huaxiaoke-backend/handler"
	"huaxiaoke-backend/middleware"
	"huaxiaoke-backend/store"
)

//go:embed admin
var adminFS embed.FS

func cacheStatic(next http.Handler, maxAge time.Duration) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", int(maxAge.Seconds())))
		next.ServeHTTP(w, r)
	})
}

func main() {
	store.Init()
	defer store.DB.Close()

	if err := store.RunMigrations(); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	tryAbs := func(rel string) {
		if handler.StaticDir != "" && handler.StaticDir != "../public" {
			return
		}
		if abs, err := filepath.Abs(rel); err == nil {
			if _, err := os.Stat(abs); err == nil {
				handler.StaticDir = abs
			}
		}
	}
	if execPath, err := os.Executable(); err == nil {
		execDir := filepath.Dir(execPath)
		tryAbs(filepath.Join(execDir, "..", "public"))
	}
	tryAbs("../public")
	tryAbs("public")
	if handler.StaticDir == "../public" {
		if abs, err := filepath.Abs(handler.StaticDir); err == nil {
			handler.StaticDir = abs
		}
	}
	fmt.Printf("静态目录 StaticDir = %s\n", handler.StaticDir)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/login", handler.Login)

	mux.HandleFunc("GET /api/activities", handler.GetActivities)
	mux.HandleFunc("GET /api/timeline", handler.GetTimeline)
	mux.HandleFunc("GET /api/gallery", handler.GetGallery)
	mux.HandleFunc("GET /api/about", handler.GetAbout)
	mux.HandleFunc("GET /api/music", handler.GetMusic)
	mux.HandleFunc("GET /api/bilibili/latest-video", handler.GetLatestVideo)
	mux.HandleFunc("GET /api/bilibili/cover", handler.GetBilibiliCover)
	mux.HandleFunc("GET /api/bilibili/info", handler.GetBilibiliVideoInfo)
	mux.HandleFunc("GET /api/bilibili/audio", handler.StreamBilibiliAudio)

	writeMux := http.NewServeMux()
	writeMux.HandleFunc("GET /api/auth/verify", handler.VerifyToken)
	writeMux.HandleFunc("POST /api/activities", handler.CreateActivity)
	writeMux.HandleFunc("POST /api/timeline/events", handler.CreateTimelineEvent)
	writeMux.HandleFunc("POST /api/gallery", handler.CreateGallery)
	writeMux.HandleFunc("POST /api/about", handler.CreateAbout)
	writeMux.HandleFunc("POST /api/music", handler.CreateMusic)
	writeMux.HandleFunc("POST /api/music/sync", handler.SyncMusic)
	writeMux.HandleFunc("POST /api/upload", handler.UploadFile)
	writeMux.HandleFunc("PUT /api/activities/{id}", handler.UpdateActivity)
	writeMux.HandleFunc("PUT /api/timeline/header", handler.UpdateTimelineHeader)
	writeMux.HandleFunc("PUT /api/timeline/events/{id}", handler.UpdateTimelineEvent)
	writeMux.HandleFunc("PUT /api/gallery/{id}", handler.UpdateGallery)
	writeMux.HandleFunc("PUT /api/about/{id}", handler.UpdateAbout)
	writeMux.HandleFunc("PUT /api/music/{id}", handler.UpdateMusic)
	writeMux.HandleFunc("DELETE /api/activities/{id}", handler.DeleteActivity)
	writeMux.HandleFunc("DELETE /api/timeline/events/{id}", handler.DeleteTimelineEvent)
	writeMux.HandleFunc("DELETE /api/gallery/{id}", handler.DeleteGallery)
	writeMux.HandleFunc("DELETE /api/about/{id}", handler.DeleteAbout)
	writeMux.HandleFunc("DELETE /api/music/{id}", handler.DeleteMusic)

	protected := handler.RequireAuth(writeMux)
	mux.Handle("GET /api/auth/", protected)
	mux.Handle("GET /api/", protected)
	mux.Handle("POST /api/", protected)
	mux.Handle("PUT /api/", protected)
	mux.Handle("DELETE /api/", protected)

	staticDir := handler.StaticDir
	mux.Handle("/img/", cacheStatic(http.FileServer(http.Dir(staticDir)), 30*24*time.Hour))
	mux.Handle("/audio/", cacheStatic(http.FileServer(http.Dir(staticDir)), 7*24*time.Hour))

	adminSub, _ := fs.Sub(adminFS, "admin")
	mux.Handle("GET /admin/", http.StripPrefix("/admin/", http.FileServer(http.FS(adminSub))))
	mux.HandleFunc("GET /admin", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/admin/", http.StatusMovedPermanently)
	})

	h := middleware.CORS(mux)

	fmt.Printf("后端启动 -> http://localhost%s\n", config.Port)
	fmt.Printf("管理后台 -> http://localhost%s/admin/\n", config.Port)

	if err := http.ListenAndServe(config.Port, h); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
