// 定义变量
let chosenSlideNumber = 1; // 当前选择的幻灯片编号
let offset = 0; // 幻灯片偏移量
let barOffset = 0; // 导航条偏移量

// 获取所有抽屉按钮，为每个按钮添加鼠标悬停事件监听器
const drawerBtns = Array.from(document.querySelectorAll('.drawer-btn'));
drawerBtns.forEach((btn, index) => {
	btn.addEventListener('mouseenter', () => {
		slideTo(index + 1); // 鼠标移入时切换到对应幻灯片
	});
});

// 切换到指定编号的幻灯片
function slideTo(slideNumber) {
	// 如果是当前幻灯片，则不执行切换
	if (slideNumber === chosenSlideNumber) return;

	drawerboxToggle(slideNumber); // 切换抽屉面板状态
	drawerbtnToggle(slideNumber); // 切换抽屉按钮状态

	// 更新偏移量
	let previousSlideNumber = chosenSlideNumber;
	chosenSlideNumber = slideNumber;
	offset += (chosenSlideNumber - previousSlideNumber) * -100; // 计算幻灯片偏移量
	barOffset += (chosenSlideNumber - previousSlideNumber) * 100; // 计算导航条偏移量
	barSlide(barOffset); // 移动导航条

	// 获取所有幻灯片，为每个幻灯片设置偏移量
	const slides = document.querySelectorAll('.card');
	Array.from(slides).forEach((slide) => {
		slide.style.transform = `translateY(${offset}%)`;
	});
}

// 切换抽屉面板状态
function drawerboxToggle(drawerboxNumber) {
	let prevDrawerboxNumber = chosenSlideNumber;
	const drawerboxes = document.querySelectorAll('.drawerbox');
	drawerboxes[prevDrawerboxNumber - 1].classList.remove('active'); // 移除前一个抽屉面板的激活状态
	drawerboxes[drawerboxNumber - 1].classList.add('active'); // 激活当前抽屉面板
}

// 切换抽屉按钮状态
function drawerbtnToggle(drawerBtnNumber) {
	let prevDrawerBtnNumber = chosenSlideNumber;
	const drawerBtns = document.querySelectorAll('.drawer-btn');
	drawerBtns[prevDrawerBtnNumber - 1].classList.remove('active'); // 移除前一个抽屉按钮的激活状态
	drawerBtns[drawerBtnNumber - 1].classList.add('active'); // 激活当前抽屉按钮
}

// 移动导航条
function barSlide(barOffset) {
	const bar = document.querySelector('#bar');
	bar.style.transform = `translateY(${barOffset}%)`;
}
