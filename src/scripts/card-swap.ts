import { gsap } from 'gsap';

interface AboutCard {
	id: number;
	smallTitle: string;
	title: string;
	content: string;
	image: string;
}

interface Slot {
	x: number;
	y: number;
	z: number;
	zIndex: number;
}

const DEFAULTS = {
	cardDistance: 60,
	verticalDistance: 100,
	delay: 7000,
	skewAmount: 6,
	durDrop: 2,
	durMove: 2,
	durReturn: 2,
	promoteOverlap: 0.9,
	returnDelay: 0.05,
	ease: 'elastic.out(0.6,0.9)',
};

const makeSlot = (i: number, distX: number, distY: number, total: number): Slot => ({
	x: i * distX,
	y: -i * distY,
	z: -i * distX * 1.5,
	zIndex: total - i,
});

const placeNow = (el: HTMLElement, slot: Slot, skew: number): void => {
	gsap.set(el, {
		x: slot.x,
		y: slot.y,
		z: slot.z,
		xPercent: -50,
		yPercent: -50,
		skewY: skew,
		transformOrigin: 'center center',
		zIndex: slot.zIndex,
		force3D: true,
	});
};

let tlRef: gsap.core.Timeline | null = null;
let intervalRef: number = 0;
let order: number[] = [];
let pauseCarousel: (() => void) | null = null;
let resumeCarousel: (() => void) | null = null;

function splitChars(container: HTMLElement, text: string): void {
	const sanitized = text.replace(/\n/g, ' ');
	const frag = document.createDocumentFragment();
	for (let i = 0; i < sanitized.length; i++) {
		const span = document.createElement('span');
		span.className = 'char';
		span.textContent = sanitized[i] === ' ' ? '\u00A0' : sanitized[i];
		frag.appendChild(span);
	}
	container.innerHTML = '';
	container.appendChild(frag);
}

