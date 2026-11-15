import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { color } from '../theme';

type Point = {
  date: string;
  value: number;
};

type Props = {
  points: Point[];
  height?: number;
};

export function LineChart({ points, height = 180 }: Props) {
  const [width, setWidth] = useState(0);

  const values = points.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padY = 14;
  const padX = 7;
  const innerWidth = Math.max(0, width - padX * 2);
  const innerHeight = height - padY * 2;

  const at = (index: number) =>
    padX + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const level = (value: number) => padY + innerHeight - ((value - min) / span) * innerHeight;

  return (
    <View
      style={{ height, width: '100%' }}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel={`Chart of ${points.length} sessions, best ${Math.round(max)} worst ${Math.round(min)}`}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={padX} y1={level(max)} x2={width - padX} y2={level(max)} stroke={color.lineSoft} strokeWidth={1} />
          <Line x1={padX} y1={level(min)} x2={width - padX} y2={level(min)} stroke={color.lineSoft} strokeWidth={1} />
          {points.length > 1 ? (
            <Polyline
              points={points.map((point, index) => `${at(index)},${level(point.value)}`).join(' ')}
              fill="none"
              stroke={color.paper}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {points.map((point, index) => {
            const isLast = index === points.length - 1;
            return (
              <Circle
                key={point.date + index}
                cx={at(index)}
                cy={level(point.value)}
                r={isLast ? 5 : 3}
                fill={isLast ? color.volt : color.paper}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
