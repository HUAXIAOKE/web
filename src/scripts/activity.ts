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

	const positionCharacter = (card: HTMLElement, leaveTrail: boolean): void => {
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

		overlay.style.top = targetTop + 'px';
		overlay.style.right = targetRight + 'px';
	};

	const moveCharacter = (card: HTMLElement): void => {
		if (currentCard === card) {
			positionCharacter(card, false);
			return;
		}

		const hadCharacter = currentCard !== null;
		currentCard = card;
		overlay.classList.add('active');
		positionCharacter(card, hadCharacter);
	};

	const syncAfterFilter = (): void => {
		const visible = Array.from(grid.querySelectorAll<HTMLElement>('.news-card:not(.card-hidden)'));
		if (!visible.length) return;
		if (!currentCard || currentCard.classList.contains('card-hidden')) {
			moveCharacter(visible[0]);
		} else {
			positionCharacter(currentCard, false);
		}
	};

	const defaultCard = cards.find((c) => !c.classList.contains('card-hidden')) ?? cards[0];
	moveCharacter(defaultCard);

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

	grid.addEventListener('input', () => {
		setTimeout(syncAfterFilter, 200);
	});

	window.addEventListener('resize', () => {
		if (currentCard && !currentCard.classList.contains('card-hidden')) {
			positionCharacter(currentCard, false);
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
