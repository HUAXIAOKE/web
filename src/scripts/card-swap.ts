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

function splitChars(container: HTMLElement, text: string): void {
	container.innerHTML = '';
	const sanitized = text.replace(/\n/g, ' ');
	for (let i = 0; i < sanitized.length; i++) {
		const char = sanitized[i];
		const span = document.createElement('span');
		span.className = 'char';
		span.textContent = char === ' ' ? '\u00A0' : char;
		container.appendChild(span);
	}
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

	gsap.set(titleEl.querySelectorAll('.char'), { y: '100%' });

	tl.fromTo(
		titleEl.querySelectorAll('.char'),
		{ y: '100%' },
		{ y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' },
		label
	);
	tl.fromTo(contentEl, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, `${label}+=0.15`);
}

function animateTextOut(
	titleEl: HTMLElement,
	contentEl: HTMLElement,
	tl: gsap.core.Timeline,
	label: string
): void {
	tl.to(titleEl.querySelectorAll('.char'), { y: '-100%', duration: 0.35, stagger: 0.04, ease: 'power3.in' }, label);
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

	const inner = document.createElement('div');
	inner.className = 'cs-container';
	container.appendChild(inner);

	cards.forEach((c) => {
		const card = document.createElement('div');
		card.className = 'cs-card';
		card.innerHTML = `<div class="cs-card-inner">
	<div class="cs-card-small-title">${c.smallTitle}</div>
	<div class="cs-card-img"><img src="${c.image}" alt="${c.smallTitle}" loading="lazy" /></div>
</div>`;
		inner.appendChild(card);
	});

	const refs = Array.from(inner.querySelectorAll<HTMLElement>('.cs-card'));
	const total = refs.length;
	order = Array.from({ length: total }, (_, i) => i);
	refs.forEach((r, i) =>
		placeNow(r, makeSlot(i, DEFAULTS.cardDistance, DEFAULTS.verticalDistance, total), DEFAULTS.skewAmount)
	);

	titleEl.textContent = cards[order[0]].title;
	contentEl.innerHTML = cards[order[0]].content;

	const doSwap = () =>
		swap(refs, cards, total, DEFAULTS.skewAmount, DEFAULTS.cardDistance, DEFAULTS.verticalDistance, DEFAULTS, titleEl, contentEl);
	doSwap();
	intervalRef = window.setInterval(doSwap, DEFAULTS.delay);

	const pause = (): void => {
		tlRef?.pause();
		clearInterval(intervalRef);
	};
	const resume = (): void => {
		tlRef?.play();
		intervalRef = window.setInterval(doSwap, DEFAULTS.delay);
	};
	inner.addEventListener('mouseenter', pause);
	inner.addEventListener('mouseleave', resume);
}

document.addEventListener('DOMContentLoaded', initCardSwap);
