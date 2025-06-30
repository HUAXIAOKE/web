document.addEventListener('DOMContentLoaded', () => {
    const videoUpload = document.getElementById('video-upload');
    const fileNameDisplay = document.getElementById('file-name-display');

    if (videoUpload && fileNameDisplay) {
        videoUpload.addEventListener('change', () => {
            if (videoUpload.files.length > 0) {
                fileNameDisplay.textContent = videoUpload.files[0].name;
            } else {
                fileNameDisplay.textContent = '未选择文件';
            }
        });
    }
});