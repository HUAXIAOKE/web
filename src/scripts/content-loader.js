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
					`\n<div id="card${c.id}" class="card">\n  <div class="card-small-title">${c.smallTitle}</div>\n  <div class="card-title">${c.title}</div>\n  <div class="card-content">${c.content}</div>\n  <div class="card-img"><img src="${c.image}" alt="" /></div>\n</div>`
			)
			.join('\n');
	} catch (e) {
		console.error(e);
	}
}

function init() {
	initTimeline();
	initAbout();
}

document.addEventListener('DOMContentLoaded', init);
