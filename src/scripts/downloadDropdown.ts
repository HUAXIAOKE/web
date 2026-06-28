interface DownloadItem {
	id: number;
	name: string;
	description: string;
	category: string;
	fileUrl: string;
	thumbUrl: string;
	rating: number;
	downloads: number;
	date: string;
	sortOrder: number;
	ratingCount: number;
}

const STAR_PATH = 'M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z';

(function () {
	const dropdown = document.getElementById('dl-sort-dropdown');
	const grid = document.getElementById('dl-grid');
	if (!dropdown || !grid) return;

	const trigger = dropdown.querySelector<HTMLButtonElement>('.dl-dropdown-trigger');
	const label = dropdown.querySelector<HTMLSpanElement>('.dl-dropdown-label');
	const items = dropdown.querySelectorAll<HTMLLIElement>('.dl-dropdown-item');
	const chips = document.querySelectorAll<HTMLButtonElement>('.dl-chip');
	const prevBtn = document.querySelector<HTMLButtonElement>('.dl-page-btn[data-action="prev"]');
	const nextBtn = document.querySelector<HTMLButtonElement>('.dl-page-btn[data-action="next"]');
	const pageInfo = document.querySelector<HTMLSpanElement>('.dl-page-info');

	const API = (window as unknown as { API_BASE?: string }).API_BASE || '';
	const PER_PAGE = 6;
	const RADIUS = 18;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	let currentFilter = 'all';
	let currentSort = 'new';
	let currentPage = 1;
	let cache: DownloadItem[] = [];
	const ratedIds = new Set<number>();
	const ratedScores = new Map<number, number>();

	const toggle = (open?: boolean): void => {
		const willOpen = open ?? !dropdown.classList.contains('open');
		dropdown.classList.toggle('open', willOpen);
		if (trigger) trigger.setAttribute('aria-expanded', String(willOpen));
	};

	const formatDownloads = (n: number): string => {
		if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
		return String(n);
	};

	const formatRating = (r: number): string => {
		if (!r) return '0.0';
		return r.toFixed(1).replace(/\.0$/, '') || '0';
	};

	const isRated = (id: number): boolean => ratedIds.has(id);

	const btnHTML = (d: DownloadItem): string => {
		if (isRated(d.id)) {
			return `<button class="dl-card-btn rating-mode" type="button" data-id="${d.id}">${ratingHTML(d.id, ratedScores.get(d.id))}</button>`;
		}
		return `<button class="dl-card-btn" type="button" data-id="${d.id}"><span class="dl-btn-zh">下载</span> <span class="dl-btn-en">DOWNLOAD</span></button>`;
	};

	const cardHTML = (d: DownloadItem): string => {
		const thumbStyle = d.thumbUrl
			? `background-image:url('${d.thumbUrl}');background-size:cover;background-position:center;`
			: '';
		return `<article class="dl-card" data-id="${d.id}">
			<div class="dl-card-banner">
				<span class="dl-card-tag">NEW</span>
				<div class="dl-card-thumb" style="${thumbStyle}"></div>
				<span class="dl-card-status">● HOT</span>
			</div>
			<div class="dl-card-body">
				<div class="dl-card-handle">@huaxiaoke</div>
				<h3 class="dl-card-name">${d.name}</h3>
				<p class="dl-card-bio">${d.description}</p>
			</div>
			<div class="dl-card-stats">
				<div class="dl-stat"><span class="dl-stat-v">${formatDownloads(d.downloads)}</span><span class="dl-stat-l">下载</span></div>
				<div class="dl-stat"><span class="dl-stat-v">★${formatRating(d.rating)}</span><span class="dl-stat-l">评分</span></div>
				<div class="dl-stat"><span class="dl-stat-v">${(d.date || '').slice(0, 4)}</span><span class="dl-stat-l">日期</span></div>
			</div>
			${btnHTML(d)}
		</article>`;
	};

	const getFiltered = (): DownloadItem[] => {
		const filtered = cache.filter((d) => currentFilter === 'all' || d.category === currentFilter);
		const sorted = [...filtered];
		sorted.sort((a, b) => {
			switch (currentSort) {
				case 'new':
					return (b.date || '').localeCompare(a.date || '');
				case 'old':
					return (a.date || '').localeCompare(b.date || '');
				case 'rating':
					return b.rating - a.rating;
				case 'downloads':
					return b.downloads - a.downloads;
				default:
					return 0;
			}
		});
		return sorted;
	};

	const submitRating = async (id: number, score: number): Promise<void> => {
		try {
			await fetch(`${API}/api/downloads/${id}/rate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ score }),
			});
		} catch {
			/* ignore */
		}
		ratedIds.add(id);
		ratedScores.set(id, score);
		const item = cache.find((d) => d.id === id);
		if (item) {
			const newCount = (item.ratingCount || 0) + 1;
			item.rating = (item.rating * (item.ratingCount || 0) + score) / newCount;
			item.ratingCount = newCount;
		}
		render();
	};

	const bindRating = (btn: HTMLButtonElement, id: number): void => {
		btn.querySelector('.dl-rating')?.addEventListener('click', (e) => e.stopPropagation());
		btn.querySelectorAll<HTMLLabelElement>('.dl-star').forEach((star) => {
			star.addEventListener('mouseenter', () => {
				const score = Number(star.dataset.score);
				btn.querySelectorAll<HTMLLabelElement>('.dl-star').forEach((s) => {
					if (Number(s.dataset.score) >= score) s.classList.add('hover-fill');
					else s.classList.remove('hover-fill');
				});
			});
			star.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				const score = Number(star.dataset.score);
				btn.querySelectorAll<HTMLLabelElement>('.dl-star').forEach((s) => {
					if (Number(s.dataset.score) >= score) s.classList.add('selected');
					else s.classList.remove('selected');
				});
				submitRating(id, score);
			});
		});
		btn.querySelector('.dl-rating')?.addEventListener('mouseleave', () => {
			btn.querySelectorAll<HTMLLabelElement>('.dl-star').forEach((s) => s.classList.remove('hover-fill'));
		});
	};

	const bindCardButtons = (): void => {
		grid.querySelectorAll<HTMLButtonElement>('.dl-card-btn:not(.downloading):not(.rating-mode)').forEach((btn) => {
			btn.addEventListener('click', () => handleDownload(Number(btn.dataset.id), btn));
		});
		grid.querySelectorAll<HTMLButtonElement>('.dl-card-btn.rating-mode').forEach((btn) => {
			bindRating(btn, Number(btn.dataset.id));
		});
	};

	const render = (): void => {
		const filtered = getFiltered();
		const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
		if (currentPage > totalPages) currentPage = totalPages;
		if (currentPage < 1) currentPage = 1;

		const start = (currentPage - 1) * PER_PAGE;
		const pageItems = filtered.slice(start, start + PER_PAGE);

		grid.innerHTML = pageItems.length ? pageItems.map(cardHTML).join('') : '<p style="grid-column:1/-1;text-align:center;color:var(--dl-muted)">暂无资源</p>';

		if (pageInfo) pageInfo.innerHTML = `<b>${currentPage}</b> / ${totalPages}`;
		if (prevBtn) prevBtn.style.visibility = currentPage <= 1 ? 'hidden' : 'visible';
		if (nextBtn) nextBtn.style.visibility = currentPage >= totalPages ? 'hidden' : 'visible';

		bindCardButtons();
	};

	const progressHTML = (): string => {
		const offset = CIRCUMFERENCE;
		return `<span class="dl-btn-progress">
			<svg viewBox="0 0 40 40" preserveAspectRatio="xMidYMid meet">
				<circle cx="20" cy="20" r="${RADIUS}" stroke="var(--dl-muted)" stroke-width="2" fill="none" opacity="0.3" />
				<circle class="dl-btn-circle" cx="20" cy="20" r="${RADIUS}" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${offset}" />
			</svg>
		</span>
		<span class="dl-btn-percent">0%</span>`;
	};

	const updateProgress = (btn: HTMLButtonElement, ratio: number): void => {
		const circle = btn.querySelector<SVGCircleElement>('.dl-btn-circle');
		const percent = btn.querySelector<HTMLSpanElement>('.dl-btn-percent');
		const clamped = Math.min(ratio, 1);
		const offset = CIRCUMFERENCE * (1 - clamped);
		if (circle) circle.style.strokeDashoffset = String(offset);
		if (percent) percent.textContent = Math.round(clamped * 100) + '%';
	};

	const ratingHTML = (id: number, score?: number): string => {
		const sel = score ?? 0;
		let html = '<div class="dl-rating">';
		for (let i = 1; i <= 5; i++) {
			const cls = i <= sel ? 'dl-star selected' : 'dl-star';
			html += `<label class="${cls}" data-id="${id}" data-score="${i}">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path pathLength="360" d="${STAR_PATH}" /></svg>
			</label>`;
		}
		html += '</div>';
		return html;
	};

	const mountRating = (btn: HTMLButtonElement, id: number): void => {
		const newBtn = btn.cloneNode(false) as HTMLButtonElement;
		newBtn.classList.remove('downloading');
		newBtn.classList.add('rating-mode');
		newBtn.disabled = false;
		newBtn.dataset.id = String(id);
		newBtn.innerHTML = ratingHTML(id, ratedScores.get(id));
		btn.replaceWith(newBtn);
		bindRating(newBtn, id);
	};

	const handleDownload = async (id: number, btn: HTMLButtonElement): Promise<void> => {
		const item = cache.find((d) => d.id === id);
		if (!item || btn.classList.contains('downloading')) return;

		btn.disabled = true;
		btn.classList.add('downloading');
		btn.innerHTML = progressHTML();

		try {
			const countRes = await fetch(`${API}/api/downloads/${id}/download`, { method: 'POST' });
			if (!countRes.ok) {
				render();
				return;
			}
			const { fileUrl } = await countRes.json();

			const fileRes = await fetch(`${API}${fileUrl}`);
			if (!fileRes.ok) {
				render();
				return;
			}

			const contentLength = Number(fileRes.headers.get('Content-Length')) || 0;
			const reader = fileRes.body?.getReader();
			const chunks: Uint8Array[] = [];
			let received = 0;

			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					if (value) {
						chunks.push(value);
						received += value.length;
						if (contentLength > 0) {
							updateProgress(btn, received / contentLength);
						}
					}
				}
			}

			updateProgress(btn, 1);

			const blob = new Blob(chunks, { type: fileRes.headers.get('Content-Type') || '' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = item.name || 'download';
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);

			item.downloads += 1;
			mountRating(btn, id);
		} catch {
			render();
		}
	};

	const fetchList = async (): Promise<void> => {
		try {
			const res = await fetch(`${API}/api/downloads?category=all&sort=${currentSort}`);
			if (!res.ok) return;
			cache = await res.json();
			render();
		} catch {
			/* ignore */
		}
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
			fetchList();
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

	fetchList();
})();
