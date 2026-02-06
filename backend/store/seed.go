package store

import "log"

func Seed() {
	seedActivities()
	seedTimeline()
	seedGallery()
	seedAbout()
	seedMusic()
	log.Println("种子数据导入完成")
}

func seedActivities() {
	data := []struct {
		Tags, Date, Image, Headline, Excerpt, Href string
	}{
		{"线上", "2025-09-15", "/img/activity/now_activity.png", "「2025新声歌会」线上直播", "喻见·声生不息，在这里展现你的风采！", "#"},
		{"线下,联动", "2025-10-15", "/img/activity/Bingke.png", "华小科 x 冰岩作坊", "线下ARG，等你来解密~", "#"},
		{"线下", "2025-09-27", "/img/activity/Luyan.PNG", "我们来路演啦！", "紫菘、韵苑路口，我们不见不散！", "#"},
	}
	for _, a := range data {
		DB.Exec(`INSERT INTO activity (tags,date,image,headline,excerpt,href) VALUES (?,?,?,?,?,?)`,
			a.Tags, a.Date, a.Image, a.Headline, a.Excerpt, a.Href)
	}
}

func seedTimeline() {
	DB.Exec(`INSERT OR REPLACE INTO timeline_header (id,title,subtitle) VALUES (1,?,?)`,
		"心路历程", "我们的成长足迹")

	events := []struct {
		Date, Title, Desc, Image, Label string
	}{
		{"2025.1.15", "科三模型展示", "虚拟女大一枚~", "/img/timeline/2025.1.15.png", "美少女堂堂亮相！"},
		{"2025.1.16", "自我介绍环节", "你好，我是华小科！", "/img/timeline/2025.1.16.png", "初次见面，请多关照~"},
		{"2025.1.19", "首播就迟到？", "团子小西联合寻人……", "/img/timeline/2025.1.19.png", "真正原因竟是！"},
		{"2025.1.29", "第一次说晚安", "新年快乐，好梦常随~", "/img/timeline/2025.1.29.png", "Good Night~"},
		{"2025.2.26", "拼搏百日，我要……", "上华中科技大学！", "/img/timeline/2025.2.26.png", "高考加油~"},
		{"2025.4.1", "联动疑似流出？", "六星赠送，强度你猜", "/img/timeline/2025.4.1.png", "super~big~cup！"},
		{"2025.5.11", "比起甲醛", "我更喜欢80你！", "/img/timeline/2025.5.11.png", "暴躁版本的科~"},
		{"2025.6.30", "诶？骗人的吧！", "我难道不是天才虚拟女大吗TT", "/img/timeline/2025.6.30.png", "骗你的，嘻嘻~"},
		{"2025.8.15", "新声歌会", "喻见·声生不息", "/img/timeline/2025.8.15.png", "不要放原唱！"},
		{"2025.8.26", "\u201c科\u201d学五分钟", "第一期——谨防诈骗", "/img/timeline/2025.8.26.png", "守好钱袋子！"},
	}
	for _, e := range events {
		DB.Exec(`INSERT INTO timeline_event (date,title,description,image,label) VALUES (?,?,?,?,?)`,
			e.Date, e.Title, e.Desc, e.Image, e.Label)
	}
}

func seedGallery() {
	items := []struct {
		Image, Illustrator, Scene, Desc string
	}{
		{"/img/Illustration/1.jpeg", "鸢泽", "手书摸鱼", "制作YELLOW手书时的副产物？"},
		{"/img/Illustration/2.png", "xxx", "xxxx", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
		{"/img/Illustration/3.jpeg", "xxx", "xxxx", "xxxxxxxxxxxxxxxxxxxxxxxxx"},
		{"/img/Illustration/4.jpeg", "xxx", "xxxx", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
		{"/img/Illustration/5.png", "xxx", "xxxx", "xxxxxxxxxxxxxxxxxxxxxxxx"},
		{"/img/Illustration/6.png", "xxx", "xxxx", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
		{"/img/Illustration/7.jpeg", "xxx", "xxxx", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"},
	}
	for _, g := range items {
		DB.Exec(`INSERT INTO gallery (image,illustrator,scene,description) VALUES (?,?,?,?)`,
			g.Image, g.Illustrator, g.Scene, g.Desc)
	}
}

func seedAbout() {
	cards := []struct {
		SmallTitle, Title, Content, Image string
	}{
		{"HuaXiaoKe", "智慧虚拟女大一枚", "TODO", "/img/temp.png"},
		{"Daily", "神人的日常生活", "TODO", "/img/temp.png"},
		{"Work!", "成分极其复杂", "首先，组内全员颠佬（划掉）~<br />在这里你可以学习视频制作、如何直播、各种妙妙技术，只要你感兴趣的事情都可以在这里找到前辈……<br />我们会使用到OBS、AE、PR等软件，当然也会有一些其他的工具，包括但不限于视频、游戏、音频制作等~<br />当然我们是为爱发电，热爱是我们的核心动力！", "/img/about/work.jpeg"},
		{"Join Us!", "加入这里只需热爱", "无论是否来自华中科技大学， 无论年级高低，<br />只要你喜欢华小科这个形象，你就一定可以在这里找到你想做的事情！<br />如果你对我们感兴趣，可以关注每年的秋招与春招~<br />当然也可以加入粉丝群(451141031)哦！", "/img/temp.png"},
	}
	for _, c := range cards {
		DB.Exec(`INSERT INTO about_card (small_title,title,content,image) VALUES (?,?,?,?)`,
			c.SmallTitle, c.Title, c.Content, c.Image)
	}
}

func seedMusic() {
	tracks := []struct {
		Title, Artist, Src, Cover string
	}{
		{"ハレハレヤ", "羽生迷子", "/audio/song1.mp3", "/img/covers/cover1.jpg"},
		{"ヒッチコック", "ヨルシカ", "/audio/song2.mp3", "/img/covers/cover2.jpg"},
	}
	for _, t := range tracks {
		DB.Exec(`INSERT INTO music (title,artist,src,cover) VALUES (?,?,?,?)`,
			t.Title, t.Artist, t.Src, t.Cover)
	}
}
