// 等待图片加载完成后设置卡片大小
function setCardSize(img, card) {
    const aspectRatio = img.naturalWidth / img.naturalHeight;

    // 根据宽高比决定卡片的跨列数
    if (aspectRatio > 1.5) {
        // 横向图片，跨2列
        card.style.gridColumn = 'span 2';
        card.style.gridRow = 'span 1';
    } else if (aspectRatio < 0.7) {
        // 纵向图片，跨2行
        card.style.gridColumn = 'span 1';
        card.style.gridRow = 'span 2';
    } else {
        // 正方形或接近正方形的图片
        card.style.gridColumn = 'span 1';
        card.style.gridRow = 'span 1';
    }

    // 设置图片的对象适配
    img.style.objectFit = 'cover';
    img.style.objectPosition = 'center';
}

// 动态生成卡片
async function generateImageCards() {
    const gallery = document.querySelector('#page-gallery .cards');

    // 如果已经加载过图片，则不重复加载
    if (gallery && gallery.children.length > 0) {
        return;
    }

    try {
        // 调用你创建的 API 端点
        const response = await fetch('/api/Gallery');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const images = await response.json();

        images.forEach((imagePath, index) => {
            const card = document.createElement('div');
            card.className = 'card';

            const img = document.createElement('img');
            img.src = imagePath;
            img.alt = `插画 ${index + 1}`;
            img.loading = 'lazy'; // 懒加载

            // 图片加载完成后设置卡片大小
            img.onload = function () {
                setCardSize(img, card);
            };

            // 图片加载失败的处理
            img.onerror = function () {
                console.error(`Failed to load image: ${imagePath}`);
                card.style.display = 'none';
            };

            card.appendChild(img);
            gallery.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading images:', error);
        // 可以在这里添加错误提示给用户
        if (gallery) {
            gallery.innerHTML = '<p style="text-align: center; color: #666;">加载图片时出错，请稍后重试</p>';
        }
    }
}

window.generateImageCards = generateImageCards;
