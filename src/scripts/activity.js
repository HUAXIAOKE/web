document.addEventListener('DOMContentLoaded', () => {
    const videoUpload = document.getElementById('video-upload');
    const fileNameDisplay = document.getElementById('file-name-display');
    const videoPreviewContainer = document.getElementById('video-preview-container');
    const videoPreview = document.getElementById('video-preview');
    const submissionForm = document.querySelector('.submission-form');
    const submitBtn = document.querySelector('.submission-form .submit-btn');

    // --- 高度调整逻辑修改 ---
    const activityPage = document.getElementById('page-activity');
    const poster = document.querySelector(".activity-poster");
    const submission = document.querySelector(".activity-submission");

    if (!activityPage || !poster || !submission) {
        return;
    }

    const adjustSubmissionHeight = () => {
        // 确保页面可见时再计算高度
        if (activityPage.style.display !== 'none') {
            const posterHeight = poster.offsetHeight;
            if (posterHeight > 0) {
                submission.style.height = `${posterHeight}px`;
            }
        }
    };

    // 监听活动页面 style 属性的变化
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                // 当 display 不为 none 时，它是可见的
                if (activityPage.style.display !== 'none') {
                    adjustSubmissionHeight();
                }
            }
        }
    });

    observer.observe(activityPage, { attributes: true });

    // 当窗口大小改变时，重新调整高度
    window.addEventListener("resize", adjustSubmissionHeight);

    // 初始加载时如果页面可见，也执行一次
    adjustSubmissionHeight();
    // --- 高度调整逻辑结束 ---


    if (videoUpload) {
        videoUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];

            if (file && videoPreviewContainer && videoPreview) {
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = file.name;
                }
                const videoURL = URL.createObjectURL(file);
                if (videoPreview.src) {
                    URL.revokeObjectURL(videoPreview.src);
                }
                videoPreview.src = videoURL;
                videoPreviewContainer.style.display = 'block';
            } else {
                if (videoPreviewContainer) videoPreviewContainer.style.display = 'none';
                if (videoPreview && videoPreview.src) {
                    URL.revokeObjectURL(videoPreview.src);
                }
                if (videoPreview) videoPreview.src = '';
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = '未选择文件';
                }
            }
        });
    }

    if (submissionForm && submitBtn) {
        submissionForm.addEventListener('submit', (e) => {
            e.preventDefault(); // 阻止表单默认提交行为

            if (!videoUpload) return;
            const file = videoUpload.files[0];
            if (!file) {
                alert('请先选择一个视频文件！');
                return;
            }

            // 如果正在上传，则不执行任何操作
            if (submitBtn.classList.contains('uploading') || submitBtn.classList.contains('completed')) {
                return;
            }

            submitBtn.disabled = true;
            submitBtn.classList.add('uploading');
            const span = submitBtn.querySelector('span');
            if (span) span.textContent = '上传中...';

            // --- 模拟上传逻辑开始 ---
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 10; // 每次增加一个随机进度
                if (progress > 100) {
                    progress = 100;
                }
                submitBtn.style.setProperty('--upload-progress', progress + '%');

                if (progress === 100) {
                    clearInterval(interval);

                    // 模拟上传成功
                    submitBtn.classList.remove('uploading');
                    submitBtn.classList.add('completed');
                    if (span) span.textContent = '上传成功!';

                    // 3秒后重置按钮状态
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.classList.remove('completed');
                        if (span) span.textContent = '提交作品';
                        submitBtn.style.setProperty('--upload-progress', '0%');
                    }, 3000);
                }
            }, 150); // 每150毫秒更新一次进度
            // --- 模拟上传逻辑结束 ---
        });
    }
});