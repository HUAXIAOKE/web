// 动态调整书本尺寸
function adjustBookSize() {
    const cover = document.getElementById('activity-cover');
    const container = document.querySelector('.activity-container');

    if (cover && container) {
        const img = new Image();
        img.onload = function () {
            const aspectRatio = this.width / this.height;
            let bookWidth, bookHeight;

            // 根据屏幕大小调整书本尺寸
            const maxWidth = Math.min(window.innerWidth * 0.4, 600);
            const maxHeight = Math.min(window.innerHeight * 0.8, 800);

            if (aspectRatio > 1) {
                // 横向图片
                bookWidth = Math.min(maxWidth, this.width);
                bookHeight = bookWidth / aspectRatio;
            } else {
                // 纵向图片
                bookHeight = Math.min(maxHeight, this.height);
                bookWidth = bookHeight * aspectRatio;
            }

            // 设置CSS变量
            container.style.setProperty('--book-width', bookWidth + 'px');
            container.style.setProperty('--book-height', bookHeight + 'px');
        };

        // 从背景图片获取尺寸
        const bgImage = getComputedStyle(cover).backgroundImage;
        const url = bgImage.slice(5, -2); // 移除 'url("' 和 '")'
        img.src = url;
    }
}

// 表单提交处理
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('submission-form');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // 这里可以添加实际的提交逻辑
            console.log('提交的数据:', data);

            // 显示提交成功消息
            alert('报名提交成功！我们会尽快与您联系。');

            // 重置表单
            form.reset();
        });
    }

    // 调整书本尺寸
    adjustBookSize();
});

// 窗口大小改变时重新调整
window.addEventListener('resize', adjustBookSize);