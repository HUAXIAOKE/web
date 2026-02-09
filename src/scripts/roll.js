// 自定义滚动函数
function scrollToTop(duration) {
	const start = window.pageYOffset;
	const startTime = 'now' in window.performance ? performance.now() : new Date().getTime();

	function scroll() {
		const now = 'now' in window.performance ? performance.now() : new Date().getTime();
		const timeElapsed = now - startTime;
		const progress = Math.min(timeElapsed / duration, 1);

		window.scrollTo(0, start - start * progress);

		if (timeElapsed < duration) {
			requestAnimationFrame(scroll);
		}
	}

	requestAnimationFrame(scroll);
}

document.getElementById('backToTopBtn').addEventListener('click', function () {
	scrollToTop(600);
});
