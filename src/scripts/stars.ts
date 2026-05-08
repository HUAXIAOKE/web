const STAR_SIZE = 4;
const STAR_MIN_SCALE = 0.2;
const OVERFLOW_THRESHOLD = 50;

const STAR_COUNT = (() => {
	const total = window.innerWidth + window.innerHeight;
	if (total < 800) return total / 14;
	return total / 8;
})();

const canvas = document.querySelector('canvas')!;
const context = canvas.getContext('2d')!;

let scale = 1;
let width: number;
let height: number;

let stars: Array<{
	x: number;
	y: number;
	z: number;
}> = [];

let pointerX: number;
let pointerY: number;

let velocity = { x: 0, y: 0, tx: 0, ty: 0, z: 0.0009 };
let touchInput = false;

generate();
resize();
step();

window.onresize = resize;

canvas.onmousemove = onMouseMove;

canvas.ontouchend = onMouseLeave;

document.onmouseleave = onMouseLeave;

function generate(): void {
	for (let i = 0; i < STAR_COUNT; i++) {
		stars.push({
			x: 0,
			y: 0,
			z: STAR_MIN_SCALE + Math.random() * (1.4 - STAR_MIN_SCALE),
		});
	}
}

function placeStar(star: (typeof stars)[0]): void {
	star.x = Math.random() * width;
	star.y = Math.random() * height;
}

function recycleStar(star: (typeof stars)[0]): void {
	let direction = 'z';

	const vx = Math.abs(velocity.x);
	const vy = Math.abs(velocity.y);

	if (vx > 1 || vy > 1) {
		let axis: string;

		if (vx > vy) {
			axis = Math.random() < vx / (vx + vy) ? 'h' : 'v';
		} else {
			axis = Math.random() < vy / (vx + vy) ? 'v' : 'h';
		}

		if (axis === 'h') {
			direction = velocity.x > 0 ? 'l' : 'r';
		} else {
			direction = velocity.y > 0 ? 't' : 'b';
		}
	}

	star.z = STAR_MIN_SCALE + Math.random() * (1 - STAR_MIN_SCALE);

	if (direction === 'z') {
		star.z = 0.1;
		star.x = Math.random() * width;
		star.y = Math.random() * height;
	} else if (direction === 'l') {
		star.x = -OVERFLOW_THRESHOLD;
		star.y = height * Math.random();
	} else if (direction === 'r') {
		star.x = width + OVERFLOW_THRESHOLD;
		star.y = height * Math.random();
	} else if (direction === 't') {
		star.x = width * Math.random();
		star.y = -OVERFLOW_THRESHOLD;
	} else if (direction === 'b') {
		star.x = width * Math.random();
		star.y = height + OVERFLOW_THRESHOLD;
	}
}

function resize(): void {
	scale = window.devicePixelRatio || 1;

	width = window.innerWidth * scale;
	height = window.innerHeight * scale;
	canvas.width = width;
	canvas.height = height;

	stars.forEach(placeStar);
}

function step(): void {
	context.clearRect(0, 0, width, height);

	update();

	render();

	requestAnimationFrame(step);
}

function update(): void {
	velocity.tx *= 0.96;
	velocity.ty *= 0.96;

	velocity.x += (velocity.tx - velocity.x) * 0.8;
	velocity.y += (velocity.ty - velocity.y) * 0.8;

	stars.forEach((star) => {
		star.x += velocity.x * star.z;
		star.y += velocity.y * star.z;

		star.x += (star.x - width / 2) * velocity.z * star.z;
		star.y += (star.y - height / 2) * velocity.z * star.z;

		star.z += velocity.z;

		if (star.x < -OVERFLOW_THRESHOLD || star.x > width + OVERFLOW_THRESHOLD || star.y < -OVERFLOW_THRESHOLD || star.y > height + OVERFLOW_THRESHOLD) {
			recycleStar(star);
		}
	});
}

function render(): void {
	const isDarkMode = document.documentElement.classList.contains('dark');
	const STAR_COLOR = isDarkMode ? '#fff' : '#dedede';

	stars.forEach((star) => {
		const easedZ = Math.tanh(star.z * 0.7);

		context.beginPath();
		context.lineCap = 'round';
		context.lineWidth = STAR_SIZE * star.z * scale;
		context.globalAlpha = easedZ;
		context.strokeStyle = STAR_COLOR;

		context.beginPath();
		context.moveTo(star.x, star.y);

		let tailX = velocity.x * 2;
		let tailY = velocity.y * 2;

		if (Math.abs(tailX) < 0.1) tailX = 0.5;
		if (Math.abs(tailY) < 0.1) tailY = 0.5;

		context.lineTo(star.x + tailX, star.y + tailY);
		context.stroke();
	});
}

function movePointer(x: number, y: number): void {
	if (typeof pointerX === 'number' && typeof pointerY === 'number') {
		const ox = x - pointerX;
		const oy = y - pointerY;

		velocity.tx += ox / 8 / scale;
		velocity.ty += oy / 8 / scale;
	}

	pointerX = x;
	pointerY = y;
}

function onMouseMove(event: MouseEvent): void {
	touchInput = false;
	movePointer(event.clientX, event.clientY);
}

function onMouseLeave(): void {
	pointerX = undefined as any;
	pointerY = undefined as any;
}
