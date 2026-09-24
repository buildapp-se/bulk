// Android: Vibration API. iOS Safari 18+: toggling a hidden <input switch> gives a system haptic tick.
let iosSwitch: HTMLLabelElement | null = null;

export function haptic(ms = 8) {
  if (typeof window === 'undefined') return;
  if ('vibrate' in navigator && navigator.vibrate(ms)) return;
  if (!iosSwitch) {
    iosSwitch = document.createElement('label');
    iosSwitch.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:0;height:0;overflow:hidden';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    iosSwitch.appendChild(input);
    document.body.appendChild(iosSwitch);
  }
  iosSwitch.click();
}
