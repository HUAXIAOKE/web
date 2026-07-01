type PageName = 'index' | 'live' | 'gallery' | 'activity' | 'about' | 'download';

const PAGE_PATHS: Record<PageName, string> = {
	index: '/',
	live: '/live',
	gallery: '/gallery',
	activity: '/activity',
	about: '/about',
	download: '/download',
};

const PAGE_TITLES: Record<PageName, string> = {
	index: 'Huaxiaoke - \u4E3B\u9875',
	live: 'Huaxiaoke - \u8DB3\u8FF9',
	gallery: 'Huaxiaoke - \u63D2\u753B\u4E00\u89C8',
	activity: 'Huaxiaoke - \u5F53\u671F\u6D3B\u52A8',
	about: 'Huaxiaoke - \u5173\u4E8E\u6211\u4EEC',
	download: 'Huaxiaoke - \u8D44\u6E90\u5206\u4EAB',
};

const PATH_TO_PAGE: Record<string, PageName> = {
	'/': 'index',
	'/live': 'live',
	'/gallery': 'gallery',
	'/activity': 'activity',
	'/about': 'about',
	'/download': 'download',
};

const FLEX_PAGE_IDS = new Set(['page-index', 'page-live', 'page-download']);

function normalizePath(path: string): string {
	let p = path;
	if (p.endsWith('/index.html')) p = p.slice(0, -11) || '/';
	if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
	return p;
}

function findSubRouteParent(path: string): string | undefined {
	return Object.keys(PATH_TO_PAGE)
		.filter((p) => p !== '/')
		.sort((a, b) => b.length - a.length)
		.find((p) => path.startsWith(p + '/') && path.length > p.length + 1);
}

function pageDisplayValue(pageId: string): string {
	return FLEX_PAGE_IDS.has(pageId) ? 'flex' : 'block';
}

function hideAllPages(): void {
	document.querySelectorAll<HTMLElement>('[id^="page-"]').forEach((el) => {
		el.style.display = 'none';
	});
}

function showPageByName(page: PageName): void {
	hideAllPages();
	const target = document.getElementById(`page-${page}`);
	if (target) target.style.display = pageDisplayValue(target.id);
	document.title = PAGE_TITLES[page] || 'Huaxiaoke';
}

class SPANavigation {
	private currentPage: PageName;
	private navLinks: NodeListOf<HTMLAnchorElement>;

	constructor() {
		this.navLinks = document.querySelectorAll(
			'.nav-sidebar a[data-page], .sm-panel a[data-page]'
		);
		const path = normalizePath(window.location.pathname);
		const parentPath = findSubRouteParent(path);
		if (parentPath) {
			this.currentPage = PATH_TO_PAGE[parentPath];
			this.initSubRoute();
			return;
		}
		this.currentPage = PATH_TO_PAGE[path] || 'index';
		this.init();
	}

	private initSubRoute(): void {
		this.setActiveNavItem();
		// Hide all SPA pages on sub-routes
		document.querySelectorAll<HTMLElement>('[id^="page-"]').forEach((el) => {
			el.style.display = 'none';
		});
		// Bind nav links for full navigation (sub-routes use page navigation, not SPA)
		this.bindSubRouteNav();
	}

