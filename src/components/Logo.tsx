import appLogo from '../assets/brand/app-logo.svg';
import lockupDark from '../assets/brand/logo-dark.svg';
import lockupLight from '../assets/brand/logo-light.svg';

/** The app tile from the brand file: a rounded square, mint to deep green, with a white M. */
export function Logo({ size = 32 }: { size?: number }) {
  return <img className="brand-mark" src={appLogo} alt="" width={size} height={size} aria-hidden />;
}

/** The tile with the MyMoney wordmark. There is one drawing for light and one for dark (the wordmark changes colour); CSS shows the one that fits the theme. */
export function LogoLockup({ height = 56 }: { height?: number }) {
  return (
    <span className="lockup" role="img" aria-label="MyMoney">
      <img className="lockup-light" src={lockupLight} alt="" height={height} style={{ height }} />
      <img className="lockup-dark" src={lockupDark} alt="" height={height} style={{ height }} />
    </span>
  );
}
