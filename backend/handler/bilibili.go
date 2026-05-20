package handler

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"huaxiaoke-backend/store"

	qrcode "github.com/skip2/go-qrcode"
)

const bilibiliAPI = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space"
const defaultUID = "672455305"

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

func getBilibiliCookie() string {
	if store.DB != nil {
		var cookie string
		err := store.DB.QueryRow(`SELECT bili_cookie FROM bilibili_state WHERE id=1`).Scan(&cookie)
		if err == nil && cookie != "" {
			return cookie
		}
	}
	return os.Getenv("BILIBILI_COOKIE")
}

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
	q.Set("host_mid", defaultUID)
	q.Set("timezone_offset", "-480")
	q.Set("features", "itemOpusStyle")
	reqURL.RawQuery = q.Encode()

	req, err := http.NewRequest("GET", reqURL.String(), nil)
	if err != nil {
		writeJSON(w, map[string]string{"error": "请求构建失败"})
		return
	}
	req.Header.Set("User-Agent", bilibiliUA)
	req.Header.Set("Referer", "https://space.bilibili.com/"+defaultUID+"/dynamic")
	req.Header.Set("Accept", "application/json")
	if ck := getBilibiliCookie(); ck != "" {
		req.Header.Set("Cookie", ck)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		writeJSON(w, map[string]string{"error": "请求 B 站失败"})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var data struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			Items []struct {
				IDStr   string `json:"id_str"`
				Type    string `json:"type"`
				Modules struct {
					ModuleTag struct {
						Text string `json:"text"`
					} `json:"module_tag"`
					ModuleDynamic struct {
						Desc struct {
							Text string `json:"text"`
						} `json:"desc"`
						Major struct {
							Type    string `json:"type"`
							Archive struct {
								BVID    string `json:"bvid"`
								Cover   string `json:"cover"`
								Title   string `json:"title"`
								JumpURL string `json:"jump_url"`
							} `json:"archive"`
							Opus struct {
								JumpURL string `json:"jump_url"`
								Title   string `json:"title"`
								Summary struct {
									Text string `json:"text"`
								} `json:"summary"`
								Pics []struct {
									URL string `json:"url"`
								} `json:"pics"`
							} `json:"opus"`
							Draw struct {
								Items []struct {
									Src string `json:"src"`
								} `json:"items"`
							} `json:"draw"`
						} `json:"major"`
					} `json:"module_dynamic"`
				} `json:"modules"`
			} `json:"items"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		writeJSON(w, map[string]string{"error": "解析响应失败"})
		return
	}
	if data.Code != 0 {
		writeJSON(w, map[string]string{"error": data.Message})
		return
	}

	var cover, title, jumpURL string
	for _, item := range data.Data.Items {
		if item.Modules.ModuleTag.Text == "置顶" {
			continue
		}
		md := item.Modules.ModuleDynamic
		ar := md.Major.Archive
		if ar.BVID != "" {
			cover = ar.Cover
			title = ar.Title
			jumpURL = "https://www.bilibili.com/video/" + ar.BVID
			break
		}
		if len(md.Major.Opus.Pics) > 0 {
			cover = md.Major.Opus.Pics[0].URL
			title = firstNonEmpty(md.Major.Opus.Title, md.Major.Opus.Summary.Text, md.Desc.Text)
			jumpURL = md.Major.Opus.JumpURL
			if strings.HasPrefix(jumpURL, "//") {
				jumpURL = "https:" + jumpURL
			}
			if jumpURL == "" {
				jumpURL = "https://t.bilibili.com/" + item.IDStr
			}
			break
		}
		if len(md.Major.Draw.Items) > 0 {
			cover = md.Major.Draw.Items[0].Src
			title = md.Desc.Text
			jumpURL = "https://t.bilibili.com/" + item.IDStr
			break
		}
	}
	if cover == "" {
		writeJSON(w, map[string]string{"error": "未找到带图片的动态"})
		return
	}

	cover = toWebpCDN(cover)
	if strings.Contains(cover, "hdslb.com") || strings.Contains(cover, "bilivideo.com") {
		cover = "/api/bilibili/cover?url=" + url.QueryEscape(cover)
	}

	writeJSON(w, map[string]interface{}{
		"cover": cover,
		"title": title,
		"url":   jumpURL,
	})
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func toWebpCDN(raw string) string {
	if raw == "" {
		return raw
	}
	if !strings.Contains(raw, "hdslb.com") && !strings.Contains(raw, "bilivideo.com") {
		return raw
	}
	if strings.Contains(raw, ".webp") {
		return raw
	}
	if idx := strings.LastIndex(raw, "@"); idx > 0 {
		return raw[:idx] + "@1280w.webp"
	}
	return raw + "@1280w.webp"
}

// GenerateBilibiliQrcode 生成 B 站扫码登录二维码
func GenerateBilibiliQrcode(w http.ResponseWriter, r *http.Request) {
	req, _ := http.NewRequest("GET", "https://passport.bilibili.com/x/passport-login/web/qrcode/generate", nil)
	req.Header.Set("User-Agent", bilibiliUA)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeJSON(w, map[string]string{"error": "B站二维码生成失败"})
		return
	}
	defer resp.Body.Close()
	var data struct {
		Code int `json:"code"`
		Data struct {
			URL       string `json:"url"`
			QrcodeKey string `json:"qrcode_key"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil || data.Code != 0 || data.Data.QrcodeKey == "" {
		writeJSON(w, map[string]string{"error": "B站二维码生成失败"})
		return
	}
	png, err := qrcode.Encode(data.Data.URL, qrcode.Medium, 256)
	if err != nil {
		writeJSON(w, map[string]string{"error": "二维码渲染失败"})
		return
	}
	var buf bytes.Buffer
	buf.WriteString("data:image/png;base64,")
	enc := base64.NewEncoder(base64.RawStdEncoding, &buf)
	enc.Write(png)
	enc.Close()
	writeJSON(w, map[string]interface{}{
		"qrcode_key":  data.Data.QrcodeKey,
		"qr_data_url": buf.String(),
	})
}

