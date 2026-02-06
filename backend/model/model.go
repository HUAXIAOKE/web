package model

// HomepageCard 首页黑板区卡片
type HomepageCard struct {
	ID    int    `json:"id"`
	Label string `json:"label"`
	Image string `json:"image"`
	Text  string `json:"text"`
	Link  string `json:"link"`
	Sort  int    `json:"sort"`
}

// Activity 当期活动
type Activity struct {
	ID       int    `json:"id"`
	Tags     string `json:"tags"`
	Date     string `json:"date"`
	Image    string `json:"image"`
	Headline string `json:"headline"`
	Excerpt  string `json:"excerpt"`
	Href     string `json:"href"`
}

// TimelineHeader 时间轴标题
type TimelineHeader struct {
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
}

// TimelineEvent 时间轴事件
type TimelineEvent struct {
	ID          int    `json:"id"`
	Date        string `json:"date"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	Label       string `json:"label"`
}

// TimelineData 时间轴完整数据
type TimelineData struct {
	Header TimelineHeader  `json:"header"`
	Events []TimelineEvent `json:"events"`
}

// GalleryItem 画廊作品
type GalleryItem struct {
	ID          int    `json:"id"`
	Image       string `json:"image"`
	Illustrator string `json:"illustrator"`
	Scene       string `json:"scene"`
	Description string `json:"description"`
}

// AboutCard 关于我们卡片
type AboutCard struct {
	ID         int    `json:"id"`
	SmallTitle string `json:"smallTitle"`
	Title      string `json:"title"`
	Content    string `json:"content"`
	Image      string `json:"image"`
}

// AboutData 关于我们完整数据
type AboutData struct {
	Cards []AboutCard `json:"cards"`
}

// MusicTrack 歌曲
type MusicTrack struct {
	ID     int    `json:"id"`
	Title  string `json:"title"`
	Artist string `json:"artist"`
	Src    string `json:"src"`
	Cover  string `json:"cover"`
}
