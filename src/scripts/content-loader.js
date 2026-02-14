const API = () => window.API_BASE || '';

async function initLatestVideo() {
	const block = document.getElementById('home-latest-video');
	if (!block) return;
	try {
		const video = await loadAPI('/api/bilibili/latest-video');
		if (video.error) throw new Error(video.error);
		const img = block.querySelector('img');
		const text = block.querySelector('.box-maintext');
		const link = block.querySelector('.box-main-video-link');
		if (img) {
			let coverSrc = video.cover || '/img/temp.png';
			if (coverSrc.startsWith('/api/')) {
				coverSrc = API() + coverSrc;
			}
			img.src = coverSrc;
			img.alt = video.title;
		}
		if (text) text.textContent = video.title;
		if (link) link.href = video.url;
	} catch (e) {
		console.error('最新视频加载失败:', e);
		const text = block?.querySelector('.box-maintext');
		if (text) text.textContent = '此事在Bilibili的华小科Official中亦有记载~';
	}
}

async function loadAPI(endpoint) {
	const res = await fetch(API() + endpoint);
	if (!res.ok) throw new Error('API 请求失败 ' + endpoint);
	return res.json();
}

async function initTimeline() {
	const shell = document.querySelector('#page-live .timeline-header');
	if (!shell) return;
	try {
		const data = await loadAPI('/api/timeline');
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
		const data = await loadAPI('/api/about');
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
		const activities = await loadAPI('/api/activities');
		if (!activities || activities.length === 0) return;

		const grid = document.getElementById('activity-grid');
		if (grid) {
			grid.innerHTML = activities
				.map(
					(a) =>
						`<a class="news-card" data-tags="${a.tags}" href="${a.href}" target="_blank" rel="noopener">
  <div class="thumb" style="background-image:url(${a.image})"></div>
  <div class="meta">
    ${a.tags
			.split(',')
			.map((t) => `<span class="tag">${t}</span>`)
			.join('')}
    <span class="date">${a.date}</span>
  </div>
  <h3 class="headline">${a.headline}</h3>
  <p class="excerpt">${a.excerpt}</p>
</a>`
				)
				.join('\n');
		}

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
	initLatestVideo();
}

document.addEventListener('DOMContentLoaded', init);
