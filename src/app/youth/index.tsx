import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, StatusBar,
  ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';
import { useAuthStore } from '../../stores/auth.store';

interface Birthday { id: string; firstName: string; lastName: string; phone: string; month: number; day: number; inDays: number }
interface Summary { total: number; male: number; female: number; flagged: number; newThisMonth: number; upcomingBirthdays: Birthday[] }
interface Youth { id: string; firstName: string; lastName: string; phone: string; status: string; gender: string | null; departmentName: string | null; tags?: string[] }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FOLLOW_UP_TAG = 'Follow-Up Needed';
const when = (b: Birthday) => (b.inDays === 0 ? 'Today' : b.inDays === 1 ? 'Tomorrow' : `in ${b.inDays} days`);
const PASTOR_ROLES = ['senior_pastor', 'branch_pastor'];

/** Youth records: everyone marked "Is a Youth" (they also stay in the main members list). */
export default function YouthHome() {
  const router = useRouter();
  const role = (useAuthStore((st) => st.user?.role) ?? '').toLowerCase();
  const isSenior = role === 'senior_pastor' || role === 'super_admin';
  const isPastor = PASTOR_ROLES.includes(role);
  const scope = isSenior ? 'all' : undefined;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [youth, setYouth] = useState<Youth[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    const mine = ++seq.current; // ignore out-of-order answers while typing
    try {
      setError('');
      const [sum, list] = await Promise.all([
        api.get('/members/youth/summary', { params: { scope } }),
        api.get('/members', { params: { youth: 'true', search: q.trim() || undefined, limit: 500, scope } }),
      ]);
      if (seq.current === mine) { setSummary(sum.data); setYouth(list.data ?? []); }
    } catch (e: any) {
      if (seq.current === mine) setError(e?.response?.data?.message ?? 'Could not load the youth records.');
    } finally {
      if (seq.current === mine) { setLoading(false); setRefreshing(false); }
    }
  }, [scope]);

  useFocusEffect(useCallback(() => { load(search); }, [load]));

  const onSearch = (text: string) => {
    setSearch(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(text), 300);
  };

  const wish = (b: Birthday) => {
    const text = encodeURIComponent(`Happy birthday ${b.firstName}! We celebrate you today. God bless you.`);
    Linking.openURL(`https://wa.me/${b.phone.replace(/\D/g, '')}?text=${text}`).catch(() => {});
  };

  const stats: [string, number, string][] = summary
    ? [
        ['Total', summary.total, C.textDark],
        ['Female', summary.female, C.textDark],
        ['Male', summary.male, C.textDark],
        ['New / month', summary.newThisMonth, '#15803D'],
        ['Follow-up', summary.flagged, summary.flagged ? C.error : C.textDark],
      ]
    : [];

  const header = (
    <View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      {summary && (
        <>
          <View style={s.stats}>
            {stats.map(([label, value, color]) => (
              <View key={label} style={s.stat}>
                <Text style={[s.statValue, { color }]}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.listLabel}>BIRTHDAYS · NEXT 30 DAYS</Text>
          {summary.upcomingBirthdays.length === 0 ? (
            <Text style={s.muted}>None coming up. Only youths with a birth date (day and month) appear here.</Text>
          ) : (
            summary.upcomingBirthdays.map((b) => (
              <View key={b.id} style={s.bday}>
                <Ionicons name="gift-outline" size={18} color="#C026D3" />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{b.firstName} {b.lastName}</Text>
                  <Text style={s.meta}>{b.day} {MONTHS[b.month - 1]} · {when(b)}</Text>
                </View>
                <TouchableOpacity onPress={() => wish(b)} accessibilityLabel={`Send ${b.firstName} a birthday wish`}>
                  <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
                </TouchableOpacity>
              </View>
            ))
          )}
          <Text style={[s.listLabel, { marginTop: 18 }]}>{search ? 'RESULTS' : 'ALL YOUTH'}</Text>
        </>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}><Ionicons name="arrow-back" size={22} color={C.white} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Youth</Text>
            <Text style={s.sub}>{summary ? `${summary.total} young ${summary.total === 1 ? 'person' : 'people'}` : 'Youth records'}</Text>
          </View>
          {isPastor && (
            <TouchableOpacity style={s.pillBtn} onPress={() => router.push('/event-registration/create' as any)} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color={C.dark} />
              <Text style={s.pillBtnText}>Add event</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color={C.textGray} />
          <TextInput style={s.searchInput} placeholder="Search youth..." placeholderTextColor={C.textGray} value={search} onChangeText={onSearch} autoCorrect={false} />
          {search.length > 0 && <TouchableOpacity onPress={() => onSearch('')}><Ionicons name="close-circle" size={18} color={C.textGray} /></TouchableOpacity>}
        </View>

        {loading ? (
          <View style={s.centered}><ActivityIndicator size="large" color={C.accent} /></View>
        ) : (
          <FlatList
            data={youth}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(search); }} tintColor={C.accent} />}
            ListHeaderComponent={header}
            ListEmptyComponent={
              !error ? (
                <View style={s.centered}>
                  <Ionicons name="sparkles-outline" size={54} color={C.border} />
                  <Text style={s.emptyTitle}>{search ? 'No youth found' : 'No youth yet'}</Text>
                  <Text style={s.emptySub}>{search ? 'Try a different name.' : 'Switch on "Is a Youth" when registering or editing a member.'}</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => router.push({ pathname: '/members/[id]', params: { id: item.id } } as any)}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.firstName} {item.lastName}</Text>
                  <Text style={s.meta}>{item.phone}{item.departmentName ? ` · ${item.departmentName}` : ''}</Text>
                </View>
                {item.tags?.includes(FOLLOW_UP_TAG) && <Ionicons name="flag" size={16} color={C.error} />}
                <Ionicons name="chevron-forward" size={18} color={C.textGray} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '800', color: C.white },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  pillBtnText: { fontWeight: '800', fontSize: 13, color: C.dark },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: C.textDark },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 18, marginTop: 8 },
  stat: { flex: 1, backgroundColor: C.white, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: C.textGray, marginTop: 2, fontWeight: '600' },
  listLabel: { fontSize: 11, fontWeight: '800', color: C.textGray, letterSpacing: 1, marginBottom: 10 },
  muted: { fontSize: 13, color: C.textGray },
  error: { color: C.error, textAlign: 'center', marginBottom: 12 },
  bday: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  name: { fontSize: 15, fontWeight: '700', color: C.textDark },
  meta: { fontSize: 12, color: C.textGray, marginTop: 2 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center' },
});
