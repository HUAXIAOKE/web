package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const (
	adminUser   = "huaxiaoke"
	adminPass   = "Huaxiaoke2017"
	tokenSecret = "hxk-admin-secret-2017"
	tokenMaxAge = 24 * time.Hour
)

type loginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func VerifyToken(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]string{"ok": "true"})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "参数错误", http.StatusBadRequest)
		return
	}
	if req.Username != adminUser || req.Password != adminPass {
		http.Error(w, "账号或密码错误", http.StatusUnauthorized)
		return
	}
	token := generateToken(req.Username)
	writeJSON(w, map[string]string{"token": token})
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		token := strings.TrimPrefix(auth, "Bearer ")
		if token == "" || !validateToken(token) {
			http.Error(w, "未授权", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func generateToken(user string) string {
	exp := time.Now().Add(tokenMaxAge).Unix()
	payload := user + "|" + fmt.Sprintf("%d", exp)
	mac := hmac.New(sha256.New, []byte(tokenSecret))
	mac.Write([]byte(payload))
	sig := hex.EncodeToString(mac.Sum(nil))
	return payload + "|" + sig
}

func validateToken(token string) bool {
	parts := strings.SplitN(token, "|", 3)
	if len(parts) != 3 {
		return false
	}
	payload := parts[0] + "|" + parts[1]
	sig := parts[2]

	mac := hmac.New(sha256.New, []byte(tokenSecret))
	mac.Write([]byte(payload))
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return false
	}

	var exp int64
	fmt.Sscanf(parts[1], "%d", &exp)
	return time.Now().Unix() < exp
}
