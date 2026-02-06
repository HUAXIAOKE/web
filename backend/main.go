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

	// GET
	mux.HandleFunc("GET /api/activities", handler.GetActivities)
	mux.HandleFunc("GET /api/timeline", handler.GetTimeline)
	mux.HandleFunc("GET /api/gallery", handler.GetGallery)
	mux.HandleFunc("GET /api/about", handler.GetAbout)
	mux.HandleFunc("GET /api/music", handler.GetMusic)

	// POST
	mux.HandleFunc("POST /api/activities", handler.CreateActivity)
	mux.HandleFunc("POST /api/timeline/events", handler.CreateTimelineEvent)
	mux.HandleFunc("POST /api/gallery", handler.CreateGallery)
	mux.HandleFunc("POST /api/about", handler.CreateAbout)
	mux.HandleFunc("POST /api/music", handler.CreateMusic)
	mux.HandleFunc("POST /api/upload", handler.UploadFile)

	// PUT
	mux.HandleFunc("PUT /api/activities/{id}", handler.UpdateActivity)
	mux.HandleFunc("PUT /api/timeline/header", handler.UpdateTimelineHeader)
	mux.HandleFunc("PUT /api/timeline/events/{id}", handler.UpdateTimelineEvent)
	mux.HandleFunc("PUT /api/gallery/{id}", handler.UpdateGallery)
	mux.HandleFunc("PUT /api/about/{id}", handler.UpdateAbout)
	mux.HandleFunc("PUT /api/music/{id}", handler.UpdateMusic)

	// DELETE
	mux.HandleFunc("DELETE /api/activities/{id}", handler.DeleteActivity)
	mux.HandleFunc("DELETE /api/timeline/events/{id}", handler.DeleteTimelineEvent)
	mux.HandleFunc("DELETE /api/gallery/{id}", handler.DeleteGallery)
	mux.HandleFunc("DELETE /api/about/{id}", handler.DeleteAbout)
	mux.HandleFunc("DELETE /api/music/{id}", handler.DeleteMusic)

	// 静态资源 (图片、音频等)
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

	fmt.Printf("华小科后端启动 -> http://localhost%s\n", config.Port)
	fmt.Printf("管理后台 -> http://localhost%s/admin/\n", config.Port)

	if err := http.ListenAndServe(config.Port, h); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
