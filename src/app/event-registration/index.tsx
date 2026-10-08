import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, StatusBar,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';
import { EventSummary, STATUS_STYLE } from '../../types/event-registration';

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Date not set';

/** The one place for all event registrations: recent events, search, tap to see responses. */
export default function EventRegistrationHome() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
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
      const res = await api.get('/event-forms', { params: { search: q.trim() || undefined, limit: 50 } });
      if (seq.current === mine) setEvents(res.data ?? []);
    } catch (e: any) {
      if (seq.current === mine) setError(e?.response?.data?.message ?? 'Could not load events.');
    } finally {
      if (seq.current === mine) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => { load(search); }, [load]));

  const onSearch = (text: string) => {
    setSearch(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(text), 300);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Ionicons name="arrow-back" size={22} color={C.white} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Event Registration</Text>
            <Text style={s.sub}>Crusades, conferences & programmes</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/event-registration/create' as any)} activeOpacity={0.85}>
            <Ionicons name="add" size={22} color={C.dark} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color={C.textGray} />
          <TextInput style={s.searchInput} placeholder="Search events..." placeholderTextColor={C.textGray} value={search} onChangeText={onSearch} autoCorrect={false} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearch('')}><Ionicons name="close-circle" size={18} color={C.textGray} /></TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={s.centered}><ActivityIndicator size="large" color={C.accent} /></View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(search); }} tintColor={C.accent} />}
            ListHeaderComponent={error ? <Text style={s.error}>{error}</Text> : events.length ? <Text style={s.listLabel}>{search ? 'RESULTS' : 'RECENT EVENTS'}</Text> : null}
            ListEmptyComponent={
              !error ? (
                <View style={s.centered}>
                  <Ionicons name="ticket-outline" size={54} color={C.border} />
                  <Text style={s.emptyTitle}>{search ? 'No event found' : 'No events yet'}</Text>
                  <Text style={s.emptySub}>{search ? 'Try a different name.' : 'Create an event to get a link people can use to register.'}</Text>
                  {!search && (
                    <TouchableOpacity style={s.cta} onPress={() => router.push('/event-registration/create' as any)}>
                      <Text style={s.ctaText}>Create an event</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.closed;
              return (
                <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={() => router.push({ pathname: '/event-registration/[id]', params: { id: item.id } } as any)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={s.cardMeta}>{when(item.startsAt)}{item.venue ? ` · ${item.venue}` : ''}</Text>
                    {item.churchName && <Text style={s.cardChurch}>{item.churchName}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <View style={[s.pill, { backgroundColor: st.bg }]}><Text style={[s.pillText, { color: st.fg }]}>{st.label}</Text></View>
                    <Text style={s.count}>
                      {item.registrationCount}
                      <Text style={s.countOf}>{item.capacity ? ` / ${item.capacity}` : ''} registered</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  iconBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: C.white },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: C.textDark },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8, flex: 1 },
  listLabel: { fontSize: 11, fontWeight: '800', color: C.textGray, letterSpacing: 1, marginBottom: 10 },
  error: { color: C.error, textAlign: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center' },
  cta: { marginTop: 14, backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  ctaText: { fontWeight: '800', color: C.dark },
  card: { flexDirection: 'row', gap: 12, backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.textDark },
  cardMeta: { fontSize: 12, color: C.textGray, marginTop: 4 },
  cardChurch: { fontSize: 11, color: C.textGray, marginTop: 4, fontStyle: 'italic' },
  pill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '800' },
  count: { fontSize: 18, fontWeight: '800', color: C.textDark },
  countOf: { fontSize: 11, fontWeight: '600', color: C.textGray },
});
