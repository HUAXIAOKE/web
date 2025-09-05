// SPA 导航管理
class SPANavigation {
    constructor() {
        this.currentPage = 'index';
        this.pages = ['index', 'live', 'gallery', 'activity', 'about'];
        this.init();
    }

    init() {
        this.bindNavEvents();
        this.initSlideAnimation();
        this.setInitialPage();
    }

    bindNavEvents() {
        const navLinks = document.querySelectorAll("#nav a[data-page]");
        const slide1 = document.querySelector("#nav .slide1");
        const slide2 = document.querySelector("#nav .slide2");

        navLinks.forEach((link, index) => {
            // 点击事件
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const targetPage = link.getAttribute('data-page');
                this.switchPage(targetPage);
                this.updateActiveNav(link);
            });

            // 悬停事件
            link.addEventListener("mouseover", () => {
                const parent = link.parentElement;
                const position = parent.offsetLeft;
                const width = parent.offsetWidth;

                slide2.style.opacity = "1";
                slide2.style.left = position + "px";
                slide2.style.width = width + "px";
                slide2.classList.add("squeeze");
            });

            link.addEventListener("mouseout", () => {
                slide2.style.opacity = "0";
                slide2.classList.remove("squeeze");
            });
        });

        // 外部链接处理
        const externalLinks = document.querySelectorAll("#nav a[target='_blank']");
        externalLinks.forEach(link => {
            // 为外部链接添加悬浮效果
            link.addEventListener("mouseover", () => {
                const parent = link.parentElement;
                const position = parent.offsetLeft;
                const width = parent.offsetWidth;

                slide2.style.opacity = "1";
                slide2.style.left = position + "px";
                slide2.style.width = width + "px";
                slide2.classList.add("squeeze");
            });

            link.addEventListener("mouseout", () => {
                slide2.style.opacity = "0";
                slide2.classList.remove("squeeze");
            });

            // 点击事件处理
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const targetUrl = link.getAttribute('href');

                // 直接打开外部链接，不添加动画效果
                window.open(targetUrl, "_blank", "noopener,noreferrer");
            });
        });
    }

    switchPage(targetPage) {
        if (targetPage === this.currentPage) return;

        // 隐藏当前页面
        const currentPageElement = document.getElementById(`page-${this.currentPage}`);
        if (currentPageElement) {
            currentPageElement.style.display = 'none';
        }

        // 显示目标页面
        const targetPageElement = document.getElementById(`page-${targetPage}`);
        if (targetPageElement) {
            targetPageElement.style.display = 'block';

            // 添加淡入动画
            targetPageElement.style.opacity = '0';
            setTimeout(() => {
                targetPageElement.style.opacity = '1';
                targetPageElement.style.transition = 'opacity 0.3s ease-in-out';
            }, 10);
        }

        // 更新当前页面
        this.currentPage = targetPage;

        // 特殊页面的初始化
        this.initializePage(targetPage);

        // 更新页面标题
        this.updatePageTitle(targetPage);
    }

    initializePage(pageName) {
        switch (pageName) {
            case 'index':
                // 切换到主页时重新加载 Live2D 模型
                if (typeof window.reloadLive2DModel === 'function') {
                    setTimeout(() => {
                        window.reloadLive2DModel();
                    }, 100);
                }
                break;
            case 'gallery':
                // 如果图库还没有加载图片，则加载图片
                setTimeout(() => {
                    const gallery = document.querySelector('#page-gallery .cards');
                    if (gallery && gallery.children.length === 0) {
                        generateImageCards();
                    }
                }, 100);
                break;
            case 'about':
                // 重新初始化关于页面的滑块
                setTimeout(() => {
                    if (typeof slideTo === 'function') {
                        slideTo(1);
                    }
                }, 100);
                break;
        }
    }

    updateActiveNav(activeLink) {
        const navLinks = document.querySelectorAll("#nav a[data-page]");
        const slide1 = document.querySelector("#nav .slide1");

        // 移除所有激活状态
        navLinks.forEach(link => link.classList.remove('active'));

        // 添加当前激活状态
        activeLink.classList.add('active');

        // 移动滑块
        const parent = activeLink.parentElement;
        const position = parent.offsetLeft;
        const width = parent.offsetWidth;

        slide1.style.opacity = "1";
        slide1.style.left = position + "px";
        slide1.style.width = width + "px";
    }

    setInitialPage() {
        // 设置默认激活的导航项（主页）
        const defaultLink = document.querySelector("#nav a[data-page='index']");
        if (defaultLink) {
            this.updateActiveNav(defaultLink);
        }
    }

    updatePageTitle(pageName) {
        const titles = {
            'index': 'Huaxiaoke - 主页',
            'live': 'Huaxiaoke - 直播资讯',
            'gallery': 'Huaxiaoke - 插画一览',
            'activity': 'Huaxiaoke - 当期活动',
            'about': 'Huaxiaoke - 关于我们'
        };

        document.title = titles[pageName] || 'Huaxiaoke';
    }

    initSlideAnimation() {
        const slide1 = document.querySelector("#nav .slide1");
        const slide2 = document.querySelector("#nav .slide2");

        if (slide1) slide1.style.opacity = "0";
        if (slide2) slide2.style.opacity = "0";
    }
}

// 页面加载完成后初始化 SPA 导航
document.addEventListener('DOMContentLoaded', () => {
    new SPANavigation();
});