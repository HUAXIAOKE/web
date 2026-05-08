interface TimelineEvent {
	date: string;
	title: string;
	label: string;
	description: string;
	image: string;
}

let timelineData: TimelineEvent[] = [];

async function loadTimelineData(): Promise<TimelineEvent[]> {
	try {
		const data = await fetch((window.API_BASE || '') + '/api/timeline');
		const result = await data.json();
		timelineData = result.events || [];
		return timelineData;
	} catch (error) {
		console.error('加载时间轴数据失败:', error);
		return [];
	}
}

async function createTimeline(): Promise<void> {
	const container = document.querySelector<HTMLElement>('#timeline-container');
	if (!container) return;

	await loadTimelineData();

	container.innerHTML = '';

	timelineData.forEach((item, index) => {
		const timelineItem = document.createElement('div');
		timelineItem.className = 'timeline-item';
		timelineItem.setAttribute('data-text', item.label);
		timelineItem.setAttribute('data-index', String(index));

		timelineItem.innerHTML = `
            <div class="timeline-content">
                <img src="${item.image}" alt="${item.title}" class="timeline-img">
                <h2 class="timeline-content-title">${item.date}</h2>
                <h3 style="color: #fff; margin: 10px 0; padding: 0 8px; font-size: clamp(16px, 2vw, 20px);">${item.title}</h3>
                <p class="timeline-content-desc">${item.description}</p>
            </div>
        `;

		container.appendChild(timelineItem);
	});

	initTimelineAnimation();
}

