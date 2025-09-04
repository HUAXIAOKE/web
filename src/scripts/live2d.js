(async () => {
    // 等依赖就绪
    for (let i = 0; i < 60; i++) {
        if (window.PIXI && PIXI.live2d?.Live2DModel) break;
        await new Promise(r => setTimeout(r, 50));
    }
    if (!window.PIXI || !PIXI.live2d?.Live2DModel) {
        console.error('Live2D 依赖未就绪');
        return;
    }

    const home = document.getElementById('page-index');
    const container = document.getElementById('live2d-container');
    if (!home || !container) return;

    // 初始逻辑尺寸（CSS 已控制视觉尺寸）
    const app = new PIXI.Application({
        width: container.clientWidth || 340,
        height: container.clientHeight || 600,
        transparent: true,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(2, window.devicePixelRatio || 1.5),
        powerPreference: 'high-performance'
    });
    container.appendChild(app.view);

    let model;

    function layoutModel() {
        if (!model) return;
        // 目标高度接近容器高度
        const targetH = app.renderer.height * 0.985;
        const scale = targetH / model.height;
        model.scale.set(scale);
        model.anchor.set(0.5, 1);
        // 贴容器底 + 靠右（0.55 让人物中心稍向内）
        model.x = app.renderer.width - model.width * 0.55;
        model.y = app.renderer.height;
    }

    function resizeRenderer() {
        const w = container.clientWidth || 340;
        const h = container.clientHeight || 600;
        app.renderer.resize(w, h);
        layoutModel();
    }

    // 主页显示状态同步
    function isHomeVisible() {
        return home.style.display !== 'none' && getComputedStyle(home).display !== 'none';
    }

    function syncVisibility() {
        const visible = isHomeVisible();
        container.style.display = visible ? 'block' : 'none';
        if (visible) {
            if (app.ticker.started === false) app.ticker.start();
            resizeRenderer();
        } else {
            app.ticker.stop();
        }
    }

    // 监听导航点击（假设你的导航用 data-page 切换）
    const nav = document.getElementById('nav');
    if (nav) {
        nav.addEventListener('click', () => {
            // 延迟等待其它脚本完成 display 切换
            setTimeout(syncVisibility, 0);
        });
    }

    // 兜底轮询（防止其它脚本异步修改）
    let lastState = null;
    setInterval(() => {
        const cur = isHomeVisible();
        if (cur !== lastState) {
            lastState = cur;
            syncVisibility();
        }
    }, 600);

    // 观察主页尺寸变化（内容高度/宽度变化时重新布局）
    const ro = new ResizeObserver(() => {
        if (isHomeVisible()) resizeRenderer();
    });
    ro.observe(home);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            if (isHomeVisible()) resizeRenderer();
        });
    }
    window.addEventListener('resize', () => {
        if (isHomeVisible()) resizeRenderer();
    });

    try {
        const modelPath = '/models/Huaxiaoke/华小科3.1.model3.json';
        model = await PIXI.live2d.Live2DModel.from(encodeURI(modelPath));
        app.stage.addChild(model);
        layoutModel();

        // 指针跟随（主页可见时才处理）
        const pointerMove = (e) => {
            if (!model || !isHomeVisible()) return;
            const rect = container.getBoundingClientRect();
            const localX = e.clientX - rect.left;
            const localY = e.clientY - rect.top;
            model.pointer = { x: localX, y: localY };
        };
        window.addEventListener('pointermove', pointerMove);

        // 点击命中检测
        const pointerUp = (e) => {
            if (!model || !isHomeVisible()) return;
            const rect = container.getBoundingClientRect();
            const localX = e.clientX - rect.left;
            const localY = e.clientY - rect.top;
            if (localX < 0 || localY < 0 || localX > app.renderer.width || localY > app.renderer.height) return;
            const hits = model.hitTest(localX, localY);
            if (hits.length) {
                try { model.motion('tap_body'); } catch { }
            }
        };
        window.addEventListener('pointerup', pointerUp);

        syncVisibility();
        console.log('Live2D 主页模型加载完成');
    } catch (err) {
        console.error('Live2D 模型加载失败:', err);
    }
})();