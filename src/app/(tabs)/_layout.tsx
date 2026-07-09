import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DARK = '#120D2E';
const ACCENT = '#F5C518';

const TABS = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'reports', label: 'Reports', icon: 'bar-chart' },
  { name: 'zones', label: 'Zones', icon: 'globe' },
  { name: 'profile', label: 'Profile', icon: 'person' },
] as const;

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const isFocused = state.index === routeIndex;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={[styles.tabItem, isFocused && styles.activeTabItem]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFocused ? tab.icon : (`${tab.icon}-outline` as any)}
              size={20}
              color={isFocused ? DARK : '#FFFFFF'}
            />
            <Text style={[styles.tabLabel, isFocused && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: DARK,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 24,
    gap: 3,
  },
  activeTabItem: {
    backgroundColor: ACCENT,
  },
  tabLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: DARK,
    fontWeight: '700',
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="zones" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="members" options={{ href: null }} />
      <Tabs.Screen name="follow-up" options={{ href: null }} />
      <Tabs.Screen name="attendance" options={{ href: null }} />
    </Tabs>
  );
}
