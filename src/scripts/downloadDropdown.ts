(function () {
	const dropdown = document.getElementById('dl-sort-dropdown');
	if (!dropdown) return;

	const trigger = dropdown.querySelector<HTMLButtonElement>('.dl-dropdown-trigger');
	const label = dropdown.querySelector<HTMLSpanElement>('.dl-dropdown-label');
	const items = dropdown.querySelectorAll<HTMLLIElement>('.dl-dropdown-item');

	const toggle = (open?: boolean): void => {
		const willOpen = open ?? !dropdown.classList.contains('open');
		dropdown.classList.toggle('open', willOpen);
		if (trigger) trigger.setAttribute('aria-expanded', String(willOpen));
	};

	trigger?.addEventListener('click', (e) => {
		e.stopPropagation();
		toggle();
	});

	items.forEach((item) => {
		item.addEventListener('click', () => {
			items.forEach((i) => i.classList.remove('active'));
			item.classList.add('active');
			if (label) label.textContent = item.textContent;
			dropdown.dataset.value = item.dataset.value || '';
			toggle(false);
		});
	});

	document.addEventListener('click', (e) => {
		if (!dropdown.contains(e.target as Node)) toggle(false);
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') toggle(false);
	});
})();
