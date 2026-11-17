/* Hallmark v2.0.0 · shape: instrument · theme: mono/volt (by request) · register: product
   signature: the commit card · floor: adapted for React Native, not linted.
   Critique: one accent held under 10%, one radius per nesting level, depth from hairlines
   because shadows are invisible on true black. Three palettes share one token contract. */

import type { TextStyle, ViewStyle } from 'react-native';

export type ThemeName = 'dark' | 'green' | 'light';

export type Palette = {
  ink: string;
  ink1: string;
  ink2: string;
  ink3: string;
  line: string;
  lineSoft: string;
  paper: string;
  paperDim: string;
  paperFaint: string;
  volt: string;
  voltInk: string;
  scrim: string;
  glass: string;
  /** Glow colour for the chat aura. Must contrast with the background, which
   * volt does not on the lime and white themes. */
  aura: string;
};

const PALETTES: Record<ThemeName, Palette> = {
  dark: {
    ink: '#000000',
    ink1: '#0A0A0B',
    ink2: '#141416',
    ink3: '#1C1C20',
    line: '#232327',
    lineSoft: '#17171A',
    paper: '#FFFFFF',
    paperDim: '#9A9AA0',
    paperFaint: '#5E5E66',
    volt: '#C9FA4B',
    voltInk: '#0A0A0B',
    scrim: 'rgba(0,0,0,0.72)',
    glass: '#0A0A0B',
    aura: '#C9FA4B',
  },
  green: {
    ink: '#C9FA4B',
    ink1: '#BEEE42',
    ink2: '#B2E43A',
    ink3: '#A5D932',
    line: '#93C22A',
    lineSoft: '#B7EA3F',
    paper: '#0A0A0B',
    paperDim: '#2C3D12',
    paperFaint: '#4C6320',
    volt: '#0A0A0B',
    voltInk: '#C9FA4B',
    scrim: 'rgba(10,20,0,0.55)',
    glass: '#BEEE42',
    aura: '#FFFFFF',
  },
  light: {
    ink: '#FFFFFF',
    ink1: '#F6F6F7',
    ink2: '#EDEDEF',
    ink3: '#E2E2E6',
    line: '#D6D6DB',
    lineSoft: '#E9E9EC',
    paper: '#0A0A0B',
    paperDim: '#5E5E66',
    paperFaint: '#9A9AA0',
    volt: '#0A0A0B',
    voltInk: '#FFFFFF',
    scrim: 'rgba(0,0,0,0.45)',
    glass: '#F6F6F7',
    aura: '#C9FA4B',
  },
};

export const color: Palette = { ...PALETTES.dark };

export function paletteOf(name: ThemeName): Palette {
  return PALETTES[name];
}

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  gutter: 20,
  lg: 24,
  xl: 36,
  xxl: 56,
  xxxl: 96,
} as const;

export const radius = {
  card: 24,
  row: 14,
  pill: 999,
} as const;

export const iconSize = {
  tab: 28,
  action: 30,
  inline: 24,
  row: 20,
  confirm: 32,
} as const;

export const iconStroke = 1.75;

export const hit = {
  min: 56,
  tab: 64,
  composer: 64,
} as const;

const DISPLAY = 'sans-serif-condensed';
const BODY = 'sans-serif';
const MEDIUM = 'sans-serif-medium';

export type TypeRole =
  | 'display'
  | 'numeral'
  | 'numeralSm'
  | 'title'
  | 'body'
  | 'bodyStrong'
  | 'compact'
  | 'label'
  | 'micro';

function buildType(): Record<TypeRole, TextStyle> {
  return {
    display: {
      fontFamily: DISPLAY,
      fontSize: 44,
      lineHeight: 46,
      fontWeight: '700',
      letterSpacing: -0.9,
      color: color.paper,
    },
    numeral: {
      fontFamily: MEDIUM,
      fontSize: 64,
      lineHeight: 68,
      letterSpacing: -2.2,
      color: color.paper,
      fontVariant: ['tabular-nums'],
    },
    numeralSm: {
      fontFamily: MEDIUM,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.4,
      color: color.paper,
      fontVariant: ['tabular-nums'],
    },
    title: {
      fontFamily: BODY,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: color.paper,
    },
    body: {
      fontFamily: BODY,
      fontSize: 17,
      lineHeight: 26,
      color: color.paper,
    },
    bodyStrong: {
      fontFamily: MEDIUM,
      fontSize: 17,
      lineHeight: 26,
      color: color.paper,
    },
    compact: {
      fontFamily: BODY,
      fontSize: 15,
      lineHeight: 22,
      color: color.paperDim,
    },
    label: {
      fontFamily: MEDIUM,
      fontSize: 13,
      lineHeight: 18,
      color: color.paperDim,
    },
    micro: {
      fontFamily: BODY,
      fontSize: 11,
      lineHeight: 16,
      color: color.paperFaint,
    },
  };
}

export const type: Record<TypeRole, TextStyle> = buildType();

export function applyTheme(name: ThemeName): void {
  Object.assign(color, PALETTES[name]);
  Object.assign(type, buildType());
}

export const surface = {
  get screen(): ViewStyle {
    return { backgroundColor: color.ink };
  },
  get card(): ViewStyle {
    return {
      backgroundColor: color.ink1,
      borderRadius: radius.card,
    };
  },
  get inset(): ViewStyle {
    return { backgroundColor: color.ink2, borderRadius: radius.row };
  },
  get glass(): ViewStyle {
    return {
      backgroundColor: color.glass,
      borderRadius: radius.card,
    };
  },
} as const;

export const layout = {
  gutter: space.gutter,
  cardPad: space.gutter,
  sectionGap: space.xl,
  hairline: 1,
  /**
   * Space a scrolling screen must leave at the bottom so the floating tab bar
   * never sits on top of the last row. Pill + float + a comfortable margin.
   */
  tabBarHeight: 118,
  tabBarPill: 68,
  tabBarFloat: 14,
  /** Gap between the docked composer and the floating tab bar. */
  dockGap: 10,
} as const;
