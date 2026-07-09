import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = { dark: '#120D2E', accent: '#F5C518', white: '#FFFFFF', textGray: '#8888A0' };

export default function MessagesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}><Text style={s.title}>Messages</Text></View>
      </SafeAreaView>
      <View style={s.body}>
        <Ionicons name="chatbubbles-outline" size={60} color={C.textGray} />
        <Text style={s.heading}>Coming Soon</Text>
        <Text style={s.sub}>In-app messaging with your converts and pastor will appear here.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#F5C518' },
  body: { flex: 1, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  heading: { fontSize: 20, fontWeight: '800', color: C.dark },
  sub: { fontSize: 14, color: C.textGray, textAlign: 'center', lineHeight: 22 },
});
