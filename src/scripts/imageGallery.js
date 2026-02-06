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
		const [apiResponse, jsonResponse] = await Promise.all([fetch('/api/Gallery'), fetch((window.API_BASE || '') + '/api/gallery')]);

		if (!apiResponse.ok) {
			throw new Error(`API error! status: ${apiResponse.status}`);
		}
		if (!jsonResponse.ok) {
			throw new Error(`JSON fetch error! status: ${jsonResponse.status}`);
		}

		const imagePaths = await apiResponse.json();
		const imagesData = await jsonResponse.json();

		// 创建一个元数据映射，键为图片文件名，值为元数据对象
		const metadataMap = new Map(
			imagesData.map((data) => {
				const filename = data.image.split('/').pop(); // 从路径中提取文件名
				return [filename, data];
			})
		);

		imagePaths.forEach((imagePath, index) => {
			const card = document.createElement('div');
			card.className = 'card';

			const img = document.createElement('img');
			img.src = imagePath;
			img.alt = `插画 ${index + 1}`;
			img.loading = 'lazy'; // 懒加载

			// 将图片添加到卡片中
			card.appendChild(img);

			// 查找当前图片的元数据
			const imageFilename = imagePath.split('/').pop();
			const metadata = metadataMap.get(imageFilename);

			// 如果找到了元数据，则创建信息卡
			if (metadata) {
				const infoCard = document.createElement('div');
				infoCard.className = 'info-card';
				infoCard.innerHTML = `
                   <h3><i class="fas fa-image"></i>${metadata.scene}</h3>
                    <p><i class="fas fa-paint-brush"></i><strong>画师:</strong> ${metadata.illustrator}</p>
                    <p><i class="fas fa-info-circle"></i><strong>描述:</strong> <span>${metadata.description}</span></p>
                `;
				card.appendChild(infoCard);
			}

			// 图片加载完成后设置卡片大小
			img.onload = function () {
				setCardSize(img, card);
			};

			// 图片加载失败的处理
			img.onerror = function () {
				console.error(`Failed to load image: ${imagePath}`);
				card.style.display = 'none';
			};

			// 将完整的卡片添加到画廊
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