function animateTextIn(
	titleEl: HTMLElement,
	contentEl: HTMLElement,
	textTitle: string,
	textContent: string,
	tl: gsap.core.Timeline,
	label: string
): void {
	splitChars(titleEl, textTitle);
	contentEl.innerHTML = textContent;

	const chars = Array.from(titleEl.querySelectorAll('.char'));
	if (chars.length) {
		gsap.set(chars, { y: '100%' });
		tl.fromTo(chars, { y: '100%' }, { y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, label);
	}
	tl.fromTo(contentEl, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, `${label}+=0.15`);
}

function animateTextOut(
	titleEl: HTMLElement,
	contentEl: HTMLElement,
	tl: gsap.core.Timeline,
	label: string
): void {
	const chars = Array.from(titleEl.querySelectorAll('.char'));
	if (chars.length) {
		tl.to(chars, { y: '-100%', duration: 0.35, stagger: 0.04, ease: 'power3.in' }, label);
	}
	tl.to(contentEl, { y: -15, opacity: 0, duration: 0.2, ease: 'power2.in' }, label);
}

const swap = (
	refs: HTMLElement[],
	cards: AboutCard[],
	cardsLen: number,
	skew: number,
	distX: number,
	distY: number,
	cfg: typeof DEFAULTS,
	titleEl: HTMLElement,
	contentEl: HTMLElement
): void => {
	if (order.length < 2) return;
	const [front, ...rest] = order;
	const elFront = refs[front];
	if (!elFront) return;
	const tl = gsap.timeline();
	tlRef = tl;

	tl.to(elFront, { y: '+=500', duration: cfg.durDrop, ease: cfg.ease });

	tl.addLabel('promote', `-=${cfg.durDrop * cfg.promoteOverlap}`);
	rest.forEach((idx, i) => {
		const el = refs[idx];
		if (!el) return;
		const slot = makeSlot(i, distX, distY, cardsLen);
		tl.set(el, { zIndex: slot.zIndex }, 'promote');
		tl.to(
			el,
			{ x: slot.x, y: slot.y, z: slot.z, duration: cfg.durMove, ease: cfg.ease },
			`promote+=${i * 0.15}`
		);
	});

	const nextIdx = rest[0];
	animateTextOut(titleEl, contentEl, tl, 'promote');
	animateTextIn(titleEl, contentEl, cards[nextIdx].title, cards[nextIdx].content, tl, 'promote+=0.1');

	const backSlot = makeSlot(cardsLen - 1, distX, distY, cardsLen);
	tl.addLabel('return', `promote+=${cfg.durMove * cfg.returnDelay}`);
	tl.call(() => gsap.set(elFront, { zIndex: backSlot.zIndex }), undefined, 'return');
	tl.to(
		elFront,
		{ x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: cfg.durReturn, ease: cfg.ease },
		'return'
	);

	tl.call(() => {
		order = [...rest, front];
	});
};

async function initDesktop(
	cards: AboutCard[],
	container: HTMLElement,
	titleEl: HTMLElement,
	contentEl: HTMLElement
): Promise<void> {
	const inner = document.createElement('div');
	inner.className = 'cs-container';
	container.appendChild(inner);

	cards.forEach((c) => {
		const card = document.createElement('div');
		card.className = 'cs-card';
		card.innerHTML = `<div class="cs-card-inner">
	<div class="cs-card-small-title">${c.smallTitle}</div>
	<div class="cs-card-img"><img src="${c.image}" alt="${c.smallTitle}" loading="lazy" draggable="false" /></div>
</div>`;
		inner.appendChild(card);
	});

	const refs = Array.from(inner.querySelectorAll<HTMLElement>('.cs-card'));
	const total = refs.length;
	order = Array.from({ length: total }, (_, i) => i);
	refs.forEach((r, i) =>
		placeNow(r, makeSlot(i, DEFAULTS.cardDistance, DEFAULTS.verticalDistance, total), DEFAULTS.skewAmount)
	);

	splitChars(titleEl, cards[order[0]].title);
	contentEl.innerHTML = cards[order[0]].content;
	const initChars = Array.from(titleEl.querySelectorAll('.char'));
	if (initChars.length) gsap.set(initChars, { y: 0 });
	gsap.set(contentEl, { y: 0, opacity: 1 });

	const doSwap = () =>
		swap(refs, cards, total, DEFAULTS.skewAmount, DEFAULTS.cardDistance, DEFAULTS.verticalDistance, DEFAULTS, titleEl, contentEl);
	doSwap();
	intervalRef = window.setInterval(doSwap, DEFAULTS.delay);

	const pause = (): void => {
		tlRef?.pause();
		clearInterval(intervalRef);
	};
	const resume = (): void => {
		clearInterval(intervalRef);
		tlRef?.play();
		intervalRef = window.setInterval(doSwap, DEFAULTS.delay);
	};
	pauseCarousel = pause;
	resumeCarousel = resume;
	inner.addEventListener('mouseenter', pause);
	inner.addEventListener('mouseleave', resume);
}

function initMobile(
	cards: AboutCard[],
	container: HTMLElement,
	titleEl: HTMLElement,
	contentEl: HTMLElement
): void {
	const inner = document.createElement('div');
	inner.className = 'cs-container';
	container.appendChild(inner);

	cards.forEach((c) => {
		const card = document.createElement('div');
		card.className = 'cs-card';
		card.innerHTML = `<div class="cs-card-inner">
	<div class="cs-card-small-title">${c.smallTitle}</div>
	<div class="cs-card-img"><img src="${c.image}" alt="${c.smallTitle}" loading="lazy" draggable="false" /></div>
</div>`;
		inner.appendChild(card);
	});

	const dotsWrap = document.createElement('div');
	dotsWrap.className = 'about-dots';
	const dots: HTMLElement[] = [];
	cards.forEach((_, i) => {
		const dot = document.createElement('div');
		dot.className = 'about-dot';
		if (i === 0) dot.classList.add('active');
		dotsWrap.appendChild(dot);
		dots.push(dot);
	});
	container.parentElement!.appendChild(dotsWrap);

	const refs = Array.from(inner.querySelectorAll<HTMLElement>('.cs-card'));
	const total = cards.length;
	let currentIdx = 0;
	let isAnimating = false;

	refs.forEach((r, i) => {
		r.style.opacity = i === 0 ? '1' : '0';
		r.style.pointerEvents = i === 0 ? 'auto' : 'none';
	});

	const updateText = (card: AboutCard): void => {
		splitChars(titleEl, card.title);
		contentEl.innerHTML = card.content;

		const chars = Array.from(titleEl.querySelectorAll('.char'));
		if (chars.length) {
			gsap.set(chars, { y: '100%' });
			gsap.to(chars, {
				y: 0,
				duration: 0.35,
				stagger: 0.035,
				ease: 'power3.out',
			});
		}
		gsap.set(contentEl, { y: 20, opacity: 0 });
		gsap.to(contentEl, {
			y: 0,
			opacity: 1,
			duration: 0.3,
			ease: 'power2.out',
			delay: 0.08,
		});
	};

	const slideTo = (idx: number, direction: 'next' | 'prev'): void => {
		if (isAnimating) return;
		const prevIdx = currentIdx;
		currentIdx = idx;
		isAnimating = true;

		const cur = refs[prevIdx];
		const next = refs[idx];

		gsap.killTweensOf([cur, next]);
		next.style.pointerEvents = 'auto';
		next.style.opacity = '1';

		const outX = direction === 'next' ? '-30%' : '30%';
		const inX = direction === 'next' ? '30%' : '-30%';

		gsap.set(next, { x: inX });
		gsap.to(cur, {
			x: outX,
			opacity: 0,
			duration: 0.35,
			ease: 'power3.in',
			onComplete: () => {
				cur.style.opacity = '0';
				cur.style.pointerEvents = 'none';
				gsap.set(cur, { x: 0 });
			},
		});
		gsap.to(next, {
			x: 0,
			duration: 0.35,
			ease: 'power3.out',
			onComplete: () => {
				isAnimating = false;
			},
		});

		dots.forEach((d, i) => d.classList.toggle('active', i === idx));
		updateText(cards[idx]);
	};

	const goNext = (): void => {
		const next = currentIdx >= total - 1 ? 0 : currentIdx + 1;
		slideTo(next, 'next');
	};

	let startX = 0;
	let tracking = false;

	container.addEventListener('touchstart', (e) => {
		if (e.touches.length !== 1) return;
		startX = e.touches[0].clientX;
		tracking = true;
		clearInterval(intervalRef);
	});

	container.addEventListener('touchmove', (e) => {
		if (!tracking) return;
		e.preventDefault();
	}, { passive: false });

	container.addEventListener('touchend', (e) => {
		if (!tracking) return;
		tracking = false;
		const dx = e.changedTouches[0].clientX - startX;
		if (Math.abs(dx) < 40) {
			scheduleAdvance();
			return;
		}
		if (dx < 0 || dx > 0) goNext();
		scheduleAdvance();
	});

	const scheduleAdvance = (): void => {
		clearInterval(intervalRef);
		intervalRef = window.setInterval(goNext, DEFAULTS.delay);
	};

	const pause = (): void => clearInterval(intervalRef);
	const resume = (): void => scheduleAdvance();
	pauseCarousel = pause;
	resumeCarousel = resume;

	updateText(cards[0]);
	scheduleAdvance();
}

async function initCardSwap(): Promise<void> {
	const container = document.querySelector<HTMLElement>('#page-about .about-stage');
	const titleEl = document.getElementById('about-text-title');
	const contentEl = document.getElementById('about-text-content');
	if (!container || !titleEl || !contentEl) return;

	let cards: AboutCard[] = [];
	try {
		const apiBase = (window as any).API_BASE || '';
		const res = await fetch(`${apiBase}/api/about`);
		const data = await res.json();
		cards = data.cards || [];
	} catch (e) {
		return;
	}
	if (cards.length === 0) return;

	if (window.innerWidth <= 768) {
		initMobile(cards, container, titleEl, contentEl);
	} else {
		initDesktop(cards, container, titleEl, contentEl);
	}

	const aboutPage = document.getElementById('page-about');
	if (aboutPage && pauseCarousel && resumeCarousel) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) resumeCarousel!();
					else pauseCarousel!();
				});
			},
			{ threshold: 0 }
		);
		observer.observe(aboutPage);
		if (getComputedStyle(aboutPage).display === 'none') pauseCarousel!();
	}
}

document.addEventListener('DOMContentLoaded', initCardSwap);
