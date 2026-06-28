(function () {
	const dropdown = document.getElementById('dl-sort-dropdown');
	const grid = document.getElementById('dl-grid');
	if (!dropdown || !grid) return;

	const trigger = dropdown.querySelector<HTMLButtonElement>('.dl-dropdown-trigger');
	const label = dropdown.querySelector<HTMLSpanElement>('.dl-dropdown-label');
	const items = dropdown.querySelectorAll<HTMLLIElement>('.dl-dropdown-item');
	const chips = document.querySelectorAll<HTMLButtonElement>('.dl-chip');
	const cards = Array.from(grid.querySelectorAll<HTMLArticleElement>('.dl-card'));
	const prevBtn = document.querySelector<HTMLButtonElement>('.dl-page-btn[data-action="prev"]');
	const nextBtn = document.querySelector<HTMLButtonElement>('.dl-page-btn[data-action="next"]');
	const pageInfo = document.querySelector<HTMLSpanElement>('.dl-page-info');

	const PER_PAGE = 6;

	let currentFilter = 'all';
	let currentSort = 'new';
	let currentPage = 1;

	const toggle = (open?: boolean): void => {
		const willOpen = open ?? !dropdown.classList.contains('open');
		dropdown.classList.toggle('open', willOpen);
		if (trigger) trigger.setAttribute('aria-expanded', String(willOpen));
	};

	const getValue = (card: HTMLElement, key: string): number => {
		const raw = card.dataset[key] || '0';
		const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
		return isNaN(num) ? 0 : num;
	};

	const getFiltered = (): HTMLArticleElement[] => {
		const filtered = cards.filter((c) => currentFilter === 'all' || c.dataset.category === currentFilter);

		filtered.sort((a, b) => {
			switch (currentSort) {
				case 'new':
					return getValue(b, 'date') - getValue(a, 'date');
				case 'old':
					return getValue(a, 'date') - getValue(b, 'date');
				case 'rating':
					return getValue(b, 'rating') - getValue(a, 'rating');
				case 'downloads':
					return getValue(b, 'downloads') - getValue(a, 'downloads');
				default:
					return 0;
			}
		});

		return filtered;
	};

	const render = (): void => {
		const filtered = getFiltered();
		const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
		if (currentPage > totalPages) currentPage = totalPages;
		if (currentPage < 1) currentPage = 1;

		const start = (currentPage - 1) * PER_PAGE;
		const pageItems = filtered.slice(start, start + PER_PAGE);
		const visibleSet = new Set(pageItems);

		cards.forEach((c) => {
			c.style.display = 'none';
			c.style.order = '';
		});

		pageItems.forEach((c, i) => {
			c.style.display = '';
			c.style.order = String(i);
		});

		if (pageInfo) {
			pageInfo.innerHTML = `<b>${currentPage}</b> / ${totalPages}`;
		}
		if (prevBtn) prevBtn.style.visibility = currentPage <= 1 ? 'hidden' : 'visible';
		if (nextBtn) nextBtn.style.visibility = currentPage >= totalPages ? 'hidden' : 'visible';
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
			currentSort = item.dataset.value || 'new';
			currentPage = 1;
			toggle(false);
			render();
		});
	});

	chips.forEach((chip) => {
		chip.addEventListener('click', () => {
			chips.forEach((c) => c.classList.remove('active'));
			chip.classList.add('active');
			currentFilter = chip.dataset.filter || 'all';
			currentPage = 1;
			render();
		});
	});

	prevBtn?.addEventListener('click', () => {
		if (currentPage > 1) {
			currentPage--;
			render();
		}
	});

	nextBtn?.addEventListener('click', () => {
		const totalPages = Math.max(1, Math.ceil(getFiltered().length / PER_PAGE));
		if (currentPage < totalPages) {
			currentPage++;
			render();
		}
	});

	document.addEventListener('click', (e) => {
		if (!dropdown.contains(e.target as Node)) toggle(false);
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') toggle(false);
	});

	render();
})();
