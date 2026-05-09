interface ActivityItem {
	tags: string;
	date: string;
	headline: string;
	excerpt: string;
	href: string;
	image: string;
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

	// 临时关闭活动卡片跳转，后续再恢复
	grid.addEventListener('click', (e) => {
		const card = (e.target as HTMLElement).closest('.news-card');
		if (!card) return;
		e.preventDefault();
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
});
