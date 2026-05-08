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

	const slides = document.querySelectorAll<HTMLElement>('.card');
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
