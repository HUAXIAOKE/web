// 初始化导航功能
function initNavigation() {
    const navLinks = document.querySelectorAll("#nav a:not([data-astro-reload])");
    const slide1 = document.querySelector("#nav .slide1");
    const slide2 = document.querySelector("#nav .slide2");

    if (!navLinks.length || !slide1 || !slide2) return;

    // 点击事件 - 更新活跃状态但不阻止默认导航
    navLinks.forEach((link) => {
        link.addEventListener("click", function (e) {
            // 移除所有链接的激活状态
            navLinks.forEach(l => l.classList.remove('active'));
            
            // 为当前点击的链接添加激活状态
            this.classList.add('active');
            
            const parent = this.parentElement;
            const position = parent.offsetLeft;
            const width = parent.offsetWidth;

            slide1.style.opacity = "1";
            slide1.style.left = position + "px";
            slide1.style.width = width + "px";
            
            // 让Astro的视图过渡处理导航，不阻止默认行为
        });
    });

    // 鼠标悬停事件
    navLinks.forEach((link) => {
        link.addEventListener("mouseover", function () {
            const parent = this.parentElement;
            const position = parent.offsetLeft;
            const width = parent.offsetWidth;

            slide2.style.opacity = "1";
            slide2.style.left = position + "px";
            slide2.style.width = width + "px";
            slide2.classList.add("squeeze");
        });

        link.addEventListener("mouseout", function () {
            slide2.style.opacity = "0";
            slide2.classList.remove("squeeze");
        });
    });

    // 根据当前页面设置初始状态
    function setInitialActiveState() {
        const currentPath = window.location.pathname;
        let activeNavItem = null;

        // 页面路径映射
        const pageMapping = {
            '/': 3,           // 主页 - 第3个导航项
            '/live': 4,       // 直播资讯 - 第4个导航项
            '/gallery': 5,    // 插画一览 - 第5个导航项
            '/activity': 6,   // 当期活动 - 第6个导航项
            '/about': 7       // 关于我们 - 第7个导航项
        };

        // 获取对应的导航项索引
        const navIndex = pageMapping[currentPath];

        if (navIndex) {
            activeNavItem = document.querySelector(`#nav li:nth-of-type(${navIndex})`);
        } else {
            // 默认选择主页（第3个导航项）
            activeNavItem = document.querySelector("#nav li:nth-of-type(3)");
        }

        if (activeNavItem) {
            const currentWidth = activeNavItem.offsetWidth;
            const currentLeft = activeNavItem.offsetLeft;

            slide1.style.opacity = "1";
            slide1.style.left = currentLeft + "px";
            slide1.style.width = currentWidth + "px";

            // 清除所有链接的激活状态
            navLinks.forEach(link => link.classList.remove('active'));
            
            // 为当前页面的链接添加激活状态
            const activeLink = activeNavItem.querySelector('a');
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    }

    // 调用初始状态设置
    setInitialActiveState();
}

// 初始化和SPA过渡事件监听
document.addEventListener("DOMContentLoaded", initNavigation);
document.addEventListener("astro:page-load", initNavigation);

// 在页面切换后更新导航状态
document.addEventListener("astro:after-swap", () => {
    // 在DOM更新后立即重新初始化导航
    setTimeout(initNavigation, 0);
});