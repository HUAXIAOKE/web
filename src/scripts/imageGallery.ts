interface GalleryItem {
	image: string;
	scene: string;
	illustrator: string;
	description: string;
}

function setCardSize(img: HTMLImageElement, card: HTMLElement): void {
	const aspectRatio = img.naturalWidth / img.naturalHeight;

	if (aspectRatio > 1.5) {
		card.style.gridColumn = 'span 2';
		card.style.gridRow = 'span 1';
	} else if (aspectRatio < 0.7) {
		card.style.gridColumn = 'span 1';
		card.style.gridRow = 'span 2';
	} else {
		card.style.gridColumn = 'span 1';
		card.style.gridRow = 'span 1';
	}

	img.style.objectFit = 'cover';
	img.style.objectPosition = 'center';
}

async function generateImageCards(): Promise<void> {
	const gallery = document.querySelector<HTMLElement>('#page-gallery .cards');

	if (gallery && gallery.children.length > 0) {
		return;
	}

	try {
		const response = await fetch((window.API_BASE || '') + '/api/gallery');
		if (!response.ok) throw new Error(`API error! status: ${response.status}`);
		const items: GalleryItem[] = await response.json();

		items.forEach((item, index) => {
			const card = document.createElement('div');
			card.className = 'card';

			const img = document.createElement('img');
			img.src = item.image;
			img.alt = `插画 ${index + 1}`;
			img.loading = 'lazy';
			card.appendChild(img);

			const infoCard = document.createElement('div');
			infoCard.className = 'info-card';
			infoCard.innerHTML = `
				<h3><i class="fas fa-image"></i>${item.scene}</h3>
				<p><i class="fas fa-paint-brush"></i><strong>画师:</strong> ${item.illustrator}</p>
				<p><i class="fas fa-info-circle"></i><strong>描述:</strong> <span>${item.description}</span></p>
			`;
			card.appendChild(infoCard);

			img.onload = () => {
				setCardSize(img, card);
			};

			img.onerror = () => {
				card.style.display = 'none';
			};

			gallery!.appendChild(card);
		});
	} catch {
		if (gallery) {
			gallery.innerHTML = '<p style="text-align: center; color: #666;">加载图片时出错，请稍后重试</p>';
		}
	}
}

window.generateImageCards = generateImageCards;
