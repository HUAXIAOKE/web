import { gsap } from 'gsap';

interface StaggeredMenuState {
	open: boolean;
	busy: boolean;
}

function initStaggeredMenu(): void {
	const wrapper = document.querySelector<HTMLElement>('.sm-wrapper');
	const panel = document.getElementById('sm-panel');
	const toggle = document.querySelector<HTMLButtonElement>('.sm-toggle');
	const prelayers = Array.from(document.querySelectorAll('.sm-prelayer'));
	const itemLabels = Array.from(document.querySelectorAll('.sm-panel-itemLabel'));
	const itemWraps = Array.from(document.querySelectorAll('.sm-panel-itemWrap'));
	const socialTitle = document.querySelector<HTMLElement>('.sm-socials-title');
	const socialLinks = Array.from(document.querySelectorAll('.sm-socials-link'));
	const icon = document.querySelector<HTMLElement>('.sm-icon');
	const textInner = document.querySelector<HTMLElement>('.sm-toggle-textInner');

	if (!wrapper || !panel || !toggle || !icon || !textInner) return;

	const state: StaggeredMenuState = { open: false, busy: false };
	let openTimeline: gsap.core.Timeline | null = null;
	let closeTween: gsap.core.Tween | null = null;

	const offscreen = 100;
	gsap.set([panel, ...prelayers], { xPercent: offscreen });
	gsap.set(itemLabels, { yPercent: 140, rotate: 10 });
	gsap.set(itemWraps, { '--sm-num-opacity': 0 } as any);
	if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
	if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

	function openMenu(): void {
		if (state.busy) return;
		state.busy = true;

		openTimeline?.kill();
		closeTween?.kill();

		gsap.set(itemLabels, { yPercent: 140, rotate: 10 });
		gsap.set(itemWraps, { '--sm-num-opacity': 0 } as any);
		if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
		if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

		gsap.set(panel, { display: '' });
		panel.setAttribute('aria-hidden', 'false');

		gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out' });
		gsap.to(textInner, { yPercent: -50, duration: 0.4, ease: 'power2.out' });

		const tl = gsap.timeline({
			onComplete: () => {
				state.busy = false;
			},
		});

		openTimeline = tl;

		prelayers.forEach((layer, i) => {
			tl.fromTo(layer, { xPercent: offscreen }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
		});

		const lastLayerTime = (prelayers.length - 1) * 0.07;
		const panelStart = lastLayerTime + 0.08;

		tl.fromTo(
			panel,
			{ xPercent: offscreen },
			{ xPercent: 0, duration: 0.65, ease: 'power4.out' },
			panelStart
		);

		if (itemLabels.length) {
			const itemsStart = panelStart + 0.15 * 0.65;
			tl.to(
				itemLabels,
				{ yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1, from: 'start' } },
				itemsStart
			);
			if (itemWraps.length) {
				tl.to(
					itemWraps,
					{ duration: 0.6, ease: 'power2.out', '--sm-num-opacity': 1, stagger: { each: 0.08, from: 'start' } } as any,
					itemsStart + 0.1
				);
			}
		}

		if (socialTitle || socialLinks.length) {
			const socialsStart = panelStart + 0.4 * 0.65;
			if (socialTitle) {
				tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
			}
			if (socialLinks.length) {
				tl.to(
					socialLinks,
					{ y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: { each: 0.08 } },
					socialsStart + 0.04
				);
			}
		}
	}

	function closeMenu(): void {
		openTimeline?.kill();
		openTimeline = null;
		closeTween?.kill();

		const all = [...prelayers, panel] as HTMLElement[];
		closeTween = gsap.to(all, {
			xPercent: offscreen,
			duration: 0.32,
			ease: 'power3.in',
			overwrite: 'auto',
			onComplete: () => {
				gsap.set(itemLabels, { yPercent: 140, rotate: 10 });
				gsap.set(itemWraps, { '--sm-num-opacity': 0 } as any);
				if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
				if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
				panel.setAttribute('aria-hidden', 'true');
				state.busy = false;
			},
		});
		gsap.to(textInner, { yPercent: 0, duration: 0.35, ease: 'power3.inOut' });
		gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut' });
	}

	toggle.addEventListener('click', () => {
		state.open = !state.open;
		toggle.setAttribute('aria-expanded', String(state.open));
		if (state.open) {
			openMenu();
		} else {
			closeMenu();
		}
	});

	document.addEventListener('mousedown', (e) => {
		if (!state.open) return;
		const target = e.target as Node;
		if (!panel.contains(target) && !toggle.contains(target)) {
			state.open = false;
			toggle.setAttribute('aria-expanded', 'false');
			closeMenu();
		}
	});

	panel.querySelectorAll('a[data-page]').forEach((link) => {
		link.addEventListener('click', () => {
			state.open = false;
			toggle.setAttribute('aria-expanded', 'false');
			closeMenu();
		});
	});
}

document.addEventListener('DOMContentLoaded', initStaggeredMenu);
