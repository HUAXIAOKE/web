(function () {
	const COLOR_MAIN = '#6fcdf4';
	const COLOR_FOAM = '#e6f7ff';
	const PIXEL_COUNT = 2;
	const PIXEL_SIZE = 3;
	const MAX_AGE = 400;
	const GRAVITY = 0.12;

	interface Pixel {
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
		startTime: number;
		isFoam: boolean;
	}

	const pixels: Pixel[] = [];

	const canvas = document.createElement('canvas');
	canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5';
	document.body.appendChild(canvas);

	function resize(): void {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	resize();
	window.addEventListener('resize', resize);

	const ctx = canvas.getContext('2d');

	function draw(timestamp: number): void {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (let i = pixels.length - 1; i >= 0; i--) {
			const p = pixels[i];
			const elapsed = timestamp - p.startTime;
			if (elapsed >= MAX_AGE) {
				pixels.splice(i, 1);
				continue;
			}

			const progress = elapsed / MAX_AGE;
			const alpha = 1 - progress;

			p.x += p.vx;
			p.y += p.vy;
			p.vy += GRAVITY;

			ctx.globalAlpha = alpha;
			ctx.fillStyle = p.isFoam ? COLOR_FOAM : COLOR_MAIN;
			ctx.fillRect(p.x, p.y, p.size, p.size);
		}

		ctx.globalAlpha = 1;
		requestAnimationFrame(draw);
	}

	requestAnimationFrame(draw);

	document.addEventListener('pointermove', (e: PointerEvent) => {
		const now = performance.now();
		for (let i = 0; i < PIXEL_COUNT; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 0.5 + Math.random() * 1.5;
			pixels.push({
				x: e.clientX + (Math.random() - 0.5) * 10,
				y: e.clientY + (Math.random() - 0.5) * 10,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 1.5,
				size: PIXEL_SIZE + Math.random() * 2,
				startTime: now,
				isFoam: Math.random() > 0.7,
			});
		}
	});

	document.addEventListener('click', (e: MouseEvent) => {
		const now = performance.now();
		const count = 12 + Math.floor(Math.random() * 6);
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 1.5 + Math.random() * 2.5;
			pixels.push({
				x: e.clientX,
				y: e.clientY,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 2,
				size: PIXEL_SIZE + Math.random() * 2,
				startTime: now,
				isFoam: Math.random() > 0.5,
			});
		}
	});
})();
