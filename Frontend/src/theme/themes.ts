export type ThemeMode = 'dark' | 'light';

export type AccentColor = 'red' | 'blue' | 'emerald' | 'orange' | 'purple' | 'pink' | 'cyan' | 'yellow';

export interface AccentPreset {
  name: string;
  value: AccentColor;
  hex: string;
  hsl: string;
}

export interface ThemeState {
  mode: ThemeMode;
  accent: AccentColor;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Red', value: 'red', hex: '#EF4444', hsl: '0 84% 60%' },
  { name: 'Blue', value: 'blue', hex: '#3B82F6', hsl: '217 91% 60%' },
  { name: 'Emerald', value: 'emerald', hex: '#10B981', hsl: '160 84% 39%' },
  { name: 'Orange', value: 'orange', hex: '#F97316', hsl: '25 95% 53%' },
  { name: 'Purple', value: 'purple', hex: '#8B5CF6', hsl: '262 83% 58%' },
  { name: 'Pink', value: 'pink', hex: '#EC4899', hsl: '330 81% 60%' },
  { name: 'Cyan', value: 'cyan', hex: '#06B6D4', hsl: '189 94% 43%' },
  { name: 'Yellow', value: 'yellow', hex: '#EAB308', hsl: '48 96% 47%' },
];

export const DEFAULT_THEME: ThemeState = {
  mode: 'dark',
  accent: 'red',
};

export function getAccentHex(accent: AccentColor): string {
  return ACCENT_PRESETS.find(p => p.value === accent)?.hex ?? '#EF4444';
}

export function getAccentHsl(accent: AccentColor): string {
  return ACCENT_PRESETS.find(p => p.value === accent)?.hsl ?? '0 84% 60%';
}
