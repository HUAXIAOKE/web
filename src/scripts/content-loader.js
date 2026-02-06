// 动态加载 PartTwo 文本内容脚本
async function loadJSON(path) {
	const res = await fetch(path);
	if (!res.ok) throw new Error('加载失败 ' + path);
	return res.json();
}

async function initTimeline() {
	const shell = document.querySelector('#page-live .timeline-header');
	if (!shell) return;
	try {
		const data = await loadJSON('/json/timeline.json');
		const titleEl = shell.querySelector('.timeline-title');
		const subEl = shell.querySelector('.timeline-subtitle');
		if (titleEl) titleEl.textContent = data.header.title;
		if (subEl) subEl.textContent = data.header.subtitle;
	} catch (e) {
		console.error(e);
	}
}

async function initAbout() {
	const container = document.querySelector('#page-about #card-section');
	if (!container) return;
	try {
		const data = await loadJSON('/json/about.json');
		const cards = data.cards || [];
		container.innerHTML = cards
			.map(
				(c) =>
					`<div id="card${c.id}" class="card">
  <div class="card-small-title">${c.smallTitle}</div>
  <div class="card-title">${c.title}</div>
  <div class="card-content">${c.content}</div>
  <div class="card-img"><img src="${c.image}" alt="" /></div>
</div>`
			)
			.join('\n');
	} catch (e) {
		console.error(e);
	}
}

async function initActivity() {
	try {
		const activities = await loadJSON('/json/activity.json');
		if (!activities || activities.length === 0) return;

		// ── 渲染活动页卡片 ──
		const grid = document.getElementById('activity-grid');
		if (grid) {
			grid.innerHTML = activities
				.map(
					(a) =>
						`<a class="news-card" data-type="${a.type}" href="${a.href}" target="_blank" rel="noopener">
  <div class="thumb" style="background-image:url(${a.image})"></div>
  <div class="meta">
    <span class="tag">${a.tag}</span>
    <span class="date">${a.date}</span>
  </div>
  <h3 class="headline">${a.headline}</h3>
  <p class="excerpt">${a.excerpt}</p>
</a>`
				)
				.join('\n');
		}

		// ── 首页「近期活动」取日期最近的一条 ──
		const latest = activities.reduce((a, b) => (a.date > b.date ? a : b));
		const homeBlock = document.getElementById('home-latest-activity');
		if (homeBlock && latest) {
			const img = homeBlock.querySelector('img');
			const text = homeBlock.querySelector('.box-maintext');
			if (img) {
				img.src = latest.image;
				img.alt = latest.headline;
			}
			if (text) text.textContent = latest.headline;
		}
	} catch (e) {
		console.error(e);
	}
}

function init() {
	initTimeline();
	initAbout();
	initActivity();
}

document.addEventListener('DOMContentLoaded', init);
