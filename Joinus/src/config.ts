export interface ThemeConfig {
	primary: string;
	primaryLight: string;
	primaryDark: string;
	background: string;
	cardBg: string;
	text: string;
	textMuted: string;
	border: string;
	inputBg: string;
	radius: string;
	spacing: string;
	fontFamily: string;
	fontFamilyTitle: string;
	decor: {
		circle: boolean;
		triangle: boolean;
		dotGrid: boolean;
		circleOpacity: number;
		triangleOpacity: number;
		dotGridOpacity: number;
	};
	btnGradientStart: string;
	btnGradientEnd: string;
	btnShadow: string;
	btnShadowHover: string;
	selectOptionHoverBg: string;
	selectOptionHoverText: string;
}

const defaultDecor = {
	circle: true,
	triangle: true,
	dotGrid: true,
	circleOpacity: 0.25,
	triangleOpacity: 0.1,
	dotGridOpacity: 0.5,
};

export const themeYellow: ThemeConfig = {
	primary: '#FFD93D',
	primaryLight: 'rgba(255, 217, 61, 0.1)',
	primaryDark: '#FFB300',
	background: '#F8F9FA',
	cardBg: '#FFFFFF',
	text: '#1A1A1A',
	textMuted: '#999',
	border: '#E5E5E5',
	inputBg: '#FAFAFA',
	radius: '12px',
	spacing: '16px',
	fontFamily: "'NotoSansHans-Regular', system-ui, sans-serif",
	fontFamilyTitle: "'Alibaba-PuHuiTi-Bold', sans-serif",
	decor: { ...defaultDecor },
	btnGradientStart: '#FFD93D',
	btnGradientEnd: '#FFC107',
	btnShadow: '0 4px 12px rgba(255, 217, 61, 0.3)',
	btnShadowHover: '0 6px 20px rgba(255, 217, 61, 0.45)',
	selectOptionHoverBg: 'rgba(255, 217, 61, 0.15)',
	selectOptionHoverText: '#1A1A1A',
};

export const themeBlue: ThemeConfig = {
	primary: '#1890ff',
	primaryLight: 'rgba(24, 144, 255, 0.1)',
	primaryDark: '#096dd9',
	background: '#F0F5FF',
	cardBg: '#FFFFFF',
	text: '#1A1A1A',
	textMuted: '#8c8c8c',
	border: '#D9D9D9',
	inputBg: '#FAFAFA',
	radius: '12px',
	spacing: '16px',
	fontFamily: "'NotoSansHans-Regular', system-ui, sans-serif",
	fontFamilyTitle: "'Alibaba-PuHuiTi-Bold', sans-serif",
	decor: {
		...defaultDecor,
		circleOpacity: 0.2,
		triangleOpacity: 0.08,
		dotGridOpacity: 0.4,
	},
	btnGradientStart: '#1890ff',
	btnGradientEnd: '#096dd9',
	btnShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
	btnShadowHover: '0 6px 20px rgba(24, 144, 255, 0.45)',
	selectOptionHoverBg: 'rgba(24, 144, 255, 0.1)',
	selectOptionHoverText: '#096dd9',
};

export const themeMinimal: ThemeConfig = {
	...themeYellow,
	decor: {
		circle: false,
		triangle: false,
		dotGrid: false,
		circleOpacity: 0,
		triangleOpacity: 0,
		dotGridOpacity: 0,
	},
};

export const themes: Record<string, ThemeConfig> = {
	yellow: themeYellow,
	blue: themeBlue,
	minimal: themeMinimal,
};

export function applyTheme(el: HTMLElement, theme: ThemeConfig): void {
	const root = el.style;
	root.setProperty('--joinus-primary', theme.primary);
	root.setProperty('--joinus-primary-light', theme.primaryLight);
	root.setProperty('--joinus-primary-dark', theme.primaryDark);
	root.setProperty('--joinus-bg', theme.background);
	root.setProperty('--joinus-card-bg', theme.cardBg);
	root.setProperty('--joinus-text', theme.text);
	root.setProperty('--joinus-text-muted', theme.textMuted);
	root.setProperty('--joinus-border', theme.border);
	root.setProperty('--joinus-input-bg', theme.inputBg);
	root.setProperty('--joinus-radius', theme.radius);
	root.setProperty('--joinus-spacing', theme.spacing);
	root.setProperty('--joinus-font', theme.fontFamily);
	root.setProperty('--joinus-font-title', theme.fontFamilyTitle);
	root.setProperty('--joinus-btn-start', theme.btnGradientStart);
	root.setProperty('--joinus-btn-end', theme.btnGradientEnd);
	root.setProperty('--joinus-btn-shadow', theme.btnShadow);
	root.setProperty('--joinus-btn-shadow-hover', theme.btnShadowHover);
	root.setProperty('--joinus-select-option-hover-bg', theme.selectOptionHoverBg);
	root.setProperty('--joinus-select-option-hover-text', theme.selectOptionHoverText);
	root.setProperty('--joinus-decor-circle-opacity', String(theme.decor.circle ? theme.decor.circleOpacity : 0));
	root.setProperty('--joinus-decor-triangle-opacity', String(theme.decor.triangle ? theme.decor.triangleOpacity : 0));
	root.setProperty('--joinus-decor-dot-opacity', String(theme.decor.dotGrid ? theme.decor.dotGridOpacity : 0));
	el.classList.toggle('joinus-has-circle', theme.decor.circle);
	el.classList.toggle('joinus-has-triangle', theme.decor.triangle);
	el.classList.toggle('joinus-has-dotgrid', theme.decor.dotGrid);
}
