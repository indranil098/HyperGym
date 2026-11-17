import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { color, type } from '../theme';

export type Bar = {
  label: string;
  value: number;
};

type Props = {
  bars: Bar[];
  /** Index rendered in volt — usually the current week. */
  accentIndex?: number;
  height?: number;
  formatValue?: (value: number) => string;
  onPressBar?: (index: number) => void;
};

/**
 * Vertical bar chart. Built because LineChart is polyline-only with no axes or
 * labels; this one labels every bar and highlights the accent column.
 */
export function BarChart({
  bars,
  accentIndex,
  height = 170,
  formatValue = value => `${Math.round(value)}`,
  onPressBar,
}: Props) {
  const [width, setWidth] = useState(0);
  const max = bars.reduce((best, bar) => Math.max(best, bar.value), 0);
  const span = max || 1;

  const padTop = 22;
  const labelBand = 20;
  const plotHeight = height - padTop - labelBand;
  const gap = 8;
  const barWidth = bars.length > 0 ? Math.max(6, (width - gap * (bars.length - 1)) / bars.length) : 0;

  const hit = (index: number) => {
    if (onPressBar) {
      onPressBar(index);
    }
  };

  return (
    <View
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel={`Bar chart of ${bars.length} values, largest ${formatValue(max)}`}
    >
      {width > 0 && bars.length > 0 ? (
        <Svg width={width} height={height}>
          {bars.map((bar, index) => {
            const drawn = Math.max(0, bar.value);
            const barHeight = (drawn / span) * plotHeight;
            const x = index * (barWidth + gap);
            const y = padTop + (plotHeight - barHeight);
            const accent = index === accentIndex;
            return (
              <Rect
                key={`${bar.label}-${index}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx={4}
                fill={accent ? color.volt : color.ink3}
                onPress={() => hit(index)}
              />
            );
          })}

          {bars.map((bar, index) => {
            const x = index * (barWidth + gap);
            const barHeight = (Math.max(0, bar.value) / span) * plotHeight;
            const accent = index === accentIndex;
            return (
              <SvgText
                key={`v-${bar.label}-${index}`}
                x={x + barWidth / 2}
                y={padTop + (plotHeight - barHeight) - 6}
                fill={accent ? color.volt : color.paperDim}
                fontSize={10}
                textAnchor="middle"
              >
                {bar.value > 0 ? formatValue(bar.value) : ''}
              </SvgText>
            );
          })}

          {bars.map((bar, index) => {
            const x = index * (barWidth + gap);
            return (
              <SvgText
                key={`l-${bar.label}-${index}`}
                x={x + barWidth / 2}
                y={height - 6}
                fill={index === accentIndex ? color.volt : color.paperFaint}
                fontSize={10}
                textAnchor="middle"
              >
                {bar.label}
              </SvgText>
            );
          })}
        </Svg>
      ) : (
        <Text style={[type.micro, { height, textAlignVertical: 'center' }]}>{' '}</Text>
      )}
    </View>
  );
}
