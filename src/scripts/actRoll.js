document.addEventListener("DOMContentLoaded", () => {
    const scrollContainer = document.querySelector('.activity-submission');
    const poster = document.querySelector('.activity-poster');
    const activityPage = document.getElementById('page-activity');
    const activityContainer = document.querySelector('.activity-container'); // 获取父容器

    if (!scrollContainer || !poster || !activityPage || !activityContainer) return;

    // 创建自定义滚动条的HTML元素
    const scrollbarTrack = document.createElement('div');
    scrollbarTrack.className = 'custom-scrollbar-track';

    const scrollbarThumb = document.createElement('div');
    scrollbarThumb.className = 'custom-scrollbar-thumb';

    scrollbarTrack.appendChild(scrollbarThumb);
    // 将滚动条轨道附加到 activity-container
    activityContainer.appendChild(scrollbarTrack);

    let isDragging = false;

    const updateScrollbar = () => {
        if (activityPage.style.display === 'none') {
            scrollbarTrack.style.display = 'none';
            return;
        }

        // --- 核心居中逻辑 ---
        const posterHeight = poster.offsetHeight;
        const containerHeight = activityContainer.offsetHeight;

        // 1. 设置轨道高度
        const trackHeight = posterHeight * 0.9;
        scrollbarTrack.style.height = `${trackHeight}px`;

        // 2. 计算并设置 top 值以实现垂直居中
        const topPosition = (containerHeight - trackHeight) / 2;
        scrollbarTrack.style.top = `${topPosition}px`;
        // --- 逻辑结束 ---

        if (scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
            scrollbarTrack.style.display = 'none';
        } else {
            scrollbarTrack.style.display = 'block';
        }

        const scrollPercentage = scrollContainer.scrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight);
        const thumbHeight = scrollbarTrack.clientHeight * 0.2;
        const thumbMaxY = scrollbarTrack.clientHeight - thumbHeight;

        scrollbarThumb.style.height = `${thumbHeight}px`;
        scrollbarThumb.style.top = `${scrollPercentage * thumbMaxY}px`;
    };

    scrollContainer.addEventListener('scroll', () => {
        if (!isDragging) {
            updateScrollbar();
        }
    });

    scrollbarThumb.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        const startY = e.pageY;
        const startScrollTop = scrollContainer.scrollTop;

        const handleMouseMove = (moveEvent) => {
            if (!isDragging) return;

            const deltaY = moveEvent.pageY - startY;
            const thumbHeight = scrollbarThumb.offsetHeight;
            const currentTrackHeight = scrollbarTrack.clientHeight;
            const contentScrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;

            if (currentTrackHeight - thumbHeight <= 0) return;

            const scrollDelta = deltaY * (contentScrollHeight / (currentTrackHeight - thumbHeight));
            scrollContainer.scrollTop = startScrollTop + scrollDelta;
        };

        const handleMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    const visibilityObserver = new MutationObserver(updateScrollbar);
    visibilityObserver.observe(activityPage, { attributes: true, attributeFilter: ['style'] });

    const resizeObserver = new ResizeObserver(updateScrollbar);
    resizeObserver.observe(scrollContainer);
    resizeObserver.observe(poster);
    resizeObserver.observe(activityContainer); // 监听容器尺寸变化

    updateScrollbar();
});