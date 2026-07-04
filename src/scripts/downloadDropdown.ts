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
	const MIN_COL_WIDTH = 240;
	const MIN_ROW_HEIGHT = 220;

	let perPage = 8;
	let animating = false;

	const EXIT_MS = 200;
	const ENTER_MS = 280;

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

	const formatRating = (r: number): string => r.toFixed(1);

	const isRated = (id: number): boolean => ratedIds.has(id);

	const btnHTML = (d: DownloadItem): string => {
		if (isRated(d.id)) {
			return `<button class="dl-card-btn rating-mode" type="button" data-id="${d.id}">${ratingHTML(d.id, ratedScores.get(d.id))}</button>`;
		}
		return `<button class="dl-card-btn" type="button" data-id="${d.id}"><span class="dl-btn-zh">下载</span> <span class="dl-btn-en">DOWNLOAD</span></button>`;
	};

	const cardHTML = (d: DownloadItem): string => {
		const thumbStyle = d.thumbUrl ? `background-image:url('${d.thumbUrl}');background-size:cover;background-position:center;` : '';
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

	const submitRating = async (id: number, score: number, btn: HTMLButtonElement): Promise<void> => {
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
		const newBtn = grid.querySelector<HTMLButtonElement>(`.dl-card-btn[data-id="${id}"]`);
		if (newBtn) {
			const targetStar = newBtn.querySelector<HTMLLabelElement>(`.dl-star[data-score="${score}"]`);
			if (targetStar) {
				targetStar.classList.add('animate');
				targetStar.addEventListener('animationend', () => targetStar.classList.remove('animate'), { once: true });
			}
		}
	};

	const bindRating = (btn: HTMLButtonElement, id: number): void => {
		btn.querySelector('.dl-rating')?.addEventListener('click', (e) => e.stopPropagation());
		btn.querySelectorAll<HTMLLabelElement>('.dl-star').forEach((star) => {
			star.addEventListener('mouseenter', () => {
				const score = Number(star.dataset.score);
				btn.querySelectorAll<HTMLLabelElement>('.dl-star').forEach((s) => {
					if (Number(s.dataset.score) <= score) s.classList.add('hover-fill');
					else s.classList.remove('hover-fill');
				});
			});
			star.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				const score = Number(star.dataset.score);
				btn.querySelectorAll<HTMLLabelElement>('.dl-star').forEach((s) => {
					if (Number(s.dataset.score) <= score) {
						s.classList.add('selected');
						s.classList.remove('animate');
					} else {
						s.classList.remove('selected', 'animate');
					}
				});
				star.classList.add('animate');
				submitRating(id, score, btn);
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

	const isMobile = (): boolean => window.matchMedia('(max-width: 900px)').matches;
	const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const setPagerLocked = (locked: boolean): void => {
		if (prevBtn) prevBtn.disabled = locked;
		if (nextBtn) nextBtn.disabled = locked;
	};

	const clearAnimateState = (): void => {
		grid.removeAttribute('data-animate');
		animating = false;
		setPagerLocked(false);
	};

	const computeGridLayout = (): number => {
		if (isMobile()) return perPage;

		const w = grid.clientWidth;
		const h = grid.clientHeight;
		if (!w || !h) return perPage;

		const gap = parseFloat(getComputedStyle(grid).gap) || 16;
		const cols = Math.max(1, Math.floor((w + gap) / (MIN_COL_WIDTH + gap)));
		const rows = Math.max(1, Math.floor((h + gap) / (MIN_ROW_HEIGHT + gap)));

		grid.style.setProperty('--dl-cols', String(cols));
		grid.style.setProperty('--dl-rows', String(rows));

		return cols * rows;
	};

	const updateLayout = (): void => {
		if (isMobile()) return;
		const next = computeGridLayout();
		if (next === perPage) return;
		perPage = next;
		const totalPages = Math.max(1, Math.ceil(getFiltered().length / perPage));
		if (currentPage > totalPages) currentPage = totalPages;
		render();
	};

	const render = (options?: { animate?: boolean }): void => {
		const shouldAnimate = (options?.animate ?? false) && !isMobile() && !prefersReducedMotion();

		const filtered = getFiltered();
		let pageItems = filtered;

		if (!isMobile()) {
			const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
			if (currentPage > totalPages) currentPage = totalPages;
			if (currentPage < 1) currentPage = 1;
			const start = (currentPage - 1) * perPage;
			pageItems = filtered.slice(start, start + perPage);
			if (pageInfo) pageInfo.innerHTML = `<b>${currentPage}</b> / ${totalPages}`;
			if (prevBtn) prevBtn.style.visibility = currentPage <= 1 ? 'hidden' : 'visible';
			if (nextBtn) nextBtn.style.visibility = currentPage >= totalPages ? 'hidden' : 'visible';
		}

		const html = pageItems.length ? pageItems.map(cardHTML).join('') : '<div class="dl-empty">暂无资源</div>';

		const mount = (): void => {
			grid.innerHTML = html;
			bindCardButtons();
			if (shouldAnimate && pageItems.length) {
				animating = true;
				setPagerLocked(true);
				grid.setAttribute('data-animate', 'in');
				window.setTimeout(clearAnimateState, ENTER_MS + 20);
			} else {
				clearAnimateState();
			}
		};

		if (shouldAnimate && grid.querySelector('.dl-card') && !animating) {
			animating = true;
			setPagerLocked(true);
			grid.setAttribute('data-animate', 'out');
			window.setTimeout(mount, EXIT_MS);
			return;
		}

		mount();
	};

	const progressHTML = (): string => {
		return `<svg class="dl-progress-svg" preserveAspectRatio="none">
			<path class="dl-progress-bg" stroke="var(--dl-muted)" fill="none" opacity="0.3" stroke-linejoin="miter" vector-effect="non-scaling-stroke" />
			<path class="dl-progress-fg" stroke="var(--dl-accent)" fill="none" pathLength="100" stroke-linecap="butt" stroke-linejoin="miter" vector-effect="non-scaling-stroke" />
		</svg>
		<span class="dl-btn-percent">0%</span>`;
	};

	const initProgressSvg = (btn: HTMLButtonElement): void => {
		const w = btn.clientWidth;
		const h = btn.clientHeight;
		if (!w || !h) return;
		const stroke = 3;
		const pad = stroke / 2;
		const cx = w / 2;
		const d = `M ${cx} ${pad} L ${w - pad} ${pad} L ${w - pad} ${h - pad} L ${pad} ${h - pad} L ${pad} ${pad} L ${cx} ${pad}`;
		const svg = btn.querySelector<SVGSVGElement>('.dl-progress-svg');
		if (!svg) return;
		svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
		svg.querySelectorAll<SVGPathElement>('path').forEach((p) => {
			p.setAttribute('d', d);
			p.setAttribute('stroke-width', String(stroke));
		});
		const fg = svg.querySelector<SVGPathElement>('.dl-progress-fg');
		if (fg) {
			fg.style.strokeDasharray = '100';
			fg.style.strokeDashoffset = '100';
		}
	};

	const updateProgress = (btn: HTMLButtonElement, ratio: number): void => {
		const fg = btn.querySelector<SVGPathElement>('.dl-progress-fg');
		const percent = btn.querySelector<HTMLSpanElement>('.dl-btn-percent');
		const clamped = Math.min(Math.max(ratio, 0), 1);
		const display = Math.round(clamped * 100);
		if (fg) fg.style.strokeDashoffset = String(100 - clamped * 100);
		if (percent) percent.textContent = display + '%';
	};

	const beginDownloadUI = (btn: HTMLButtonElement): void => {
		btn.disabled = true;
		btn.style.opacity = '0';
		btn.style.transition = 'opacity 0.15s ease';
		requestAnimationFrame(() => {
			btn.classList.add('downloading');
			btn.innerHTML = progressHTML();
			initProgressSvg(btn);
			updateProgress(btn, 0);
			btn.style.opacity = '1';
		});
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
		ratedIds.add(id);
		btn.style.opacity = '0';
		btn.style.transition = 'opacity 0.25s ease, background 0.25s ease';
		setTimeout(() => {
			const newBtn = btn.cloneNode(false) as HTMLButtonElement;
			newBtn.classList.remove('downloading');
			newBtn.classList.add('rating-mode');
			newBtn.disabled = false;
			newBtn.dataset.id = String(id);
			newBtn.innerHTML = ratingHTML(id, ratedScores.get(id));
			btn.replaceWith(newBtn);
			requestAnimationFrame(() => {
				newBtn.style.opacity = '1';
				newBtn.style.transition = 'opacity 0.25s ease, background 0.25s ease';
				bindRating(newBtn, id);
			});
		}, 200);
	};

	const handleDownload = async (id: number, btn: HTMLButtonElement): Promise<void> => {
		const item = cache.find((d) => d.id === id);
		if (!item || btn.classList.contains('downloading')) return;

		beginDownloadUI(btn);

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
						if (contentLength > 0) updateProgress(btn, received / contentLength);
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
			await new Promise((r) => setTimeout(r, 250));
			mountRating(btn, id);
		} catch {
			render();
		}
	};

	const fetchList = async (animate = false): Promise<void> => {
		try {
			const res = await fetch(`${API}/api/downloads?category=all&sort=${currentSort}`);
			if (!res.ok) return;
			cache = await res.json();
			render(animate ? { animate: true } : undefined);
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
			if (animating) return;
			items.forEach((i) => i.classList.remove('active'));
			item.classList.add('active');
			if (label) label.textContent = item.textContent;
			currentSort = item.dataset.value || 'new';
			currentPage = 1;
			toggle(false);
			fetchList(true);
		});
	});

	chips.forEach((chip) => {
		chip.addEventListener('click', () => {
			if (animating) return;
			chips.forEach((c) => c.classList.remove('active'));
			chip.classList.add('active');
			currentFilter = chip.dataset.filter || 'all';
			currentPage = 1;
			render({ animate: true });
		});
	});

	prevBtn?.addEventListener('click', () => {
		if (animating || currentPage <= 1) return;
		currentPage--;
		render({ animate: true });
	});

	nextBtn?.addEventListener('click', () => {
		if (animating) return;
		const totalPages = Math.max(1, Math.ceil(getFiltered().length / perPage));
		if (currentPage < totalPages) {
			currentPage++;
			render({ animate: true });
		}
	});

	const layoutObserver = new ResizeObserver(() => updateLayout());
	layoutObserver.observe(grid);
	document.addEventListener('download-page-shown', updateLayout);
	window.matchMedia('(max-width: 900px)').addEventListener('change', () => {
		if (isMobile()) {
			currentPage = 1;
		} else {
			updateLayout();
		}
		render();
	});

	document.addEventListener('click', (e) => {
		if (!dropdown.contains(e.target as Node)) toggle(false);
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') toggle(false);
	});

	fetchList();
})();