	private bindSubRouteNav(): void {
		const links = document.querySelectorAll<HTMLAnchorElement>(
			'.nav-sidebar a[data-page], .sm-panel a[data-page]'
		);
		links.forEach((link) => {
			link.addEventListener('click', (e) => {
				const isExternal = link.hasAttribute('target') && link.getAttribute('target') === '_blank';
				if (isExternal) {
					e.preventDefault();
					const targetUrl = link.getAttribute('data-href') || link.getAttribute('href');
					if (targetUrl) window.open(targetUrl, '_blank', 'noopener,noreferrer');
					return;
				}
				e.preventDefault();
				const href = link.getAttribute('href');
				if (href) window.location.href = href;
			});
		});
		// Also handle any detail-back links
		const backLinks = document.querySelectorAll<HTMLAnchorElement>('.detail-back, .detail-signup-link');
		backLinks.forEach((link) => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const href = link.getAttribute('href');
				if (href) window.location.href = href;
			});
		});
	}

	private init(): void {
		this.bindNavEvents();
		this.showCurrentPage();
		this.setActiveNavItem();
	}

	private showCurrentPage(): void {
		showPageByName(this.currentPage);
		this.initializePage(this.currentPage);
	}

	private setActiveNavItem(): void {
		this.navLinks.forEach((link) => {
			const page = link.getAttribute('data-page');
			const navItem = link.closest('.nav-item');
			if (page === this.currentPage) {
				link.classList.add('active');
				if (navItem) navItem.classList.add('active');
			} else {
				link.classList.remove('active');
				if (navItem) navItem.classList.remove('active');
			}
		});
	}

	private updateNavState(link: HTMLAnchorElement, page: PageName): void {
		this.navLinks.forEach((l) => {
			l.classList.remove('active');
			const item = l.closest('.nav-item');
			if (item) item.classList.remove('active');
		});
		link.classList.add('active');
		const navItem = link.closest('.nav-item');
		if (navItem) navItem.classList.add('active');

		const smPanelItems = document.querySelectorAll<HTMLAnchorElement>('.sm-panel a[data-page]');
		smPanelItems.forEach((l) => {
			if (l.getAttribute('data-page') === page) l.classList.add('active');
			else l.classList.remove('active');
		});
	}

	private bindNavEvents(): void {
		this.navLinks.forEach((link) => {
			link.addEventListener('click', (e) => {
				const isExternal = link.hasAttribute('target') && link.getAttribute('target') === '_blank';

				if (isExternal) {
					e.preventDefault();
					const targetUrl = link.getAttribute('data-href') || link.getAttribute('href');
					if (targetUrl) {
						window.open(targetUrl, '_blank', 'noopener,noreferrer');
					}
					return;
				}

				const targetPage = link.getAttribute('data-page') as PageName | null;
				if (!targetPage) return;
				if (targetPage === this.currentPage) {
					e.preventDefault();
					return;
				}

				e.preventDefault();
				this.switchPage(targetPage);
				history.pushState({ page: targetPage }, '', PAGE_PATHS[targetPage]);
			});
		});

		const biliLink = document.querySelector<HTMLAnchorElement>('.nav-bili-link');
		if (biliLink) {
			biliLink.addEventListener('click', (e) => {
				e.preventDefault();
				const targetUrl = biliLink.getAttribute('data-href') || biliLink.getAttribute('href');
				if (targetUrl) {
					window.open(targetUrl, '_blank', 'noopener,noreferrer');
				}
			});
		}
	}

	switchPage(targetPage: PageName): void {
		if (targetPage === this.currentPage) return;

		const currentEl = document.getElementById(`page-${this.currentPage}`);
		if (currentEl) currentEl.style.display = 'none';

		const targetEl = document.getElementById(`page-${targetPage}`);
		if (targetEl) targetEl.style.display = pageDisplayValue(targetEl.id);

		this.currentPage = targetPage;
		this.updatePageTitle(targetPage);
		this.initializePage(targetPage);

		const link = document.querySelector<HTMLAnchorElement>(
			`.nav-sidebar a[data-page="${targetPage}"]`
		) || document.querySelector<HTMLAnchorElement>(
			`.sm-panel a[data-page="${targetPage}"]`
		);
		if (link) this.updateNavState(link, targetPage);
	}

	private initializePage(pageName: PageName): void {
		switch (pageName) {
			case 'index':
				if (typeof window.reloadLive2DModel === 'function') {
					setTimeout(() => window.reloadLive2DModel(), 100);
				}
				break;
			case 'gallery': {
				const galleryEl = document.querySelector<HTMLElement>('#page-gallery .cards');
				if (galleryEl && galleryEl.children.length === 0) {
					window.generateImageCards();
				}
				break;
			}
			case 'about':
				break;
			case 'activity':
				setTimeout(() => {
					document.dispatchEvent(new CustomEvent('activity-page-shown'));
				}, 50);
				break;
			case 'download':
				break;
		}
	}

	private updatePageTitle(pageName: PageName): void {
		document.title = PAGE_TITLES[pageName] || 'Huaxiaoke';
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new SPANavigation();
});

window.addEventListener('popstate', () => {
	const path = normalizePath(window.location.pathname);
	const parentPath = findSubRouteParent(path);
	if (parentPath) {
		hideAllPages();
		document.title = PAGE_TITLES[PATH_TO_PAGE[parentPath]] || 'Huaxiaoke';
		return;
	}
	const page = PATH_TO_PAGE[path] || 'index';
	showPageByName(page);
});
