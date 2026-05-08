package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

const bilibiliAPI = "https://api.bilibili.com/x/space/wbi/arc/search"
const defaultUID = "672455305"

var bilibiliCookie = os.Getenv("BILIBILI_COOKIE")
var bilibiliUA = func() string {
	if ua := os.Getenv("BILIBILI_USER_AGENT"); ua != "" {
		return ua
	}
	return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}()
var bilibiliReferer = func() string {
	if ref := os.Getenv("BILIBILI_REFERER"); ref != "" {
		return ref
	}
	return "https://www.bilibili.com/"
}()

func GetBilibiliCover(w http.ResponseWriter, r *http.Request) {
	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
		http.Error(w, "缺少 url 参数", http.StatusBadRequest)
		return
	}
	if !strings.Contains(rawURL, "hdslb.com") && !strings.Contains(rawURL, "bilivideo.com") {
		http.Error(w, "非法图片地址", http.StatusBadRequest)
		return
	}
	if strings.HasPrefix(rawURL, "http://") {
		rawURL = "https://" + rawURL[7:]
	}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Referer", bilibiliReferer)
	req.Header.Set("User-Agent", bilibiliUA)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		http.Error(w, "上游请求失败", resp.StatusCode)
		return
	}
	if ct := resp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	} else {
		w.Header().Set("Content-Type", "image/jpeg")
	}
	io.Copy(w, resp.Body)
}

func GetLatestVideo(w http.ResponseWriter, r *http.Request) {
	reqURL, _ := url.Parse(bilibiliAPI)
	q := reqURL.Query()
	q.Set("mid", defaultUID)
	q.Set("ps", "1")
	q.Set("pn", "1")
	q.Set("order", "pubdate")
	reqURL.RawQuery = q.Encode()

	req, err := http.NewRequest("GET", reqURL.String(), nil)
	if err != nil {
		writeJSON(w, map[string]string{"error": "请求构建失败"})
		return
	}
	req.Header.Set("User-Agent", bilibiliUA)
	req.Header.Set("Referer", bilibiliReferer)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		writeJSON(w, map[string]string{"error": "请求 B 站失败"})
		return
	}
	defer resp.Body.Close()

	var data struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			List struct {
				VList []struct {
					BVID  string `json:"bvid"`
					Pic   string `json:"pic"`
					Title string `json:"title"`
				} `json:"vlist"`
			} `json:"list"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		writeJSON(w, map[string]string{"error": "解析响应失败"})
		return
	}
	if data.Code != 0 {
		writeJSON(w, map[string]string{"error": data.Message})
		return
	}
	if len(data.Data.List.VList) == 0 {
		writeJSON(w, map[string]string{"error": "未找到视频"})
		return
	}

	v := data.Data.List.VList[0]
	cover := v.Pic
	title := v.Title
	bvid := v.BVID

	if cover != "" && (strings.Contains(cover, "hdslb.com") || strings.Contains(cover, "bilivideo.com")) {
		cover = "/api/bilibili/cover?url=" + url.QueryEscape(cover)
	}

	videoURL := "https://www.bilibili.com/video/" + bvid

	writeJSON(w, map[string]interface{}{
		"cover": cover,
		"title": title,
		"url":   videoURL,
	})
}
