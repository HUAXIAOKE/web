interface ActivityItem {
	tags: string;
	date: string;
	headline: string;
	excerpt: string;
	href: string;
	image: string;
}

function initActivityCharacter(grid: HTMLElement): void {
	if (grid.dataset.characterInit === 'true') return;

	const cards = Array.from(grid.querySelectorAll<HTMLElement>('.news-card'));
	if (cards.length === 0) return;

	grid.dataset.characterInit = 'true';

	const isMobile = () => window.innerWidth <= 900;

	const overlay = document.createElement('div');
	overlay.className = 'activity-character-overlay';
	overlay.innerHTML = '<img src="/img/activity/here.webp" alt="" decoding="async" fetchpriority="high" />';
	grid.appendChild(overlay);

	let currentCard: HTMLElement | null = null;

	const spawnGhost = (top: number, right: number): void => {
		const el = document.createElement('div');
		el.className = 'activity-character-ghost';
		el.innerHTML = '<img src="/img/activity/here.webp" alt="" decoding="async" />';
		el.style.top = top + 'px';
		el.style.right = right + 'px';
		grid.appendChild(el);
		requestAnimationFrame(() => el.classList.add('fade-out'));
		el.addEventListener('animationend', () => el.remove(), { once: true });
	};

	const positionCharacter = (card: HTMLElement, leaveTrail: boolean, instant = false): void => {
		const cardRect = card.getBoundingClientRect();
		const gridRect = grid.getBoundingClientRect();

		const targetTop = cardRect.top - gridRect.top;
		const targetRight = gridRect.right - cardRect.right - 8;

		if (leaveTrail && overlay.classList.contains('active')) {
			const prevTop = parseFloat(overlay.style.top);
			const prevRight = parseFloat(overlay.style.right);
			if (!Number.isNaN(prevTop) && !Number.isNaN(prevRight)) {
				spawnGhost(prevTop, prevRight);
			}
		}

		if (instant) {
			const prev = overlay.style.transition;
			overlay.style.transition = 'none';
			overlay.style.top = targetTop + 'px';
			overlay.style.right = targetRight + 'px';
			void overlay.offsetWidth;
			overlay.style.transition = prev;
		} else {
			overlay.style.top = targetTop + 'px';
			overlay.style.right = targetRight + 'px';
		}
	};

	const moveCharacter = (card: HTMLElement): void => {
		if (currentCard === card) {
			positionCharacter(card, false);
			return;
		}

		const hadCharacter = currentCard !== null;
		currentCard = card;
		positionCharacter(card, hadCharacter);
		overlay.classList.add('active');
	};

	const syncAfterFilter = (): void => {
		const visible = Array.from(grid.querySelectorAll<HTMLElement>('.news-card:not(.card-hidden)'));
		if (!visible.length) {
			currentCard = null;
			overlay.classList.remove('active');
			return;
		}

		const target = currentCard && !currentCard.classList.contains('card-hidden') ? currentCard : visible[0];

		currentCard = target;
		requestAnimationFrame(() => {
			positionCharacter(target, false, true);
			overlay.classList.add('active');
		});
	};

	const defaultCard = cards.find((c) => !c.classList.contains('card-hidden')) ?? cards[0];
	if (defaultCard) {
		requestAnimationFrame(() => {
			currentCard = defaultCard;
			positionCharacter(defaultCard, false, true);
			overlay.classList.add('active');
		});
	}

	if (isMobile()) {
		cards.forEach((card) => {
			card.addEventListener('click', (e) => {
				if (currentCard === card) return;
				e.preventDefault();
				moveCharacter(card);
			});
		});
	} else {
		cards.forEach((card) => {
			card.addEventListener('mouseenter', () => moveCharacter(card));
		});
	}

	document.addEventListener('activity-filter-changed', syncAfterFilter);

	window.addEventListener('resize', () => {
		syncAfterFilter();
	});

	document.addEventListener('activity-page-shown', () => {
		const target =
			currentCard && !currentCard.classList.contains('card-hidden')
				? currentCard
				: (cards.find((c) => !c.classList.contains('card-hidden')) ?? cards[0]);
		if (target) {
			currentCard = target;
			requestAnimationFrame(() => {
				positionCharacter(target, false, true);
				overlay.classList.add('active');
			});
		}
	});

	const img = overlay.querySelector('img') as HTMLImageElement;
	if (img) {
		const onImgReady = (): void => {
			if (currentCard) positionCharacter(currentCard, false);
		};
		if (img.complete) onImgReady();
		else img.addEventListener('load', onImgReady, { once: true });
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const section = document.querySelector<HTMLElement>('.activity');
	const tabs = document.querySelector<HTMLElement>('.news-tabs');
	const grid = document.getElementById('activity-grid');
	if (!section || !tabs || !grid) return;

	const overlay = document.getElementById('activity-overlay')!;
	const overlayCard = document.getElementById('activity-overlay-card')!;

	function openOverlay(html: string): void {
		overlayCard.innerHTML = html;
		overlay.style.display = '';
		document.body.style.overflow = 'hidden';
	}

	function closeOverlay(): void {
		if (overlay.classList.contains('closing')) return;
		overlay.classList.add('closing');
		overlayCard.classList.add('closing');
		const onAnimEnd = () => {
			overlay.removeEventListener('animationend', onAnimEnd);
			overlay.style.display = 'none';
			overlay.classList.remove('closing');
			overlayCard.classList.remove('closing');
			overlayCard.innerHTML = '';
			document.body.style.overflow = '';
		};
		overlay.addEventListener('animationend', onAnimEnd);
	}

	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) closeOverlay();
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && !overlay.classList.contains('closing') && overlay.style.display !== 'none') closeOverlay();
	});

	async function fetchActivityDetail(activityId: string): Promise<void> {
		const API = window.API_BASE || '';
		try {
			const res = await fetch(API + '/api/activities');
			if (!res.ok) throw new Error('加载失败');
			const activities = await res.json();
		const activity = activities.find((a: any) => a.id === parseInt(activityId));
		if (!activity) { closeOverlay(); return; }

		if (activity.signupStatus === 'active') {
			window.location.href = '/activity/now?activityId=' + activityId;
			return;
		}

			const detailRes = await fetch(API + '/api/activity/' + activity.id + '/detail');
			const detail = await detailRes.json();

			const html = `<div class="activity-overlay-inner">
				<div class="detail-hero">
					<div class="detail-hero-media" style="background-image:url('${activity.image}')"></div>
					<div class="detail-hero-overlay"></div>
					<div class="detail-hero-content">
						<p class="detail-hero-kicker">ACTIVITY DETAIL</p>
						<h1 class="detail-hero-title">${activity.headline}</h1>
						<div class="detail-hero-meta">
							${(activity.tags || '').split(',').filter(Boolean).map((t: string) => `<span class="detail-hero-tag">${t}</span>`).join('')}
							<span class="detail-hero-date">${activity.date}</span>
						</div>
					</div>
				</div>
				<div class="detail-content-card">
					<div class="detail-content">${detail.content || '<p>暂无活动详情内容</p>'}</div>
					<div class="detail-actions">
						<button class="detail-back overlay-close-btn">
							<i class="fas fa-times"></i>
							关闭
						</button>
					</div>
				</div>
			</div>`;

			openOverlay(html);
			overlayCard.querySelectorAll('.overlay-close-btn').forEach((btn) => {
				btn.addEventListener('click', closeOverlay);
			});
		} catch { closeOverlay(); }
	}

	// Bind card clicks
	grid.addEventListener('click', (e) => {
		const card = (e.target as HTMLElement).closest('.news-card');
		if (!card) return;
		e.preventDefault();
		e.stopPropagation();
		const activityId = card.getAttribute('data-activity-id');
		if (!activityId) return;
		fetchActivityDetail(activityId);
	});

	const inputs = Array.from(section.querySelectorAll<HTMLInputElement>('input.news-filter'));
	const labels = Array.from(tabs.querySelectorAll<HTMLElement>('.tab'));
	let currentFilter = 'all';
	let fadeTimer: ReturnType<typeof setTimeout> | null = null;

	const filterMap: Record<string, string> = { all: 'all', online: '线上', offline: '线下', collab: '联动' };
	const getFilterTag = (input: HTMLInputElement): string => filterMap[input.id.replace('filter-', '')] || 'all';

	const getInputByLabel = (label: HTMLElement): HTMLInputElement | null => {
		const id = label.getAttribute('for');
		return id ? section.querySelector<HTMLInputElement>(`#${id}`) : null;
	};

	const applyFilter = (tag: string): void => {
		const cards = Array.from(grid.querySelectorAll<HTMLElement>('.news-card'));
		cards.forEach((card) => {
			const cardTags = card.getAttribute('data-tags') || '';
			if (tag === 'all' || cardTags.split(',').includes(tag)) {
				card.classList.remove('card-hidden');
			} else {
				card.classList.add('card-hidden');
			}
		});
	};

	const filterCards = (tag: string): void => {
		if (tag === currentFilter) return;
		if (fadeTimer) clearTimeout(fadeTimer);

		grid.classList.add('grid-fading');

		fadeTimer = setTimeout(() => {
			applyFilter(tag);
			currentFilter = tag;
			grid.classList.remove('grid-fading');
			fadeTimer = null;
			document.dispatchEvent(new CustomEvent('activity-filter-changed'));
		}, 180);
	};

	const setChecked = (input: HTMLInputElement): void => {
		inputs.forEach((i) => (i.checked = false));
		input.checked = true;

		labels.forEach((l) => l.classList.remove('active'));
		const activeLabel = labels.find((l) => l.getAttribute('for') === input.id);
		if (activeLabel) activeLabel.classList.add('active');

		filterCards(getFilterTag(input));
	};

	const initInput = inputs.find((i) => i.checked) || inputs[0];
	if (initInput) {
		inputs.forEach((i) => (i.checked = false));
		initInput.checked = true;
		labels.forEach((l) => l.classList.remove('active'));
		const initLabel = labels.find((l) => l.getAttribute('for') === initInput.id);
		if (initLabel) initLabel.classList.add('active');
		currentFilter = getFilterTag(initInput);
		applyFilter(currentFilter);
	}

	labels.forEach((label) => {
		label.addEventListener('click', (e) => {
			e.preventDefault();
			const input = getInputByLabel(label);
			if (!input) return;
			setChecked(input);
		});
	});

	tabs.addEventListener('keydown', (e) => {
		const current = inputs.findIndex((i) => i.checked);
		if (current < 0) return;
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			e.preventDefault();
			const delta = e.key === 'ArrowRight' ? 1 : -1;
			const next = (current + delta + inputs.length) % inputs.length;
			setChecked(inputs[next]);
		}
	});

	initActivityCharacter(grid);

	document.addEventListener('activity-cards-loaded', () => {
		initActivityCharacter(grid);
	});
});