function initTimelineAnimation(): void {
	const shell = document.querySelector<HTMLElement>('#timeline-shell');
	const timeline = document.querySelector<HTMLElement>('#timeline-container');
	const items = document.querySelectorAll<HTMLElement>('.timeline-item');

	if (!shell || items.length === 0) return;

	function updateTimelineHeight(): void {
		if (items.length > 0) {
			setTimeout(() => {
				const firstItem = items[0];
				const lastItem = items[items.length - 1];

				const firstItemTop = firstItem.offsetTop;
				const lastItemBottom = lastItem.offsetTop + lastItem.offsetHeight;
				const totalContentHeight = lastItemBottom - firstItemTop + items.length * 10;

				const styleId = 'timeline-height-style';
				const existingStyle = document.getElementById(styleId);
				if (existingStyle) {
					existingStyle.remove();
				}

				const style = document.createElement('style');
				style.id = styleId;
				style.textContent = `
                    #timeline-container::before {
                        height: ${totalContentHeight}px !important;
                    }
                `;
				document.head.appendChild(style);

				setTimeout(() => {
					if (currentIndex >= 0 && items[currentIndex]) {
						updatePointerPosition(currentIndex);
					}
				}, 50);
			}, 200);
		}
	}

	updateTimelineHeight();

	function createTimelinePointer(): HTMLElement | null {
		const existingPointer = timeline!.querySelector<HTMLElement>('.timeline-pointer');
		if (existingPointer) {
			existingPointer.remove();
		}

		const pointer = document.createElement('div');
		pointer.className = 'timeline-pointer';
		timeline!.appendChild(pointer);

		return pointer;
	}

	let currentPointerTimeout: ReturnType<typeof setTimeout>;

	function updatePointerPosition(index: number): void {
		const pointer = timeline!.querySelector<HTMLElement>('.timeline-pointer');
		if (!pointer || !items[index]) return;

		const item = items[index];
		const itemTop = item.offsetTop;
		const itemHeight = item.offsetHeight;

		const pointerTop = itemTop + itemHeight * 0.5 - 3;

		pointer.style.top = `${pointerTop}px`;

		pointer.classList.add('active');

		clearTimeout(currentPointerTimeout);
		currentPointerTimeout = setTimeout(() => {
			pointer.classList.remove('active');
			setTimeout(() => pointer.classList.add('active'), 50);
		}, 100);
	}

	createTimelinePointer();

	let currentIndex = 0;

	updateActiveItem(0);

	function handleTimelineScroll(): void {
		const timelineEl = timeline!;
		const scrollTop = timelineEl.scrollTop;
		const containerHeight = timelineEl.clientHeight;

		let newIndex = 0;
		let minDistance = Infinity;

		items.forEach((item, index) => {
			const itemTop = item.offsetTop;
			const itemCenter = itemTop + item.offsetHeight / 2;
			const viewCenter = scrollTop + containerHeight / 2;
			const distance = Math.abs(itemCenter - viewCenter);

			if (distance < minDistance) {
				minDistance = distance;
				newIndex = index;
			}
		});

		if (newIndex !== currentIndex) {
			currentIndex = newIndex;
			updateActiveItem(currentIndex);
		}
	}

	function updateActiveItem(index: number): void {
		items.forEach((item) => item.classList.remove('timeline-item--active'));

		if (items[index]) {
			items[index].classList.add('timeline-item--active');

			const currentImg = items[index].querySelector<HTMLImageElement>('.timeline-img');
			if (currentImg) {
				shell!.style.backgroundImage = `url(${currentImg.getAttribute('src')})`;
			}

			updatePointerPosition(index);
		}
	}

	timeline!.addEventListener('scroll', handleTimelineScroll);

	document.addEventListener('keydown', (e) => {
		const pageElement = document.querySelector<HTMLElement>('#page-live');
		if (!pageElement || pageElement.style.display === 'none') return;

		if (e.key === 'ArrowUp' && currentIndex > 0) {
			e.preventDefault();
			scrollToItem(currentIndex - 1);
		} else if (e.key === 'ArrowDown' && currentIndex < items.length - 1) {
			e.preventDefault();
			scrollToItem(currentIndex + 1);
		}
	});

	function scrollToItem(index: number): void {
		if (index >= 0 && index < items.length) {
			const item = items[index];
			const containerHeight = timeline!.clientHeight;
			const itemTop = item.offsetTop;
			const itemHeight = item.offsetHeight;
			const scrollTo = itemTop - (containerHeight - itemHeight) / 2;

			timeline!.scrollTo({
				top: scrollTo,
				behavior: 'smooth',
			});
		}
	}

	createScrollIndicator();

	function createScrollIndicator(): void {
		const existingIndicator = shell!.querySelector<HTMLElement>('.timeline-scroll-indicator');
		if (existingIndicator) {
			existingIndicator.remove();
		}

		const indicator = document.createElement('div');
		indicator.className = 'timeline-scroll-indicator';
		indicator.innerHTML = `
            <div class="scroll-indicator-track">
                <div class="scroll-indicator-thumb"></div>
            </div>
            <div class="scroll-indicator-text">
                <span class="current-item">1</span> / <span class="total-items">${items.length}</span>
            </div>
        `;
		shell!.appendChild(indicator);

		function updateIndicator(): void {
			const track = indicator.querySelector<HTMLElement>('.scroll-indicator-track');
			const thumb = indicator.querySelector<HTMLElement>('.scroll-indicator-thumb');
			const currentText = indicator.querySelector<HTMLElement>('.current-item');

			if (track && thumb && currentText) {
				const progress = items.length > 1 ? currentIndex / (items.length - 1) : 0;

				const trackHeight = track.clientHeight;
				const thumbHeight = thumb.clientHeight;
				const travelDistance = trackHeight - thumbHeight;

				thumb.style.transform = `translateY(${progress * travelDistance}px)`;
				currentText.textContent = String(currentIndex + 1);
			}
		}

		timeline!.addEventListener('scroll', updateIndicator);
		updateIndicator();
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
				const target = mutation.target as HTMLElement;
				if (target.id === 'page-live' && target.style.display !== 'none') {
					setTimeout(() => createTimeline(), 100);
				}
			}
		});
	});

	const livePageElement = document.querySelector<HTMLElement>('#page-live');
	if (livePageElement) {
		observer.observe(livePageElement, { attributes: true });

		if (livePageElement.style.display !== 'none') {
			createTimeline();
		}
	}
});
