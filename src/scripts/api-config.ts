declare global {
	interface Window {
		API_BASE: string;
		generateImageCards: () => Promise<void>;
		reloadLive2DModel: () => void;
	}
}

window.API_BASE = '';

export {};