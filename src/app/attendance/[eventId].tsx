import {
  View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string; firstName: string; lastName: string;
  phone: string; status: string; departmentName: string | null; tags: string[];
}

interface Event {
  id: string; title: string; type: string; date: string; notes: string | null;
}

// ── Status badge config ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  member:      { bg: '#DCFCE7', text: '#166534' },
  worker:      { bg: '#EDE9FE', text: '#5B21B6' },
  visitor:     { bg: '#FEF9C3', text: '#854D0E' },
  first_timer: { bg: '#DBEAFE', text: '#1E40AF' },
  minister:    { bg: '#FEF2F2', text: '#991B1B' },
  new_convert: { bg: '#CCFBF1', text: '#0F766E' },
};

const AT_RISK = { bg: '#FEF2F2', text: '#991B1B' };

function initials(m: Member) { return `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase(); }

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({ member, recordId, onToggle, toggling }: {
  member: Member;
  recordId: string | null;
  onToggle: () => void;
  toggling: boolean;
}) {
  const checked = !!recordId;
  const isAtRisk = member.tags?.includes('Follow-Up Needed');
  const sc = isAtRisk ? AT_RISK : (STATUS_COLORS[member.status] ?? { bg: C.bg, text: C.textGray });
  const badgeLabel = isAtRisk ? 'AT RISK' : member.status.replace('_', ' ').toUpperCase();

  return (
    <View style={r.row}>
      <View style={r.avatar}>
        <Text style={r.avatarText}>{initials(member)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={r.name}>{member.firstName} {member.lastName}</Text>
        <View style={r.meta}>
          <View style={[r.badge, { backgroundColor: sc.bg }]}>
            <Text style={[r.badgeText, { color: sc.text }]}>{badgeLabel}</Text>
          </View>
          {member.departmentName && (
            <Text style={r.dept} numberOfLines={1}>{member.departmentName}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[r.toggleBtn, checked && r.toggleBtnChecked]}
        onPress={onToggle}
        disabled={toggling}
        activeOpacity={0.8}
      >
        {toggling ? (
          <ActivityIndicator size="small" color={checked ? C.dark : C.dark} />
        ) : (
          <>
            <Ionicons
              name={checked ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={checked ? C.dark : C.dark}
            />
            <Text style={[r.toggleText, checked && r.toggleTextChecked]}>
              {checked ? 'Checked' : 'Check-in'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  // Map: memberId → recordId (null means not checked in)
  const [checkedInMap, setCheckedInMap] = useState<Map<string, string>>(new Map());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [evRes, membersRes, recordsRes, countRes] = await Promise.all([
        api.get('/attendance/events'),
        api.get('/members', { params: { limit: 500 } }),
        api.get(`/attendance/events/${eventId}/records`),
        api.get('/members/count'),
      ]);

      const ev = evRes.data.find((e: Event) => e.id === eventId);
      setEvent(ev ?? null);
      setMembers(membersRes.data);
      setTotalMembers(typeof countRes.data === 'number' ? countRes.data : countRes.data?.count ?? 0);

      const map = new Map<string, string>();
      (recordsRes.data as Array<{ id: string; member: { id: string } | null }>)
        .filter((r) => r.member)
        .forEach((r) => map.set(r.member!.id, r.id));
      setCheckedInMap(map);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [eventId]);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleToggle = async (member: Member) => {
    const recordId = checkedInMap.get(member.id) ?? null;
    setTogglingIds((prev) => new Set(prev).add(member.id));
    try {
      if (recordId) {
        await api.delete(`/attendance/events/${eventId}/records/${recordId}`);
        setCheckedInMap((prev) => { const m = new Map(prev); m.delete(member.id); return m; });
      } else {
        const res = await api.post(`/attendance/events/${eventId}/check-in`, { memberId: member.id });
        setCheckedInMap((prev) => new Map(prev).set(member.id, res.data.id));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : (msg ?? 'Action failed.'));
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(member.id); return s; });
    }
  };

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.phone.includes(q),
    );
  }, [members, search]);

  const checkedInCount = checkedInMap.size;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.dark }}>
        <StatusBar barStyle="light-content" backgroundColor={C.dark} />
        <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{event?.title ?? 'Check-In'}</Text>
            <Text style={s.headerSub}>
              {event ? new Date(event.date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/attendance/report', params: { eventId } } as any)}
            style={s.reportBtn}
          >
            <Ionicons name="bar-chart-outline" size={20} color={C.accent} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: C.darkCard }]}>
            <Text style={s.statLabel}>CHECKED-IN</Text>
            <Text style={s.statValue}>{checkedInCount} <Text style={s.statUnit}>Present</Text></Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statLabel, { color: C.textGray }]}>TOTAL MEMBERS</Text>
            <Text style={[s.statValue, { color: C.textDark }]}>{totalMembers} <Text style={[s.statUnit, { color: C.textGray }]}>Registered</Text></Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color={C.textGray} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search members to check-in"
            placeholderTextColor={C.textGray}
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={C.textGray} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Member list */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(m) => m.id}
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={C.accent} />}
        renderItem={({ item: member }) => (
          <MemberRow
            member={member}
            recordId={checkedInMap.get(member.id) ?? null}
            onToggle={() => handleToggle(member)}
            toggling={togglingIds.has(member.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.bg }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={C.border} />
            <Text style={s.emptyTitle}>{search ? 'No members match your search' : 'No members registered'}</Text>
          </View>
        }
      />

      {/* Finish CTA */}
      <View style={s.finishWrap}>
        <TouchableOpacity
          style={s.finishBtn}
          onPress={() => router.back()}
          activeOpacity={0.9}
        >
          <Ionicons name="checkmark-circle" size={20} color={C.white} />
          <Text style={s.finishText}>Finish Recording Attendance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Row styles ────────────────────────────────────────────────────────────────

const r = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: C.accent },
  name: { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  dept: { fontSize: 11, color: C.textGray, flex: 1 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.dark, minWidth: 92, justifyContent: 'center',
  },
  toggleBtnChecked: { backgroundColor: C.dark },
  toggleText: { fontSize: 13, fontWeight: '700', color: C.dark },
  toggleTextChecked: { color: C.white },
});

// ── Screen styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  reportBtn: { padding: 4, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 },
  statLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '800', color: C.white },
  statUnit: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.6)' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, marginHorizontal: 16, marginBottom: 0,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark },

  empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyTitle: { fontSize: 15, color: C.textGray, textAlign: 'center', paddingHorizontal: 32 },

  finishWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  finishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.dark, borderRadius: 14, paddingVertical: 16 },
  finishText: { fontSize: 15, fontWeight: '800', color: C.white },
});
