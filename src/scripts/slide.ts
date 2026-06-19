let chosenSlideNumber: number = 1;

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
		{ passive: true }
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
			if (dy < 0 && chosenSlideNumber < 4) chosenSlideNumber++;
			else if (dy > 0 && chosenSlideNumber > 1) chosenSlideNumber--;
		},
		{ passive: true }
	);
}

initSwipe();