// PollBilibiliQrcode 轮询扫码状态
func PollBilibiliQrcode(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		writeJSON(w, map[string]string{"error": "缺少 key 参数"})
		return
	}
	req, _ := http.NewRequest("GET",
		"https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key="+url.QueryEscape(key), nil)
	req.Header.Set("User-Agent", bilibiliUA)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeJSON(w, map[string]interface{}{"code": -1, "error": "轮询失败"})
		return
	}
	defer resp.Body.Close()
	var data struct {
		Code int `json:"code"`
		Data struct {
			Code         int    `json:"code"`
			RefreshToken string `json:"refresh_token"`
		} `json:"data"`
	}
	json.NewDecoder(resp.Body).Decode(&data)
	cookies := collectCookies(resp)
	writeJSON(w, map[string]interface{}{
		"code":          data.Data.Code,
		"refresh_token": data.Data.RefreshToken,
		"cookies":       cookies,
	})
}

// BindBilibiliAccount 保存扫码登录的 cookie
func BindBilibiliAccount(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
		Cookies      string `json:"cookies"`
		BiliUID      string `json:"bili_uid"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, map[string]string{"error": "参数错误"})
		return
	}
	_, err := store.DB.Exec(
		`INSERT INTO bilibili_state (id, refresh_token, bili_uid, bili_cookie, updated_at) VALUES (1,?,?,?,datetime('now'))
		 ON CONFLICT(id) DO UPDATE SET refresh_token=?, bili_uid=?, bili_cookie=?, updated_at=datetime('now')`,
		body.RefreshToken, body.BiliUID, body.Cookies,
		body.RefreshToken, body.BiliUID, body.Cookies,
	)
	if err != nil {
		writeJSON(w, map[string]string{"error": "保存失败"})
		return
	}
	writeJSON(w, map[string]string{"status": "ok"})
}

// GetBilibiliBindStatus 查询绑定状态
func GetBilibiliBindStatus(w http.ResponseWriter, r *http.Request) {
	var biliUID string
	err := store.DB.QueryRow(`SELECT bili_uid FROM bilibili_state WHERE id=1`).Scan(&biliUID)
	if err != nil || biliUID == "" {
		writeJSON(w, map[string]interface{}{"bound": false})
		return
	}
	writeJSON(w, map[string]interface{}{"bound": true, "bili_uid": biliUID})
}

func collectCookies(resp *http.Response) string {
	var parts []string
	for _, h := range resp.Header["Set-Cookie"] {
		idx := strings.IndexByte(h, ';')
		if idx > 0 {
			parts = append(parts, strings.TrimSpace(h[:idx]))
		} else {
			parts = append(parts, h)
		}
	}
	return strings.Join(parts, "; ")
}
