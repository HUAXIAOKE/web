let timelineData = [];

async function loadTimelineData() {
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

// 创建时间轴内容
async function createTimeline() {
	const container = document.querySelector('#timeline-container');
	if (!container) return;

	// 加载数据
	await loadTimelineData();

	container.innerHTML = '';

	timelineData.forEach((item, index) => {
		const timelineItem = document.createElement('div');
		timelineItem.className = 'timeline-item';
		timelineItem.setAttribute('data-text', item.label);
		timelineItem.setAttribute('data-index', index);

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

// 初始化时间轴动画
function initTimelineAnimation() {
	const selectors = {
		shell: document.querySelector('#timeline-shell'),
		timeline: document.querySelector('#timeline-container'),
		items: document.querySelectorAll('.timeline-item'),
		activeClass: 'timeline-item--active',
		img: '.timeline-img',
	};

	if (!selectors.shell || selectors.items.length === 0) return;

	// 计算并设置正确的时间轴线高度
	function updateTimelineHeight() {
		const timelineElement = selectors.timeline;
		const items = selectors.items;

		if (items.length > 0) {
			// 等待DOM完全渲染后计算
			setTimeout(() => {
				const firstItem = items[0];
				const lastItem = items[items.length - 1];

				const firstItemTop = firstItem.offsetTop;
				const lastItemBottom = lastItem.offsetTop + lastItem.offsetHeight;
				const totalContentHeight = lastItemBottom - firstItemTop + selectors.items.length * 10; // 根据卡片数量动态计算额外空间

				// 动态创建CSS规则
				const styleId = 'timeline-height-style';
				let existingStyle = document.getElementById(styleId);
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

				// 更新指针位置（在高度计算完成后）
				setTimeout(() => {
					if (currentIndex >= 0 && selectors.items[currentIndex]) {
						updatePointerPosition(currentIndex);
					}
				}, 50);
			}, 200);
		}
	}

	// 调用高度更新
	updateTimelineHeight();

	// 创建时间轴指针
	function createTimelinePointer() {
		// 检查是否已存在指针
		const existingPointer = selectors.timeline.querySelector('.timeline-pointer');
		if (existingPointer) {
			existingPointer.remove();
		}

		const pointer = document.createElement('div');
		pointer.className = 'timeline-pointer';
		selectors.timeline.appendChild(pointer);

		return pointer;
	}

	// 更新指针位置
	function updatePointerPosition(index) {
		const pointer = selectors.timeline.querySelector('.timeline-pointer');
		if (!pointer || !selectors.items[index]) return;

		const item = selectors.items[index];
		const itemTop = item.offsetTop;
		const itemHeight = item.offsetHeight;

		const pointerTop = itemTop + itemHeight * 0.5 - 3;

		pointer.style.top = `${pointerTop}px`;

		pointer.classList.add('active');

		clearTimeout(pointer.animationTimeout);
		pointer.animationTimeout = setTimeout(() => {
			pointer.classList.remove('active');
			setTimeout(() => pointer.classList.add('active'), 50);
		}, 100);
	}

	// 创建时间轴指针
	const timelinePointer = createTimelinePointer();

	let currentIndex = 0;

	// 激活第一个项目
	updateActiveItem(0);

	// 处理时间轴内部滚动
	function handleTimelineScroll() {
		const scrollTop = selectors.timeline.scrollTop;
		const containerHeight = selectors.timeline.clientHeight;
		const totalHeight = selectors.timeline.scrollHeight;

		// 计算当前应该激活的项目
		let newIndex = 0;
		let minDistance = Infinity;

		selectors.items.forEach((item, index) => {
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

	// 更新激活项目
	function updateActiveItem(index) {
		// 移除所有激活状态
		selectors.items.forEach((item) => item.classList.remove(selectors.activeClass));

		// 激活当前项目
		if (selectors.items[index]) {
			selectors.items[index].classList.add(selectors.activeClass);

			// 更新背景图
			const currentImg = selectors.items[index].querySelector(selectors.img);
			if (currentImg) {
				selectors.shell.style.backgroundImage = `url(${currentImg.getAttribute('src')})`;
			}

			// 更新指针位置
			updatePointerPosition(index);
		}
	}

	// 添加滚动监听
	selectors.timeline.addEventListener('scroll', handleTimelineScroll);

	// 键盘导航
	document.addEventListener('keydown', function (e) {
		const pageElement = document.querySelector('#page-live');
		if (!pageElement || pageElement.style.display === 'none') return;

		if (e.key === 'ArrowUp' && currentIndex > 0) {
			e.preventDefault();
			scrollToItem(currentIndex - 1);
		} else if (e.key === 'ArrowDown' && currentIndex < selectors.items.length - 1) {
			e.preventDefault();
			scrollToItem(currentIndex + 1);
		}
	});

	// 滚动到指定项目
	function scrollToItem(index) {
		if (index >= 0 && index < selectors.items.length) {
			const item = selectors.items[index];
			const containerHeight = selectors.timeline.clientHeight;
			const itemTop = item.offsetTop;
			const itemHeight = item.offsetHeight;
			const scrollTo = itemTop - (containerHeight - itemHeight) / 2;

			selectors.timeline.scrollTo({
				top: scrollTo,
				behavior: 'smooth',
			});
		}
	}

	// 添加滚动指示器
	createScrollIndicator();

	function createScrollIndicator() {
		// 检查是否已存在指示器
		const existingIndicator = selectors.shell.querySelector('.timeline-scroll-indicator');
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
                <span class="current-item">1</span> / <span class="total-items">${selectors.items.length}</span>
            </div>
        `;
		selectors.shell.appendChild(indicator);

		// 更新指示器
		function updateIndicator() {
			const track = indicator.querySelector('.scroll-indicator-track');
			const thumb = indicator.querySelector('.scroll-indicator-thumb');
			const currentText = indicator.querySelector('.current-item');

			if (track && thumb && currentText) {
				const progress = selectors.items.length > 1 ? currentIndex / (selectors.items.length - 1) : 0;

				// 动态获取轨道和滑块的高度，以计算可移动距离
				const trackHeight = track.clientHeight;
				const thumbHeight = thumb.clientHeight;
				const travelDistance = trackHeight - thumbHeight;

				thumb.style.transform = `translateY(${progress * travelDistance}px)`;
				currentText.textContent = currentIndex + 1;
			}
		}

		// 监听滚动更新指示器
		selectors.timeline.addEventListener('scroll', updateIndicator);
		updateIndicator();
	}
}

// 当页面切换到直播页面时初始化时间轴
document.addEventListener('DOMContentLoaded', function () {
	// 监听页面切换
	const observer = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
				const target = mutation.target;
				if (target.id === 'page-live' && target.style.display !== 'none') {
					setTimeout(() => createTimeline(), 100);
				}
			}
		});
	});

	const livePageElement = document.querySelector('#page-live');
	if (livePageElement) {
		observer.observe(livePageElement, { attributes: true });

		// 如果直播页面已经显示，立即初始化
		if (livePageElement.style.display !== 'none') {
			createTimeline();
		}
	}
});
