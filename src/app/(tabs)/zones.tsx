import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ZonesScreen() {
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      <Text style={s.text}>Zones</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, fontWeight: '600', color: '#120D2E' },
});
