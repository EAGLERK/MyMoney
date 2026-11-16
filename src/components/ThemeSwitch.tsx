import { Icon, type IconName } from './icons';

export type Theme = 'auto' | 'light' | 'dark';
export const THEMES: Array<{ id: Theme; label: string; icon: IconName }> = [
  { id: 'auto', label: 'Match my device', icon: 'monitor' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
];

/** Three icon buttons: match the device, light, dark. */
export function ThemeSwitch({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <div className="pill-toggle theme-switch" data-tour="theme" role="group" aria-label="Colour theme">
      {THEMES.map(({ id, label, icon }) => <button key={id} aria-pressed={theme === id} aria-label={label} title={label} onClick={() => setTheme(id)}><Icon name={icon} size={18} /></button>)}
    </div>
  );
}
