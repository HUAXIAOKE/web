(function () {
	const SPARK_COLOR_LIGHT = '#666';
	const SPARK_COLOR_DARK = '#fff';
	const SPARK_SIZE = 10;
	const SPARK_RADIUS = 15;
	const SPARK_COUNT = 8;
	const DURATION = 400;
	const EXTRA_SCALE = 1.0;

	interface Spark {
		x: number;
		y: number;
		angle: number;
		startTime: number;
	}

	const sparks: Spark[] = [];

	function easeOut(t: number): number {
		return t * (2 - t);
	}

	const canvas = document.createElement('canvas');
	canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998';
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

		const color = document.documentElement.classList.contains('dark') ? SPARK_COLOR_DARK : SPARK_COLOR_LIGHT;

		for (let i = sparks.length - 1; i >= 0; i--) {
			const spark = sparks[i];
			const elapsed = timestamp - spark.startTime;
			if (elapsed >= DURATION) {
				sparks.splice(i, 1);
				continue;
			}

			const progress = elapsed / DURATION;
			const eased = easeOut(progress);
			const distance = eased * SPARK_RADIUS * EXTRA_SCALE;
			const lineLength = SPARK_SIZE * (1 - eased);

			const x1 = spark.x + distance * Math.cos(spark.angle);
			const y1 = spark.y + distance * Math.sin(spark.angle);
			const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
			const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}

		requestAnimationFrame(draw);
	}

	requestAnimationFrame(draw);

	document.addEventListener('click', (e: MouseEvent) => {
		const now = performance.now();
		for (let i = 0; i < SPARK_COUNT; i++) {
			sparks.push({
				x: e.clientX,
				y: e.clientY,
				angle: (2 * Math.PI * i) / SPARK_COUNT,
				startTime: now,
			});
		}
	});
})();
