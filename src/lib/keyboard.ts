import { useEffect, useState } from 'react';
import { Dimensions, Keyboard } from 'react-native';

/**
 * Height the app must clear when the keyboard is up.
 *
 * React Native reports two numbers on Android and they disagree under
 * edge-to-edge: `height` comes back short enough to clip the composer, while
 * `screenY` gives the keyboard's real top edge. Take whichever number claims
 * more space, so the composer can never end up underneath the keyboard.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => {
      const { height, screenY } = event.endCoordinates;
      const windowHeight = Dimensions.get('window').height;
      const fromScreenY = screenY > 0 ? windowHeight - screenY : 0;
      setInset(Math.ceil(Math.max(height, fromScreenY)));
    });

    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setInset(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return inset;
}
