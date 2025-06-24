document.querySelectorAll("#nav a").forEach((link) => {
    link.addEventListener("click", function (event) {
        const isExternalLink =
            this.hasAttribute("target") &&
            this.getAttribute("target") === "_blank";

        if (isExternalLink) {
            // 处理外部链接
            event.preventDefault();
            const targetUrl = this.getAttribute("data-href");
            const nav = document.getElementById("nav");

            nav.classList.add("animate");

            setTimeout(() => {
                window.open(targetUrl, "_blank", "noopener,noreferrer");
                nav.classList.remove("animate");
            }, 700);
        } else {
            // 处理内部页面跳转
            const targetUrl = this.getAttribute("href");
            const currentPage = window.location.pathname;

            // 如果是当前页面，不执行跳转
            if (targetUrl === currentPage) {
                event.preventDefault();
                return;
            }

            // 阻止默认跳转行为
            event.preventDefault();

            const nav = document.getElementById("nav");
            nav.classList.add("animate");

            // 延迟跳转，让导航栏动画播放完整
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 700); // 与外部链接保持相同的延迟时间
        }
    });
});