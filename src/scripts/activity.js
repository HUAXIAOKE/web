document.addEventListener('DOMContentLoaded', () => {
	const section = document.querySelector('.activity');
	const tabs = document.querySelector('.news-tabs');
	const grid = document.getElementById('activity-grid');
	if (!section || !tabs || !grid) return;

	const inputs = Array.from(section.querySelectorAll('input.news-filter'));
	const labels = Array.from(tabs.querySelectorAll('.tab'));
	let currentFilter = 'all';
	let animating = false;

	const getFilterType = (input) => input.id.replace('filter-', '');

	const getInputByLabel = (label) => {
		const id = label.getAttribute('for');
		return section.querySelector(`#${id}`);
	};

	const applyFilter = (type) => {
		const cards = Array.from(grid.querySelectorAll('.news-card'));
		cards.forEach((card) => {
			const cardType = card.getAttribute('data-type');
			if (type === 'all' || cardType === type) {
				card.classList.remove('card-hidden');
			} else {
				card.classList.add('card-hidden');
			}
		});
	};

	const filterCards = (type) => {
		if (type === currentFilter || animating) return;
		animating = true;

		grid.classList.add('grid-fading');

		grid.addEventListener(
			'transitionend',
			() => {
				applyFilter(type);
				currentFilter = type;
				grid.classList.remove('grid-fading');
				grid.addEventListener('transitionend', () => { animating = false; }, { once: true });
			},
			{ once: true }
		);
	};

	const setChecked = (input) => {
		inputs.forEach((i) => (i.checked = false));
		input.checked = true;

		labels.forEach((l) => l.classList.remove('active'));
		const activeLabel = labels.find((l) => l.getAttribute('for') === input.id);
		if (activeLabel) activeLabel.classList.add('active');

		filterCards(getFilterType(input));
	};

	const initInput = inputs.find((i) => i.checked) || inputs[0];
	if (initInput) {
		inputs.forEach((i) => (i.checked = false));
		initInput.checked = true;
		labels.forEach((l) => l.classList.remove('active'));
		const initLabel = labels.find((l) => l.getAttribute('for') === initInput.id);
		if (initLabel) initLabel.classList.add('active');
		currentFilter = getFilterType(initInput);
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
});
