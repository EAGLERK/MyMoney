import { isIOS, isNative, isStandalone } from '../platform';
import { useInstallPrompt } from '../pwa';
import { SettingsRow, SettingsSection } from './ui';
import { Icon } from './icons';
import { useToast } from './feedback';

/** Settings card: put MyMoney on the home screen. Hidden once it is installed, and inside the Android and iOS apps. */
export function InstallCard() {
  const { canPrompt, prompt } = useInstallPrompt();
  const { toast } = useToast();
  if (isNative() || isStandalone()) return null;
  const ios = isIOS();
  return (
    <SettingsSection title="Use MyMoney as an app" hint={'Add it to your home screen to open it full screen, like any other app. It keeps working without a connection.' + (ios ? ' On iPhone and iPad the home-screen app keeps its own storage, separate from Safari. Download a backup here first, then restore it inside the app.' : '')}>
      <SettingsRow icon="f-upload" label="Install">
        {canPrompt ? (
          <button className="btn" onClick={() => void prompt().then((r) => { if (r === 'accepted') toast('MyMoney is installed'); })}><Icon name="plus" size={16} />Install the app</button>
        ) : ios ? (
          <span className="sub">Share, then <b>Add to Home Screen</b></span>
        ) : (
          <span className="sub"><b>Install app</b> in your browser menu</span>
        )}
      </SettingsRow>
    </SettingsSection>
  );
}
