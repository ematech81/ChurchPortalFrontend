import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';

const C = { dark: '#120D2E', accent: '#F5C518', white: '#FFFFFF', bg: '#F2F2F7', textDark: '#120D2E', textGray: '#8888A0' };

interface Journey { id: string; memberId: string; journeyStage: string | null; journeyProgress: number; urgent: boolean; member?: { firstName: string; lastName: string; phone: string; status: string } | null; progressPercent?: number; }

export default function ConvertsScreen() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/follow-up/worker/portal');
      setJourneys(res.data?.activeJourneys ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={{ flex: 1, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.accent} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <Text style={s.title}>My Converts</Text>
          <Text style={s.sub}>{journeys.length} active</Text>
        </View>
      </SafeAreaView>
      <FlatList
        data={journeys}
        keyExtractor={(j) => j.id}
        style={{ backgroundColor: C.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="people-outline" size={48} color={C.textGray} /><Text style={s.emptyText}>No converts assigned yet.</Text></View>}
        renderItem={({ item }) => {
          const m = item.member;
          const pct = item.progressPercent ?? item.journeyProgress ?? 0;
          return (
            <View style={s.card}>
              <View style={s.avatar}><Text style={s.avatarText}>{m ? `${m.firstName[0]}${m.lastName[0]}`.toUpperCase() : '??'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{m ? `${m.firstName} ${m.lastName}` : 'Unknown'}</Text>
                <Text style={s.stage}>{item.journeyStage ?? 'Active Follow-up'}</Text>
                <View style={s.barTrack}><View style={[s.barFill, { width: `${pct}%` as any }]} /></View>
              </View>
              <Text style={s.pct}>{pct}%</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#F5C518' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: C.textGray, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: C.accent },
  name: { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 2 },
  stage: { fontSize: 12, color: '#3B82F6', marginBottom: 6 },
  barTrack: { height: 6, backgroundColor: C.bg, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: C.dark, borderRadius: 3 },
  pct: { fontSize: 13, fontWeight: '700', color: C.textGray, width: 38, textAlign: 'right' },
});
