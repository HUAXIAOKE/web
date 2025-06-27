const themeBtn = document.getElementById('theme-btn');
const htmlEl = document.documentElement;

// 根据初始类名为按钮设置初始状态
if (htmlEl.classList.contains('dark')) {
    themeBtn.setAttribute('value', 'dark');
} else {
    themeBtn.setAttribute('value', 'light');
}

// 监听按钮事件来切换class
themeBtn.addEventListener("change", e => {
    if (e.detail === 'dark') {
        htmlEl.classList.add('dark');
    } else {
        htmlEl.classList.remove('dark');
    }
});