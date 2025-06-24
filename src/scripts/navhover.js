document.addEventListener("DOMContentLoaded", function () {
    const navLinks = document.querySelectorAll("#nav a");
    const slide1 = document.querySelector("#nav .slide1");
    const slide2 = document.querySelector("#nav .slide2");

    // 点击事件
    navLinks.forEach((link) => {
        link.addEventListener("click", function () {
            const parent = this.parentElement;
            const position = parent.offsetLeft;
            const width = parent.offsetWidth;

            slide1.style.opacity = "1";
            slide1.style.left = position + "px";
            slide1.style.width = width + "px";
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

    // 设置初始状态
    const thirdNavItem = document.querySelector("#nav li:nth-of-type(3)");
    if (thirdNavItem) {
        const currentWidth = thirdNavItem.offsetWidth;
        const currentLeft = thirdNavItem.offsetLeft;

        slide1.style.left = currentLeft + "px";
        slide1.style.width = currentWidth + "px";
    }
});