type PageName = 'index' | 'live' | 'gallery' | 'activity' | 'about';

const PAGE_PATHS: Record<PageName, string> = {
	index: '/',
	live: '/live',
	gallery: '/gallery',
	activity: '/activity',
	about: '/about',
};

const PAGE_TITLES: Record<PageName, string> = {
	index: 'Huaxiaoke - \u4E3B\u9875',
	live: 'Huaxiaoke - \u8DB3\u8FF9',
	gallery: 'Huaxiaoke - \u63D2\u753B\u4E00\u89C8',
	activity: 'Huaxiaoke - \u5F53\u671F\u6D3B\u52A8',
	about: 'Huaxiaoke - \u5173\u4E8E\u6211\u4EEC',
};

const PATH_TO_PAGE: Record<string, PageName> = {
	'/': 'index',
	'/live': 'live',
	'/gallery': 'gallery',
	'/activity': 'activity',
	'/about': 'about',
};

class SPANavigation {
	private currentPage: PageName;
	private navLinks: NodeListOf<HTMLAnchorElement>;

	constructor() {
		this.currentPage = PATH_TO_PAGE[window.location.pathname] || 'index';
		this.navLinks = document.querySelectorAll(
			'.nav-sidebar a[data-page], .sm-panel a[data-page]'
		);
		this.init();
	}

	private init(): void {
		this.bindNavEvents();
		this.showCurrentPage();
		this.setActiveNavItem();
	}

	private showCurrentPage(): void {
		document.querySelectorAll<HTMLElement>('[id^="page-"]').forEach((el) => {
			el.style.display = 'none';
		});
		const target = document.getElementById(`page-${this.currentPage}`);
		if (target) {
			target.style.display = 'block';
		}
		this.updatePageTitle(this.currentPage);
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
		if (targetEl) {
			targetEl.style.display = 'block';
		}

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
			case 'gallery':
				setTimeout(() => {
					const gallery = document.querySelector<HTMLElement>('#page-gallery .cards');
					if (gallery && gallery.children.length === 0) {
						window.generateImageCards();
					}
				}, 100);
				break;
			case 'about':
				setTimeout(() => {
					if (typeof (window as any).slideTo === 'function') {
						(window as any).slideTo(1);
					}
				}, 100);
				break;
			case 'activity':
				setTimeout(() => {
					document.dispatchEvent(new CustomEvent('activity-page-shown'));
				}, 50);
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
	const page = PATH_TO_PAGE[window.location.pathname] || 'index';
	document.querySelectorAll<HTMLElement>('[id^="page-"]').forEach((el) => {
		el.style.display = 'none';
	});
	const target = document.getElementById(`page-${page}`);
	if (target) target.style.display = 'block';
	document.title = PAGE_TITLES[page] || 'Huaxiaoke';
});
