import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, StatusBar, ActivityIndicator,
  Alert, Share, Modal, ScrollView, Linking, RefreshControl,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { saveAndShare } from '../../utils/save-and-share';
import { C } from '../../constants/theme';
import { EventSummary, Registration, STATUS_STYLE, FormField } from '../../types/event-registration';

const PAGE = 50;

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
const shortWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function answerText(f: FormField, v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (f.type === 'yes_no') return v === 'yes' ? 'Yes' : 'No';
  return String(v);
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Registration | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRegs = useCallback(async (q: string, page: number, append: boolean) => {
    const mine = ++seq.current;
    try {
      const res = await api.get(`/event-forms/${id}/registrations`, { params: { search: q.trim() || undefined, page, limit: PAGE } });
      if (seq.current !== mine) return;
      setRegs((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setTotal(res.data.total);
    } catch (e: any) {
      if (seq.current === mine) setError(e?.response?.data?.message ?? 'Could not load responses.');
    }
  }, [id]);

  const loadAll = useCallback(async (q = search) => {
    try {
      setError('');
      const ev = await api.get<EventSummary>(`/event-forms/${id}`);
      setEvent(ev.data);
      await loadRegs(q, 1, false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not load this event.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, loadRegs]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const onSearch = (t: string) => {
    setSearch(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => loadRegs(t, 1, false), 300);
  };

  const loadMore = async () => {
    if (loadingMore || regs.length >= total) return;
    setLoadingMore(true);
    await loadRegs(search, Math.floor(regs.length / PAGE) + 1, true);
    setLoadingMore(false);
  };

  const link = event?.shareUrl ?? null;

  const copyLink = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link);
    Alert.alert('Copied', 'The registration link is copied. Paste it into WhatsApp, Facebook or anywhere.');
  };
  const shareLink = () => {
    if (!link || !event) return;
    Share.share({ message: `Register for ${event.title}${event.startsAt ? ` (${new Date(event.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })})` : ''}:\n${link}` });
  };

  const toggleOpen = async () => {
    if (!event) return;
    setBusy(true);
    try {
      const res = await api.patch(`/event-forms/${id}`, { isOpen: !event.isOpen });
      setEvent((prev) => (prev ? { ...prev, isOpen: res.data.isOpen, status: res.data.status } : prev));
    } catch (e: any) {
      Alert.alert('Could not update', e?.response?.data?.message ?? 'Please try again.');
    } finally { setBusy(false); }
  };

  const doExport = async (format: 'xlsx' | 'csv') => {
    setShowExport(false);
    setBusy(true);
    try {
      const res = await api.post(`/event-forms/${id}/export`, { format });
      const { count, ...file } = res.data;
      if (!count) { Alert.alert('Nothing to export', 'No one has registered yet.'); return; }
      await saveAndShare(file);
    } catch (e: any) {
      Alert.alert('Could not export', e?.response?.data?.message ?? e?.message ?? 'Please try again.');
    } finally { setBusy(false); }
  };

  const deleteEvent = () => {
    Alert.alert(
      'Delete this event?',
      'The registration link will stop working. This cannot be undone from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await api.delete(`/event-forms/${id}`); router.replace('/event-registration' as any); }
            catch (e: any) { Alert.alert('Could not delete', e?.response?.data?.message ?? 'Please try again.'); }
          },
        },
      ],
    );
  };

  const removeRegistration = (r: Registration) => {
    Alert.alert('Remove registration?', `${r.fullName} will be removed and can register again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/event-forms/${id}/registrations/${r.id}`);
            setSelected(null);
            loadAll();
          } catch (e: any) { Alert.alert('Could not remove', e?.response?.data?.message ?? 'Please try again.'); }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  }
  if (!event) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ color: C.white, textAlign: 'center', marginBottom: 16 }}>{error || 'Event not found.'}</Text>
        <TouchableOpacity style={s.cta} onPress={() => router.back()}><Text style={s.ctaText}>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  const st = STATUS_STYLE[event.status] ?? STATUS_STYLE.closed;
  const spotsLeft = event.capacity ? Math.max(event.capacity - event.registrationCount, 0) : null;

  const header = (
    <View>
      {created === '1' && (
        <View style={s.banner}>
          <Ionicons name="checkmark-circle" size={20} color="#166534" />
          <Text style={s.bannerText}>Event created. Share the link below so people can register.</Text>
        </View>
      )}

      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.eventTitle}>{event.title}</Text>
          <View style={[s.pill, { backgroundColor: st.bg }]}><Text style={[s.pillText, { color: st.fg }]}>{st.label}</Text></View>
        </View>
        {when(event.startsAt) && <Text style={s.meta}><Ionicons name="calendar-outline" size={13} /> {when(event.startsAt)}</Text>}
        {event.venue && <Text style={s.meta}><Ionicons name="location-outline" size={13} /> {event.venue}</Text>}
        {event.registrationClosesAt && <Text style={s.meta}><Ionicons name="time-outline" size={13} /> Closes {when(event.registrationClosesAt)}</Text>}
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{event.registrationCount}</Text><Text style={s.statLabel}>registered</Text></View>
          {spotsLeft !== null && <View style={s.stat}><Text style={s.statNum}>{spotsLeft}</Text><Text style={s.statLabel}>spots left</Text></View>}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Shareable registration link</Text>
        {link ? (
          <>
            <TouchableOpacity style={s.linkBox} onPress={copyLink} activeOpacity={0.8}>
              <Ionicons name="link" size={16} color={C.textGray} />
              <Text style={s.linkText} numberOfLines={1}>{link}</Text>
            </TouchableOpacity>
            <View style={s.btnRow}>
              <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={shareLink} activeOpacity={0.85}>
                <Ionicons name="share-social" size={18} color={C.dark} /><Text style={s.btnPrimaryText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={copyLink} activeOpacity={0.85}>
                <Ionicons name="copy-outline" size={18} color={C.dark} /><Text style={s.btnOutlineText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={() => Linking.openURL(link)} activeOpacity={0.85}>
                <Ionicons name="open-outline" size={18} color={C.dark} /><Text style={s.btnOutlineText}>Preview</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={s.warn}>The link is not available yet: the server's PUBLIC_WEB_URL setting has not been configured.</Text>
        )}
      </View>

      <View style={s.btnRow}>
        <TouchableOpacity style={[s.btn, s.btnOutline, { backgroundColor: C.white }]} onPress={toggleOpen} disabled={busy} activeOpacity={0.85}>
          <Ionicons name={event.isOpen ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color={C.dark} />
          <Text style={s.btnOutlineText}>{event.isOpen ? 'Close registration' : 'Reopen registration'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnOutline, { backgroundColor: C.white }]} onPress={() => router.push({ pathname: '/event-registration/create', params: { id } } as any)} activeOpacity={0.85}>
          <Ionicons name="create-outline" size={18} color={C.dark} /><Text style={s.btnOutlineText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.rowBetween, { marginTop: 22, marginBottom: 10 }]}>
        <Text style={s.sectionTitle}>RESPONSES ({total})</Text>
        <TouchableOpacity style={s.exportBtn} onPress={() => setShowExport(true)} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator size="small" color={C.dark} /> : <Ionicons name="download-outline" size={16} color={C.dark} />}
          <Text style={s.exportText}>Export</Text>
        </TouchableOpacity>
      </View>
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={C.textGray} />
        <TextInput style={s.searchInput} placeholder="Search name, phone or ticket..." placeholderTextColor={C.textGray} value={search} onChangeText={onSearch} autoCorrect={false} />
        {search.length > 0 && <TouchableOpacity onPress={() => onSearch('')}><Ionicons name="close-circle" size={18} color={C.textGray} /></TouchableOpacity>}
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.replace('/event-registration' as any)} style={{ padding: 4 }}><Ionicons name="arrow-back" size={22} color={C.white} /></TouchableOpacity>
          <Text style={s.topTitle} numberOfLines={1}>Event</Text>
          <TouchableOpacity onPress={deleteEvent} style={{ padding: 4 }}><Ionicons name="trash-outline" size={20} color="#FCA5A5" /></TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        style={{ backgroundColor: C.bg }}
        data={regs}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} tintColor={C.accent} />}
        ListHeaderComponent={header}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={C.accent} style={{ margin: 16 }} /> : null}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={44} color={C.border} />
            <Text style={s.emptyTitle}>{search ? 'No match' : 'No registrations yet'}</Text>
            {!search && <Text style={s.emptySub}>Share the link above. People will show up here as they register.</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.reg} onPress={() => setSelected(item)} activeOpacity={0.8}>
            <View style={s.avatar}><Text style={s.avatarText}>{item.fullName[0]?.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.regName}>{item.fullName}</Text>
              <Text style={s.regMeta}>{item.phone} · {shortWhen(item.createdAt)}</Text>
            </View>
            <Text style={s.ticket}>{item.ticketCode}</Text>
          </TouchableOpacity>
        )}
      />

      {/* One person's answers */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={[s.sheet, { maxHeight: '80%' }]} onStartShouldSetResponder={() => true}>
            {selected && (
              <>
                <Text style={s.sheetTitle}>{selected.fullName}</Text>
                <Text style={s.sheetSub}>Ticket {selected.ticketCode} · registered {shortWhen(selected.createdAt)}</Text>
                <ScrollView style={{ marginTop: 8 }}>
                  <View style={s.answerRow}><Text style={s.answerQ}>Phone</Text><Text style={s.answerA}>{selected.phone}</Text></View>
                  {event.fields.map((f) => (
                    <View key={f.id} style={s.answerRow}>
                      <Text style={s.answerQ}>{f.label}</Text>
                      <Text style={s.answerA}>{answerText(f, selected.answers?.[f.id])}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={s.btnRow}>
                  <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={() => Linking.openURL(`tel:${selected.phone}`)}><Ionicons name="call" size={18} color={C.dark} /><Text style={s.btnPrimaryText}>Call</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={() => Linking.openURL(`https://wa.me/${selected.phone.replace(/\D/g, '')}`)}><Ionicons name="logo-whatsapp" size={18} color={C.dark} /><Text style={s.btnOutlineText}>WhatsApp</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.btn, s.btnOutline, { borderColor: '#FCA5A5' }]} onPress={() => removeRegistration(selected)}><Ionicons name="trash-outline" size={18} color={C.error} /></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Export format */}
      <Modal visible={showExport} transparent animationType="slide" onRequestClose={() => setShowExport(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowExport(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Export responses</Text>
            <Text style={s.sheetSub}>All {event.registrationCount} registrations, one column per question.</Text>
            <TouchableOpacity style={s.formatRow} onPress={() => doExport('xlsx')}><Ionicons name="grid" size={22} color={C.dark} /><View><Text style={s.formatTitle}>Excel (.xlsx)</Text><Text style={s.formatSub}>Opens in Excel, Google Sheets, WPS</Text></View></TouchableOpacity>
            <TouchableOpacity style={s.formatRow} onPress={() => doExport('csv')}><Ionicons name="document-text" size={22} color={C.dark} /><View><Text style={s.formatTitle}>CSV (.csv)</Text><Text style={s.formatSub}>Plain table, works everywhere</Text></View></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.dark },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  topTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: C.white },
  cta: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  ctaText: { fontWeight: '800', color: C.dark },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#DCFCE7', borderRadius: 12, padding: 12, marginBottom: 14 },
  bannerText: { flex: 1, color: '#166534', fontWeight: '600', fontSize: 13 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 14, fontWeight: '800', color: C.textDark, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  eventTitle: { flex: 1, fontSize: 19, fontWeight: '800', color: C.textDark },
  pill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '800' },
  meta: { fontSize: 13, color: C.textGray, marginTop: 6 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 14 },
  stat: { flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: C.textDark },
  statLabel: { fontSize: 11, color: C.textGray, marginTop: 2 },
  linkBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  linkText: { flex: 1, fontSize: 13, color: C.textDark },
  warn: { fontSize: 13, color: '#92400E', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 12 },
  btnPrimary: { backgroundColor: C.accent },
  btnPrimaryText: { fontWeight: '800', color: C.dark, fontSize: 13 },
  btnOutline: { borderWidth: 1.5, borderColor: C.border },
  btnOutlineText: { fontWeight: '700', color: C.dark, fontSize: 13 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.textGray, letterSpacing: 1 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  exportText: { fontWeight: '800', color: C.dark, fontSize: 13 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: C.textDark },
  empty: { alignItems: 'center', padding: 30, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center' },
  reg: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.accent, fontWeight: '800', fontSize: 16 },
  regName: { fontSize: 15, fontWeight: '700', color: C.textDark },
  regMeta: { fontSize: 12, color: C.textGray, marginTop: 2 },
  ticket: { fontSize: 12, fontWeight: '800', color: C.textGray, letterSpacing: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.textDark },
  sheetSub: { fontSize: 12, color: C.textGray, marginTop: 4 },
  answerRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  answerQ: { fontSize: 11, fontWeight: '700', color: C.textGray, marginBottom: 3 },
  answerA: { fontSize: 15, color: C.textDark },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  formatTitle: { fontSize: 15, fontWeight: '700', color: C.textDark },
  formatSub: { fontSize: 12, color: C.textGray, marginTop: 2 },
});
