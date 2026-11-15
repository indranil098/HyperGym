import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type TabParamList = {
  Chat: undefined;
  Log: undefined;
  Routines: undefined;
  Settings: undefined;
};

export type LogStackParamList = {
  LogHome: undefined;
  DayDetail: { date: string };
  Exercise: { key: string; name: string };
};

export type RoutineStackParamList = {
  RoutineHome: undefined;
};

export type LogNav = CompositeNavigationProp<
  NativeStackNavigationProp<LogStackParamList, 'LogHome'>,
  BottomTabNavigationProp<TabParamList>
>;

export type RoutineNav = CompositeNavigationProp<
  NativeStackNavigationProp<RoutineStackParamList, 'RoutineHome'>,
  BottomTabNavigationProp<TabParamList>
>;
