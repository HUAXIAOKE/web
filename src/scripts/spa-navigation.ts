type PageName = 'index' | 'live' | 'gallery' | 'activity' | 'about';

const PAGE_PATHS: Record<PageName, string> = {
	index: '/',
	live: '/live',
	gallery: '/gallery',
	activity: '/activity',
	about: '/about',
};

const PAGE_TITLES: Record<PageName, string> = {
	index: 'Huaxiaoke - 主页',
	live: 'Huaxiaoke - 足迹',
	gallery: 'Huaxiaoke - 插画一览',
	activity: 'Huaxiaoke - 当期活动',
	about: 'Huaxiaoke - 关于我们',
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
	private slide1: HTMLElement | null;
	private slide2: HTMLElement | null;
	private hamburger: HTMLElement | null;
	private mobileMenu: HTMLElement | null;

	constructor() {
		this.currentPage = PATH_TO_PAGE[window.location.pathname] || 'index';
		this.navLinks = document.querySelectorAll('#nav a, #nav-mobile a');
		this.slide1 = document.querySelector('#nav .slide1');
		this.slide2 = document.querySelector('#nav .slide2');
		this.hamburger = document.getElementById('nav-hamburger');
		this.mobileMenu = document.getElementById('nav-mobile');
		this.init();
	}

	private init(): void {
		this.bindNavEvents();
		this.bindMobileMenu();
		this.initSlideAnimation();
		this.showCurrentPage();
	}

	private resetScroll(): void {
		window.scrollTo(0, 0);
	}

	private showCurrentPage(): void {
		document.querySelectorAll<HTMLElement>('[id^="page-"]').forEach((el) => {
			el.style.display = 'none';
		});
		const target = document.getElementById(`page-${this.currentPage}`);
		if (target) {
			target.style.display = 'block';
		}
		this.resetScroll();
		this.initializePage(this.currentPage);
		this.updatePageTitle(this.currentPage);
	}

	private moveSlide(target: HTMLElement, slide: HTMLElement): void {
		const parent = target.parentElement as HTMLElement;
		slide.style.opacity = '1';
		slide.style.left = parent.offsetLeft + 'px';
		slide.style.width = parent.offsetWidth + 'px';
	}

	private bindMobileMenu(): void {
		if (!this.hamburger || !this.mobileMenu) return;

		this.hamburger.addEventListener('click', () => {
			const expanded = this.hamburger!.getAttribute('aria-expanded') === 'true';
			this.hamburger!.setAttribute('aria-expanded', String(!expanded));
			this.mobileMenu!.classList.toggle('open');
		});

		this.mobileMenu.querySelectorAll('a').forEach((link) => {
			link.addEventListener('click', () => {
				this.hamburger!.setAttribute('aria-expanded', 'false');
				this.mobileMenu!.classList.remove('open');
			});
		});
	}

	private bindNavEvents(): void {
		this.navLinks.forEach((link) => {
			const isDesktop = link.closest('#nav');

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

				const newPath = PAGE_PATHS[targetPage];
				history.pushState({ page: targetPage }, '', newPath);

				if (isDesktop && this.slide1) {
					this.moveSlide(link, this.slide1);
				}
			});

			if (isDesktop) {
				link.addEventListener('mouseover', () => {
					if (this.slide2) {
						this.moveSlide(link, this.slide2);
						this.slide2.classList.add('squeeze');
					}
				});

				link.addEventListener('mouseout', () => {
					if (this.slide2) {
						this.slide2.style.opacity = '0';
						this.slide2.classList.remove('squeeze');
					}
				});
			}
		});
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
		this.resetScroll();
		this.initializePage(targetPage);
		this.updatePageTitle(targetPage);
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

	private initSlideAnimation(): void {
		if (this.slide1) this.slide1.style.opacity = '0';
		if (this.slide2) this.slide2.style.opacity = '0';
		this.setActiveByPath();
	}

	private setActiveByPath(): void {
		const navIndex =
			this.currentPage === 'index'
				? 3
				: this.currentPage === 'live'
					? 4
					: this.currentPage === 'gallery'
						? 5
						: this.currentPage === 'activity'
							? 6
							: 7;

		const activeNavItem = document.querySelector<HTMLElement>(`#nav li:nth-of-type(${navIndex})`);
		if (activeNavItem && this.slide1) {
			this.slide1.style.opacity = '1';
			this.slide1.style.left = activeNavItem.offsetLeft + 'px';
			this.slide1.style.width = activeNavItem.offsetWidth + 'px';
			document.querySelectorAll('#nav a').forEach((link) => link.classList.remove('active'));
			const activeLink = activeNavItem.querySelector('a');
			if (activeLink) activeLink.classList.add('active');
		}
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
	window.scrollTo(0, 0);
});
