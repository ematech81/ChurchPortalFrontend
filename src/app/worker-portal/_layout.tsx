import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = { dark: '#120D2E', accent: '#F5C518', white: '#FFFFFF', gray: '#8888A0' };

export default function WorkerPortalLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, descriptors, navigation }) => (
        <View style={[tb.bar, { paddingBottom: insets.bottom || 12 }]}>
          {state.routes.map((route, i) => {
            const { options } = descriptors[route.key];
            const focused = state.index === i;
            const icon = (options as any).tabBarIcon?.({ focused, color: focused ? C.dark : C.gray, size: 22 });
            const label = (options.tabBarLabel ?? route.name) as string;

            return (
              <View key={route.key} style={tb.tabItem}>
                <View style={[tb.tabInner, focused && tb.tabInnerActive]}>
                  {icon}
                  <Text style={[tb.tabLabel, focused && tb.tabLabelActive]}>{label}</Text>
                </View>
              </View>
            );
          })}

          {/* FAB */}
          <View style={[tb.fab, { bottom: insets.bottom + 16 }]}>
            <Ionicons name="add" size={26} color={C.dark} />
          </View>
        </View>
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="converts"
        options={{
          tabBarLabel: 'Converts',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const tb = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: '#E8E8EF',
    paddingTop: 10, paddingHorizontal: 8,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabInner: { alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  tabInnerActive: { backgroundColor: C.dark },
  tabLabel: { fontSize: 10, fontWeight: '600', color: C.gray },
  tabLabelActive: { color: C.accent },
  fab: {
    position: 'absolute', right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
});
