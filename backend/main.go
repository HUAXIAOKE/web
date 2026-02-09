package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"

	"huaxiaoke-backend/config"
	"huaxiaoke-backend/handler"
	"huaxiaoke-backend/middleware"
	"huaxiaoke-backend/store"
)

//go:embed admin
var adminFS embed.FS

func main() {
	store.Init()
	defer store.DB.Close()

	mux := http.NewServeMux()

	// 登录
	mux.HandleFunc("POST /api/login", handler.Login)

	// GET (公开)
	mux.HandleFunc("GET /api/activities", handler.GetActivities)
	mux.HandleFunc("GET /api/timeline", handler.GetTimeline)
	mux.HandleFunc("GET /api/gallery", handler.GetGallery)
	mux.HandleFunc("GET /api/about", handler.GetAbout)
	mux.HandleFunc("GET /api/music", handler.GetMusic)

	// 写入操作 (需要登录)
	writeMux := http.NewServeMux()
	writeMux.HandleFunc("GET /api/auth/verify", handler.VerifyToken)
	writeMux.HandleFunc("POST /api/activities", handler.CreateActivity)
	writeMux.HandleFunc("POST /api/timeline/events", handler.CreateTimelineEvent)
	writeMux.HandleFunc("POST /api/gallery", handler.CreateGallery)
	writeMux.HandleFunc("POST /api/about", handler.CreateAbout)
	writeMux.HandleFunc("POST /api/music", handler.CreateMusic)
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
	mux.Handle("POST /api/", protected)
	mux.Handle("PUT /api/", protected)
	mux.Handle("DELETE /api/", protected)

	// 静态资源
	staticDir := handler.StaticDir
	mux.Handle("/img/", http.FileServer(http.Dir(staticDir)))
	mux.Handle("/audio/", http.FileServer(http.Dir(staticDir)))

	// 管理界面
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
