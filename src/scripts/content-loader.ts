interface ActivityItem {
	id: number;
	tags: string;
	date: string;
	headline: string;
	excerpt: string;
	href: string;
	image: string;
	isSignup: number;
	signupStart: string;
	signupEnd: string;
	signupStatus: string;
}

interface AboutCard {
	id: number;
	smallTitle: string;
	title: string;
	content: string;
	image: string;
}

interface TimelineHeader {
	title: string;
	subtitle: string;
}

const API = () => (window.API_BASE || '') as string;

async function initLatestVideo(): Promise<void> {
	const block = document.getElementById('home-latest-video');
	if (!block) return;
	try {
		const video = await loadAPI<any>('/api/bilibili/latest-video');
		if (video.error) throw new Error(video.error);
		const img = block.querySelector<HTMLImageElement>('img');
		const text = block.querySelector<HTMLElement>('.box-maintext');
		if (img) {
			let coverSrc: string = video.cover || '/img/temp.webp';
			if (coverSrc.startsWith('/api/')) {
				coverSrc = API() + coverSrc;
			}
			img.src = coverSrc;
			img.alt = video.title;
		}
		if (text) text.textContent = video.title;
	} catch (e) {
		const text = block.querySelector<HTMLElement>('.box-maintext');
		if (text) text.textContent = '此事在Bilibili的华小科Official中亦有记载~';
	}
}

async function loadAPI<T>(endpoint: string): Promise<T> {
	const res = await fetch(API() + endpoint);
	if (!res.ok) throw new Error('API 请求失败 ' + endpoint);
	return res.json();
}

async function initTimeline(): Promise<void> {
	const shell = document.querySelector<HTMLElement>('#page-live .timeline-header');
	if (!shell) return;
	try {
		const data = await loadAPI<{ header: TimelineHeader }>('/api/timeline');
		const titleEl = shell.querySelector<HTMLElement>('.timeline-title');
		const subEl = shell.querySelector<HTMLElement>('.timeline-subtitle');
		if (titleEl) titleEl.textContent = data.header.title;
		if (subEl) subEl.textContent = data.header.subtitle;
	} catch (e) {}
}

async function initAbout(): Promise<void> {
	const container = document.querySelector<HTMLElement>('#page-about #card-section');
	if (!container) return;
	try {
		const data = await loadAPI<{ cards: AboutCard[] }>('/api/about');
		const cards = data.cards || [];
		container.innerHTML = cards
			.map((c) => {
				const isJoinUs = c.id === 4 || c.smallTitle === '加入我们';
				const titleHtml = isJoinUs ? `<a href="/joinus">${c.title}</a>` : c.title;
				return `<div id="card${c.id}" class="card">
	  <div class="card-small-title">${c.smallTitle}</div>
	  <div class="card-title">${titleHtml}</div>
	  <div class="card-content">${c.content}</div>
	  <div class="card-img"><img src="${c.image}" alt="" /></div>
	</div>`;
			})
			.join('\n');
	} catch (e) {}
}

async function initActivity(): Promise<void> {
	try {
		const activities = await loadAPI<ActivityItem[]>('/api/activities');
		if (!activities || activities.length === 0) return;

		const getBadgeClass = (status: string): string => {
			if (status === 'active') return 'card-signup';
			if (status === 'not_started') return 'card-not-started';
			if (status === 'expired') return 'card-expired';
			return '';
		};

		const getCardHref = (a: ActivityItem, index: number): string => {
			if (a.signupStatus === 'active') return `/activity/signup?activityId=${a.id}`;
			if (a.href && !a.href.startsWith('/activity/')) return a.href;
			return `/activity/detail?activityId=${a.id}`;
		};

		const grid = document.getElementById('activity-grid');
		if (grid) {
			grid.innerHTML = activities
				.map((a, i) => {
					const badgeClass = getBadgeClass(a.signupStatus);
					return `<a class="news-card${badgeClass ? ' ' + badgeClass : ''}" data-tags="${a.tags}" href="${getCardHref(a, i)}">
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
</a>`;
				})
				.join('\n');
			document.dispatchEvent(new CustomEvent('activity-cards-loaded'));
		}

		const latest = activities.reduce((a, b) => (a.date > b.date ? a : b));
		const homeBlock = document.getElementById('home-latest-activity');
		if (homeBlock && latest) {
			const img = homeBlock.querySelector<HTMLImageElement>('img');
			const text = homeBlock.querySelector<HTMLElement>('.box-maintext');
			if (img) {
				img.src = latest.image;
				img.alt = latest.headline;
			}
			if (text) text.textContent = latest.headline;
		}
	} catch {}
}

function init(): void {
	initTimeline();
	initAbout();
	initActivity();
	initLatestVideo();
}

document.addEventListener('DOMContentLoaded', init);
