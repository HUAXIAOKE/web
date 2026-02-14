package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const bilibiliAPI = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all"
const bilibiliViewAPI = "https://api.bilibili.com/x/web-interface/view"
const defaultUID = "672455305"

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
	req.Header.Set("Referer", "https://www.bilibili.com/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
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

func fetchVideoInfo(client *http.Client, bvid string) (cover, title string) {
	if bvid == "" {
		return "", ""
	}
	req, err := http.NewRequest("GET", bilibiliViewAPI+"?bvid="+url.QueryEscape(bvid), nil)
	if err != nil {
		return "", ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.bilibili.com/")
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != 200 {
		return "", ""
	}
	defer resp.Body.Close()
	var view struct {
		Code int `json:"code"`
		Data struct {
			Pic   string `json:"pic"`
			Title string `json:"title"`
		} `json:"data"`
	}
	if json.NewDecoder(resp.Body).Decode(&view) != nil || view.Code != 0 {
		return "", ""
	}
	return view.Data.Pic, view.Data.Title
}

const bilibiliCookie = "buvid3=B05FC0FF-B51E-04E1-979A-06E8A43B061B15860infoc; b_nut=1761577715; _uuid=56106627E-8106E-4EC9-7EA3-3DC5CB74FCEC16252infoc; buvid4=0CE71F4C-A6F0-9C82-684D-ACC8824D702916665-025102723-iAn0lSXbntDd7Kt2BZQppQ%3D%3D; rpdid=|(JYYRRu||m|0J'u~Yul~~~uY; SESSDATA=c42f74bf%2C1777129774%2Cc929d%2Aa1CjBDR6ZOT-xZYpC29xTHI2MFvT9RXBjj-BacgsuelfgkE5s6kZSHcPiHdLDDpbQVIL0SVlNuaEVvejRJejFJTmRSSkxzdDMxbnRmeFI0OVMxbmduTVRvb0ZaVjdOU2p6dWxvZmxCdVMtVkIxREtDdlY0UnNTdnR2R2x3RmxVV3lJek9uUVBHN1RRIIEC; bili_jct=f19d79d910ab3b0f346c79fcd0ff0f4d; DedeUserID=622843063; DedeUserID__ckMd5=23cba0751ea4b925; theme-tip-show=SHOWED; theme-avatar-tip-show=SHOWED; LIVE_BUVID=AUTO6817619749743420; hit-dyn-v2=1; CURRENT_QUALITY=125; fingerprint=86a99231514b569edeaf12de85142fc8; buvid_fp_plain=undefined; buvid_fp=7838c1f6d15398e28895a6b03a82c4fc; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzExNTU0NzcsImlhdCI6MTc3MDg5NjIxNywicGx0IjotMX0.yoQVZ6gt9hIvKBK_6klAKZ8IVqqiiFQfshf3C4nC11s; bili_ticket_expires=1771155417; bp_t_offset_622843063=1168891996899639296; CURRENT_FNVAL=4048; b_lsid=58BA9DEE_19C5C8940DD; home_feed_column=4; browser_resolution=1007-863"

func GetLatestVideo(w http.ResponseWriter, r *http.Request) {
	reqURL, _ := url.Parse(bilibiliAPI)
	q := reqURL.Query()
	q.Set("host_mid", defaultUID)
	q.Set("type", "all")
	q.Set("platform", "web")
	q.Set("web_location", "333.1365")
	reqURL.RawQuery = q.Encode()

	req, err := http.NewRequest("GET", reqURL.String(), nil)
	if err != nil {
		writeJSON(w, map[string]string{"error": "请求构建失败"})
		return
	}
	req.Header.Set("Cookie", bilibiliCookie)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.bilibili.com/")

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
			Items []map[string]interface{} `json:"items"`
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

	for _, item := range data.Data.Items {
		modules, _ := item["modules"].(map[string]interface{})
		if modules == nil {
			continue
		}
		moduleDynamic, _ := modules["module_dynamic"].(map[string]interface{})
		if moduleDynamic == nil {
			continue
		}
		major, _ := moduleDynamic["major"].(map[string]interface{})

		orig, _ := item["orig"].(map[string]interface{})
		if orig != nil {
			origMods, _ := orig["modules"].(map[string]interface{})
			if origMods != nil {
				origDynamic, _ := origMods["module_dynamic"].(map[string]interface{})
				if origDynamic != nil {
					major, _ = origDynamic["major"].(map[string]interface{})
				}
			}
		}
		if major == nil {
			continue
		}
		majorType, _ := major["type"].(string)
		if majorType != "MAJOR_TYPE_ARCHIVE" {
			continue
		}

		archive, _ := major["archive"].(map[string]interface{})
		if archive == nil {
			continue
		}

		bvid, _ := archive["bvid"].(string)
		cover, _ := archive["cover"].(string)
		title, _ := archive["title"].(string)
		if title == "" {
			desc, _ := moduleDynamic["desc"].(map[string]interface{})
			if desc != nil {
				title, _ = desc["text"].(string)
			}
			if title == "" {
				title = "最新视频"
			}
		}

		if bvid != "" && (cover == "" || title == "") {
			fetchedCover, fetchedTitle := fetchVideoInfo(client, bvid)
			if cover == "" {
				cover = fetchedCover
			}
			if fetchedTitle != "" {
				title = fetchedTitle
			}
		}

		if cover != "" && (strings.Contains(cover, "hdslb.com") || strings.Contains(cover, "bilivideo.com")) {
			cover = "/api/bilibili/cover?url=" + url.QueryEscape(cover)
		}

		videoURL := "#"
		if bvid != "" {
			videoURL = "https://www.bilibili.com/video/" + bvid
		}

		writeJSON(w, map[string]interface{}{
			"cover": cover,
			"title": title,
			"url":   videoURL,
		})
		return
	}

	writeJSON(w, map[string]string{"error": "未找到视频动态"})
}
