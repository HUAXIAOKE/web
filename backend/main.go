package main

import (
	"fmt"
	"log"
	"net/http"

	"huaxiaoke-backend/config"
	"huaxiaoke-backend/handler"
	"huaxiaoke-backend/middleware"
	"huaxiaoke-backend/store"
)

func main() {
	store.Init()
	defer store.DB.Close()

	mux := http.NewServeMux()

	// API 路由
	mux.HandleFunc("GET /api/activities", handler.GetActivities)
	mux.HandleFunc("GET /api/timeline", handler.GetTimeline)
	mux.HandleFunc("GET /api/gallery", handler.GetGallery)
	mux.HandleFunc("GET /api/about", handler.GetAbout)
	mux.HandleFunc("GET /api/music", handler.GetMusic)

	// 包裹 CORS 中间件
	h := middleware.CORS(mux)

	fmt.Printf("华小科后端启动 -> http://localhost%s\n", config.Port)
	fmt.Println("API 列表:")
	fmt.Println("  GET /api/activities")
	fmt.Println("  GET /api/timeline")
	fmt.Println("  GET /api/gallery")
	fmt.Println("  GET /api/about")
	fmt.Println("  GET /api/music")

	if err := http.ListenAndServe(config.Port, h); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}
