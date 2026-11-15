import { Vibration } from 'react-native';

let hapticsEnabled = true;

export function setHaptics(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function tap(): void {
  if (hapticsEnabled) {
    Vibration.vibrate(6);
  }
}

export function confirm(): void {
  if (hapticsEnabled) {
    Vibration.vibrate([0, 14, 46, 14]);
  }
}

export function warn(): void {
  if (hapticsEnabled) {
    Vibration.vibrate(20);
  }
}
