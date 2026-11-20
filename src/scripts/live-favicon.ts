// The tab icon gets a red dot while a competition is on, so it shows from
// another tab too.
import { isAnyLive } from '../lib/start-alerts';
import { readAlerts } from './start-alerts';

/** Returns the check to run on every tick. */
export function setupLiveFavicon(): () => void {
  const icon = document.getElementById('favicon');
  const alerts = readAlerts();
  const idle = icon?.dataset['idle'];
  const live = icon?.dataset['live'];
  let shown: boolean | undefined;

  return () => {
    const isLive = isAnyLive(alerts, new Date());

    if (icon && idle && live && isLive !== shown) {
      shown = isLive;
      icon.setAttribute('href', isLive ? live : idle);
    }
  };
}
