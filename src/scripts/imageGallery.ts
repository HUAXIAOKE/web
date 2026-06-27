interface GalleryItem {
	image: string;
	scene: string;
	illustrator: string;
	description: string;
}

interface PreloadResult {
	width: number;
	height: number;
	img: HTMLImageElement;
}

function preloadImage(src: string): Promise<PreloadResult | null> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, img });
		img.onerror = () => resolve(null);
		img.src = src;
	});
}

function setCardSize(img: HTMLImageElement, card: HTMLElement): void {
	applyCardSize(card, img.naturalWidth, img.naturalHeight, img);
}

function applyCardSize(card: HTMLElement, width: number, height: number, img?: HTMLImageElement): void {
	const aspectRatio = width / height;

	card.classList.remove('landscape', 'portrait');
	card.style.gridColumn = '';
	card.style.gridRow = '';

	if (window.innerWidth <= 768) {
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
		if (img) {
			img.style.objectFit = 'cover';
			img.style.objectPosition = 'center';
			img.style.height = '100%';
		}
	} else {
		card.classList.add(width > height ? 'landscape' : 'portrait');
		if (img) {
			img.style.objectFit = '';
			img.style.objectPosition = '';
			img.style.height = '';
		}
	}
}

async function generateImageCards(): Promise<void> {
	const gallery = document.querySelector<HTMLElement>('#page-gallery .cards');
	const loader = document.querySelector<HTMLElement>('#gallery-loader');

	const hideLoader = (): void => {
		if (!loader) return;
		loader.classList.add('hidden');
		loader.addEventListener('transitionend', () => loader.remove(), { once: true });
	};

	if (!gallery || gallery.children.length > 0) {
		return;
	}

	try {
		const response = await fetch((window.API_BASE || '') + '/api/gallery');
		if (!response.ok) throw new Error(`API error! status: ${response.status}`);
		const items: GalleryItem[] = await response.json();

		const pres = await Promise.allSettled(items.map((item) => preloadImage(item.image)));
		const preloaded = new Map<string, PreloadResult>();
		pres.forEach((r, i) => {
			if (r.status === 'fulfilled' && r.value) {
				preloaded.set(items[i].image, r.value);
			}
		});

		const fragment = document.createDocumentFragment();

		items.forEach((item, index) => {
			const card = document.createElement('div');
			card.className = 'card';

			const media = document.createElement('div');
			media.className = 'card-media';

			const p = preloaded.get(item.image);
			if (p) {
				media.style.aspectRatio = `${p.width} / ${p.height}`;
			}

			const img = p?.img ?? document.createElement('img');
			if (!p) img.src = item.image;
			img.alt = `插画 ${index + 1}`;
			media.appendChild(img);

			const infoCard = document.createElement('div');
			infoCard.className = 'info-card';
			infoCard.innerHTML = `
				<h3><i class="fas fa-image"></i>${item.scene}</h3>
				<p><i class="fas fa-paint-brush"></i><strong>画师:</strong> ${item.illustrator}</p>
				<p><i class="fas fa-info-circle"></i><strong>描述:</strong> <span>${item.description}</span></p>
			`;
			media.appendChild(infoCard);
			card.appendChild(media);

			media.addEventListener('click', (e) => {
				if (window.innerWidth <= 768) return;
				e.preventDefault();
				openLightbox(item.image, media);
			});

			if (p) {
				applyCardSize(card, p.width, p.height, img);
			} else if (img.complete && img.naturalWidth) {
				setCardSize(img, card);
			} else {
				img.onload = () => setCardSize(img, card);
			}

			img.onerror = () => {
				card.style.display = 'none';
			};

			fragment.appendChild(card);
		});

		gallery.appendChild(fragment);

		const imgs = gallery.querySelectorAll<HTMLImageElement>('.card-media > img');
		await Promise.all(
			[...imgs].map((img) =>
				img.complete
					? img.decode?.().catch(() => {}) ?? Promise.resolve()
					: new Promise<void>((resolve) => {
							img.onload = () => resolve();
							img.onerror = () => resolve();
						})
			)
		);

		requestAnimationFrame(() => {
			gallery.classList.add('loaded');
			hideLoader();
		});
	} catch {
		if (gallery) {
			gallery.innerHTML = '<p style="text-align: center; color: #666;">加载图片时出错，请稍后重试</p>';
			gallery.classList.add('loaded');
		}
		hideLoader();
	}
}

window.generateImageCards = generateImageCards;

function openLightbox(src: string, originEl: HTMLElement): void {
	const existing = document.querySelector('.gallery-lightbox');
	if (existing) return;

	const thumbRect = originEl.getBoundingClientRect();

	const overlay = document.createElement('div');
	overlay.className = 'gallery-lightbox';

	const media = document.createElement('div');
	media.className = 'gallery-lightbox-media';

	const wrap = document.createElement('div');
	wrap.className = 'gallery-lightbox-img-wrap';

	const img = document.createElement('img');
	img.src = src;
	img.draggable = false;
	wrap.appendChild(img);
	media.appendChild(wrap);
	overlay.appendChild(media);
	document.body.appendChild(overlay);

	media.style.left = `${thumbRect.left}px`;
	media.style.top = `${thumbRect.top}px`;
	media.style.width = `${thumbRect.width}px`;
	media.style.height = `${thumbRect.height}px`;

	const moveToCenter = (): void => {
		const maxW = window.innerWidth * 0.9;
		const maxH = window.innerHeight * 0.85;
		let w = img.naturalWidth;
		let h = img.naturalHeight;
		if (w > maxW) {
			h = (h * maxW) / w;
			w = maxW;
		}
		if (h > maxH) {
			w = (w * maxH) / h;
			h = maxH;
		}
		media.style.left = `${(window.innerWidth - w) / 2}px`;
		media.style.top = `${(window.innerHeight - h) / 2}px`;
		media.style.width = `${w}px`;
		media.style.height = `${h}px`;
	};

	requestAnimationFrame(() => {
		overlay.classList.add('active');
		if (img.complete && img.naturalWidth) {
			requestAnimationFrame(moveToCenter);
		} else {
			img.onload = () => requestAnimationFrame(moveToCenter);
		}
	});

	let rafId: number | null = null;

	const onMove = (e: MouseEvent): void => {
		if (rafId) cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => {
			const rect = wrap.getBoundingClientRect();
			const cx = rect.left + rect.width / 2;
			const cy = rect.top + rect.height / 2;
			const dx = (e.clientX - cx) / (rect.width / 2);
			const dy = (e.clientY - cy) / (rect.height / 2);
			const rotY = Math.max(-2, Math.min(2, dx * -2));
			const rotX = Math.max(-2, Math.min(2, dy * 2));
			wrap.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
		});
	};

	const onClose = (): void => {
		if (rafId) cancelAnimationFrame(rafId);
		img.style.transform = '';
		wrap.style.transform = '';
		media.style.left = `${thumbRect.left}px`;
		media.style.top = `${thumbRect.top}px`;
		media.style.width = `${thumbRect.width}px`;
		media.style.height = `${thumbRect.height}px`;
		overlay.classList.remove('active');
		overlay.removeEventListener('mousemove', onMove);
		overlay.removeEventListener('click', onClose);
		const remove = (): void => overlay.remove();
		media.addEventListener('transitionend', remove, { once: true });
		setTimeout(remove, 600);
	};

	overlay.addEventListener('mousemove', onMove);
	overlay.addEventListener('click', onClose);
}