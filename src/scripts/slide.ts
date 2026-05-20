type SlideNumber = number;

let chosenSlideNumber: SlideNumber = 1;
let offset = 0;
let barOffset = 0;

const drawerBtns = Array.from(document.querySelectorAll<HTMLElement>('.drawer-btn'));
drawerBtns.forEach((btn, index) => {
	btn.addEventListener('mouseenter', () => {
		slideTo(index + 1);
	});
});

function slideTo(slideNumber: SlideNumber): void {
	if (slideNumber === chosenSlideNumber) return;

	drawerboxToggle(slideNumber);
	drawerbtnToggle(slideNumber);

	const previousSlideNumber = chosenSlideNumber;
	chosenSlideNumber = slideNumber;
	offset += (chosenSlideNumber - previousSlideNumber) * -100;
	barOffset += (chosenSlideNumber - previousSlideNumber) * 100;
	barSlide(barOffset);

	const slides = document.querySelectorAll<HTMLElement>('#page-about #card-section .card');
	Array.from(slides).forEach((slide) => {
		slide.style.transform = `translateY(${offset}%)`;
	});
}

function drawerboxToggle(drawerboxNumber: SlideNumber): void {
	const prevDrawerboxNumber = chosenSlideNumber;
	const drawerboxes = document.querySelectorAll<HTMLElement>('.drawerbox');
	drawerboxes[prevDrawerboxNumber - 1].classList.remove('active');
	drawerboxes[drawerboxNumber - 1].classList.add('active');
}

function drawerbtnToggle(drawerBtnNumber: SlideNumber): void {
	const prevDrawerBtnNumber = chosenSlideNumber;
	const drawerBtns = document.querySelectorAll<HTMLElement>('.drawer-btn');
	drawerBtns[prevDrawerBtnNumber - 1].classList.remove('active');
	drawerBtns[drawerBtnNumber - 1].classList.add('active');
}

function barSlide(barOffset: number): void {
	const bar = document.querySelector<HTMLElement>('#bar')!;
	bar.style.transform = `translateY(${barOffset}%)`;
}

(window as any).slideTo = slideTo;

function initSwipe(): void {
	const slideSection = document.getElementById('slide-section');
	if (!slideSection) return;
	let startY = 0;
	let startX = 0;
	let tracking = false;
	const TH = 50;
	slideSection.addEventListener(
		'touchstart',
		(e) => {
			if (e.touches.length !== 1) return;
			startY = e.touches[0].clientY;
			startX = e.touches[0].clientX;
			tracking = true;
		},
		{ passive: true },
	);
	slideSection.addEventListener(
		'touchend',
		(e) => {
			if (!tracking) return;
			tracking = false;
			const endY = e.changedTouches[0].clientY;
			const endX = e.changedTouches[0].clientX;
			const dy = endY - startY;
			const dx = endX - startX;
			if (Math.abs(dy) < TH || Math.abs(dy) < Math.abs(dx)) return;
			if (dy < 0 && chosenSlideNumber < 4) slideTo(chosenSlideNumber + 1);
			else if (dy > 0 && chosenSlideNumber > 1) slideTo(chosenSlideNumber - 1);
		},
		{ passive: true },
	);
}

initSwipe();
