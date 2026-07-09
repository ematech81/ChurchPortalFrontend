import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  dark: '#120D2E', accent: '#F5C518', white: '#FFFFFF',
  textGray: '#8888A0', bg: '#F2F2F7',
};

export default function MinistryGroupsAnalytics() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Ministry Analytics</Text>
          <View style={{ width: 34 }} />
        </View>
      </SafeAreaView>

      <View style={s.body}>
        <View style={s.iconRing}>
          <Ionicons name="analytics-outline" size={40} color={C.accent} />
        </View>
        <Text style={s.title}>Analytics Coming Soon</Text>
        <Text style={s.sub}>
          Group growth trends, attendance heatmaps, and member retention charts
          will be available here in a future update.
        </Text>
        <TouchableOpacity style={s.btn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.btnText}>BACK TO DIRECTORY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerBtn: { padding: 4, width: 34 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },

  body: {
    flex: 1, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 36,
  },
  iconRing: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: C.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '900', color: C.dark, textAlign: 'center' },
  sub: { fontSize: 13, color: C.textGray, textAlign: 'center', lineHeight: 20 },
  btn: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 13, marginTop: 8,
  },
  btnText: { fontSize: 12, fontWeight: '800', color: C.dark, letterSpacing: 1 },
});
