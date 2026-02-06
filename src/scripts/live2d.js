(async () => {
	// 将整个 live2d 初始化逻辑包装在一个函数中，以便可以重复调用
	async function initializeLive2D() {
		// 等依赖就绪
		for (let i = 0; i < 60; i++) {
			if (window.PIXI && PIXI.live2d?.Live2DModel) break;
			await new Promise((r) => setTimeout(r, 50));
		}
		if (!window.PIXI || !PIXI.live2d?.Live2DModel) {
			console.error('Live2D 依赖未就绪');
			return;
		}

		const home = document.getElementById('page-index');
		const container = document.getElementById('live2d-container');
		if (!home || !container) return;

		// 如果已存在 PIXI 应用，则先销毁
		if (window.pixiApp) {
			window.pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
			container.innerHTML = '';
		}

		const app = new PIXI.Application({
			width: 510,
			height: 900,
			transparent: true,
			antialias: true,
			autoDensity: true,
			resolution: Math.min(2, window.devicePixelRatio || 1.5),
			powerPreference: 'high-performance',
		});
		window.pixiApp = app; // 将 app 存储在 window 对象上以便管理
		container.appendChild(app.view);

		let model;

		function layoutModel() {
			if (!model) return;
			const targetH = app.renderer.height * 0.985;
			const scale = targetH / model.height;
			model.scale.set(scale);
			model.anchor.set(0.5, 1);
			model.x = app.renderer.width - model.width * 0.55;
			model.y = app.renderer.height;
		}

		function isHomeVisible() {
			const style = window.getComputedStyle(home);
			return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && home.offsetWidth > 0 && home.offsetHeight > 0;
		}

		function syncVisibility() {
			if (syncVisibility.timeoutId) {
				clearTimeout(syncVisibility.timeoutId);
			}
			syncVisibility.timeoutId = setTimeout(() => {
				const visible = isHomeVisible();
				container.style.display = visible ? 'block' : 'none';
				if (visible) {
					if (app.ticker.started === false) app.ticker.start();
				} else {
					app.ticker.stop();
				}
			}, 100);
		}

		// 确保事件监听器只被添加一次
		if (!window.live2dListenersAdded) {
			const nav = document.getElementById('nav');
			if (nav) {
				nav.addEventListener('click', () => {
					setTimeout(syncVisibility, 0);
				});
			}

			let lastState = null;
			setInterval(() => {
				const cur = isHomeVisible();
				if (cur !== lastState) {
					lastState = cur;
					syncVisibility();
				}
			}, 600);

			const pointerMove = (e) => {
				if (!model || !isHomeVisible()) return;
				const rect = container.getBoundingClientRect();
				const localX = e.clientX - rect.left;
				const localY = e.clientY - rect.top;
				if (window.pixiApp.stage.children.length > 0) {
					window.pixiApp.stage.children[0].pointer = { x: localX, y: localY };
				}
			};
			window.addEventListener('pointermove', pointerMove);

			const pointerUp = (e) => {
				if (!model || !isHomeVisible()) return;
				const rect = container.getBoundingClientRect();
				const localX = e.clientX - rect.left;
				const localY = e.clientY - rect.top;
				if (localX < 0 || localY < 0 || localX > app.renderer.width || localY > app.renderer.height) return;
				if (window.pixiApp.stage.children.length > 0) {
					const hits = window.pixiApp.stage.children[0].hitTest(localX, localY);
					if (hits.length) {
						try {
							window.pixiApp.stage.children[0].motion('tap_body');
						} catch {}
					}
				}
			};
			window.addEventListener('pointerup', pointerUp);

			window.live2dListenersAdded = true;
		}

		try {
			// 添加时间戳以防止缓存
			const modelPath = `/models/Huaxiaoke/华小科3.1.model3.json?t=${new Date().getTime()}`;
			model = await PIXI.live2d.Live2DModel.from(encodeURI(modelPath));
			app.stage.addChild(model);
			layoutModel();

			syncVisibility();
			console.log('Live2D 主页模型加载完成');
		} catch (err) {
			console.error('Live2D 模型加载失败:', err);
		}
	}

	// 将重载函数暴露到全局
	window.reloadLive2DModel = initializeLive2D;

	// 初始加载
	window.reloadLive2DModel();
})();
