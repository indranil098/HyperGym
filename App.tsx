import { useEffect } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, layout, type } from './src/theme';
import { dayLabel } from './src/lib/date';
import { useAppStore } from './src/store/useAppStore';
import { MotionProvider } from './src/lib/motion';
import { RestTimer } from './src/components/RestTimer';
import type { LogStackParamList, RoutineStackParamList, TabParamList } from './src/nav';
import { ChatScreen } from './src/screens/ChatScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { LogScreen } from './src/screens/LogScreen';
import { DayDetailScreen } from './src/screens/DayDetailScreen';
import { ExerciseScreen } from './src/screens/ExerciseScreen';
import { RoutinesScreen } from './src/screens/RoutinesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { GlassTabBar } from './src/components/GlassTabBar';

const Tab = createBottomTabNavigator<TabParamList>();
const LogStack = createNativeStackNavigator<LogStackParamList>();
const RoutineStack = createNativeStackNavigator<RoutineStackParamList>();

const renderGlassTabBar = (props: BottomTabBarProps) => <GlassTabBar {...props} />;

/** Compact rest pill that floats above the tab bar on every screen but Train,
 * where the full ring is already on screen. */
function RestDock() {
  const insets = useSafeAreaInsets();
  const rest = useAppStore(state => state.rest);
  const activeTab = useAppStore(state => state.activeTab);
  if (!rest || activeTab === 'Train') {
    return null;
  }
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: layout.gutter,
        right: layout.gutter,
        bottom: insets.bottom + layout.tabBarHeight - 26,
        alignItems: 'center',
      }}
    >
      <RestTimer variant="compact" />
    </View>
  );
}

function buildNavTheme(): Theme {
  return {
    ...DarkTheme,
    dark: true,
    colors: {
      ...DarkTheme.colors,
      primary: color.volt,
      background: color.ink,
      card: color.ink,
      text: color.paper,
      border: color.lineSoft,
      notification: color.volt,
    },
  };
}

function detailHeader() {
  return {
    headerStyle: { backgroundColor: color.ink },
    headerTitleStyle: {
      color: color.paper,
      fontFamily: 'sans-serif-medium',
      fontSize: 18,
    },
    headerTintColor: color.volt,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: color.ink },
  };
}

function LogNavigator() {
  return (
    <LogStack.Navigator screenOptions={detailHeader()}>
      <LogStack.Screen name="LogHome" component={LogScreen} options={{ headerShown: false }} />
      <LogStack.Screen
        name="DayDetail"
        component={DayDetailScreen}
        options={({ route }) => ({ title: dayLabel(route.params.date) })}
      />
      <LogStack.Screen
        name="Exercise"
        component={ExerciseScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
    </LogStack.Navigator>
  );
}

function RoutineNavigator() {
  return (
    <RoutineStack.Navigator screenOptions={detailHeader()}>
      <RoutineStack.Screen
        name="RoutineHome"
        component={RoutinesScreen}
        options={{ headerShown: false }}
      />
    </RoutineStack.Navigator>
  );
}

export default function App() {
  const hydrated = useAppStore(state => state.hydrated);
  const hydrate = useAppStore(state => state.hydrate);
  const theme = useAppStore(state => state.settings.theme);
  const dark = theme === 'dark';

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: color.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar barStyle="light-content" />
        <Text style={type.display}>HyperGym</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <MotionProvider>
        <View style={{ flex: 1, backgroundColor: color.ink }}>
          <NavigationContainer key={theme} theme={buildNavTheme()}>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                sceneStyle: { backgroundColor: color.ink },
                animation: 'shift',
              }}
              tabBar={renderGlassTabBar}
            >
              <Tab.Screen name="Chat" component={ChatScreen} />
              <Tab.Screen name="Train" component={SessionScreen} />
              <Tab.Screen name="Log" component={LogNavigator} />
              <Tab.Screen name="Routines" component={RoutineNavigator} />
              <Tab.Screen name="Settings" component={SettingsScreen} />
            </Tab.Navigator>
          </NavigationContainer>
          <RestDock />
        </View>
      </MotionProvider>
    </SafeAreaProvider>
  );
}
