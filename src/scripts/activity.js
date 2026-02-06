document.addEventListener('DOMContentLoaded', () => {
	const tabs = document.querySelector('.news-tabs');
	if (!tabs) return;

	let ink = tabs.querySelector('.tab-indicator');
	if (!ink) {
		ink = document.createElement('span');
		ink.className = 'tab-indicator';
		tabs.appendChild(ink);
	}

	const inputs = Array.from(tabs.querySelectorAll('input.news-filter'));
	const labels = Array.from(tabs.querySelectorAll('.tab'));

	const getInputByLabel = (label) => {
		const id = label.getAttribute('for');
		return tabs.querySelector(`#${id}`);
	};

	const moveInkTo = (label) => {
		const rect = label.getBoundingClientRect();
		const host = tabs.getBoundingClientRect();
		const pad = 12;
		const width = Math.max(32, rect.width - pad * 2);
		const x = rect.left - host.left + pad;

		ink.style.width = `${width}px`;
		ink.style.transform = `translateX(${x}px)`;
	};

	const setChecked = (input) => {
		inputs.forEach((i) => (i.checked = false));
		input.checked = true;
		const label = labels.find((l) => l.getAttribute('for') === input.id);
		if (label) moveInkTo(label);
	};

	const initInput = inputs.find((i) => i.checked) || inputs[0];
	if (initInput) setChecked(initInput);

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

	window.addEventListener('resize', () => {
		const current = inputs.find((i) => i.checked);
		if (!current) return;
		const label = labels.find((l) => l.getAttribute('for') === current.id);
		if (label) moveInkTo(label);
	});
});
