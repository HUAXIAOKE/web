package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type bilibiliVideoInfo struct {
	Title    string
	Owner    string
	Cover    string
	Duration int
}

func fetchBilibiliVideoInfo(bvid string) (*bilibiliVideoInfo, error) {
	apiURL := fmt.Sprintf("https://api.bilibili.com/x/web-interface/view?bvid=%s", url.QueryEscape(bvid))
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.bilibili.com/")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("B站 API 返回状态码 %d", resp.StatusCode)
	}

	var view struct {
		Code int `json:"code"`
		Data struct {
			Title   string `json:"title"`
			Owner   struct {
				Name string `json:"name"`
			} `json:"owner"`
			Pic      string `json:"pic"`
			Duration int    `json:"duration"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&view); err != nil {
		return nil, err
	}
	if view.Code != 0 {
		return nil, fmt.Errorf("B站 API 错误")
	}

	info := &bilibiliVideoInfo{
		Title:    view.Data.Title,
		Owner:    view.Data.Owner.Name,
		Cover:    view.Data.Pic,
		Duration: view.Data.Duration,
	}
	return info, nil
}

func GetBilibiliVideoInfo(w http.ResponseWriter, r *http.Request) {
	bvid := r.URL.Query().Get("bvid")
	if bvid == "" {
		http.Error(w, "缺少 bvid 参数", http.StatusBadRequest)
		return
	}
	info, err := fetchBilibiliVideoInfo(bvid)
	if err != nil {
		writeJSON(w, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, info)
}

func StreamBilibiliAudio(w http.ResponseWriter, r *http.Request) {
	bvid := r.URL.Query().Get("bvid")
	if bvid == "" {
		http.Error(w, "缺少 bvid 参数", http.StatusBadRequest)
		return
	}

	cidURL := fmt.Sprintf("https://api.bilibili.com/x/player/pagelist?bvid=%s", url.QueryEscape(bvid))
	cidReq, err := http.NewRequest("GET", cidURL, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	cidReq.Header.Set("User-Agent", bilibiliUA)
	cidReq.Header.Set("Referer", bilibiliReferer)
	if bilibiliCookie != "" {
		cidReq.Header.Set("Cookie", bilibiliCookie)
	}

	cidResp, err := http.DefaultClient.Do(cidReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cidResp.Body.Close()

	var pageList struct {
		Code int `json:"code"`
		Data []struct {
			CID int `json:"cid"`
		} `json:"data"`
	}
	if err := json.NewDecoder(cidResp.Body).Decode(&pageList); err != nil || pageList.Code != 0 || len(pageList.Data) == 0 {
		http.Error(w, "获取音频信息失败", http.StatusInternalServerError)
		return
	}

	cid := pageList.Data[0].CID

	playURL := fmt.Sprintf("https://api.bilibili.com/x/player/playurl?bvid=%s&cid=%d&fnval=16&qn=0&otype=json&platform=html5",
		url.QueryEscape(bvid), cid)
	playReq, err := http.NewRequest("GET", playURL, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	playReq.Header.Set("User-Agent", bilibiliUA)
	playReq.Header.Set("Referer", bilibiliReferer)
	if bilibiliCookie != "" {
		playReq.Header.Set("Cookie", bilibiliCookie)
	}

	playResp, err := http.DefaultClient.Do(playReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer playResp.Body.Close()

	var playData struct {
		Code int `json:"code"`
		Data struct {
			Dash struct {
				Audio []struct {
					ID       int    `json:"id"`
					BaseURL  string `json:"baseUrl"`
					BaseURL2 string `json:"base_url"`
					MimeType string `json:"mimeType"`
				} `json:"audio"`
			} `json:"dash"`
		} `json:"data"`
	}
	if err := json.NewDecoder(playResp.Body).Decode(&playData); err != nil || playData.Code != 0 {
		http.Error(w, "获取音频流失败", http.StatusInternalServerError)
		return
	}

	var audioURL string
	for _, a := range playData.Data.Dash.Audio {
		u := a.BaseURL
		if u == "" {
			u = a.BaseURL2
		}
		if u != "" {
			audioURL = u
			break
		}
	}

	if audioURL == "" {
		http.Error(w, "该视频没有可用的音频流", http.StatusInternalServerError)
		return
	}

	audioReq, err := http.NewRequest("GET", audioURL, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	audioReq.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	audioReq.Header.Set("Referer", "https://www.bilibili.com/")

	audioResp, err := http.DefaultClient.Do(audioReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer audioResp.Body.Close()

	if ct := audioResp.Header.Get("Content-Type"); ct != "" {
		w.Header().Set("Content-Type", ct)
	} else {
		w.Header().Set("Content-Type", "audio/mpeg")
	}
	w.Header().Set("Accept-Ranges", "bytes")

	rangeHeader := r.Header.Get("Range")
	if rangeHeader != "" {
		w.Header().Set("Content-Range", audioResp.Header.Get("Content-Range"))
		if audioResp.StatusCode == 206 {
			w.WriteHeader(http.StatusPartialContent)
		}
	}

	io.Copy(w, audioResp.Body)
}

func containsAny(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if strings.Contains(s, sub) {
			return true
		}
	}
	return false
}