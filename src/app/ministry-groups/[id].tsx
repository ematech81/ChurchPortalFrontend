import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

const C = {
  dark: '#120D2E', darkCard: '#1E1650', accent: '#F5C518',
  bg: '#F2F2F7', white: '#FFFFFF', textDark: '#120D2E',
  textGray: '#8888A0', border: '#E8E8EF', error: '#FF4C4C',
  navy: '#1A2B5C', gold: '#B8860B',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active:     { bg: 'rgba(245,197,24,0.18)', text: C.accent,   label: 'ACTIVE' },
  core:       { bg: C.dark,                  text: C.white,    label: 'CORE' },
  recruiting: { bg: '#EDE9FE',               text: '#5B21B6',  label: 'RECRUITING' },
  inactive:   { bg: C.bg,                    text: C.textGray, label: 'INACTIVE' },
  draft:      { bg: '#FEF9C3',               text: '#92400E',  label: 'DRAFT' },
};

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const st = STATUS_STYLES[status] ?? STATUS_STYLES.inactive;
  return (
    <View style={[pl.wrap, { backgroundColor: st.bg }]}>
      <Text style={[pl.text, { color: st.text }]}>{st.label}</Text>
    </View>
  );
}
const pl = StyleSheet.create({
  wrap: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
});

// ── Bar chart (attendance trends) ─────────────────────────────────────────────
function AttendanceChart({ attendance }: { attendance: any[] }) {
  if (!attendance.length) {
    return (
      <View style={ch.empty}>
        <Ionicons name="bar-chart-outline" size={32} color="rgba(255,255,255,0.3)" />
        <Text style={ch.emptyText}>No attendance recorded yet</Text>
      </View>
    );
  }

  const max = Math.max(...attendance.map((a) => a.totalCount ?? 1), 1);

  return (
    <View style={ch.wrap}>
      {attendance.map((a, i) => {
        const present = a.presentCount ?? 0;
        const total = a.totalCount ?? 0;
        const pct = total > 0 ? (present / total) * 100 : 0;
        const barHeight = Math.max(4, (total / max) * 80);
        const fillHeight = Math.max(0, (pct / 100) * barHeight);
        const label = a.date ? a.date.slice(5) : `#${i + 1}`; // MM-DD

        return (
          <View key={i} style={ch.col}>
            <Text style={ch.pct}>{Math.round(pct)}%</Text>
            <View style={[ch.bar, { height: barHeight }]}>
              <View style={[ch.fill, { height: fillHeight }]} />
            </View>
            <Text style={ch.label}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
const ch = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, minHeight: 100, paddingVertical: 8 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  fill: { width: '100%', backgroundColor: C.accent, borderRadius: 4 },
  pct: { fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  label: { fontSize: 8, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  emptyText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});

// ── Member row ────────────────────────────────────────────────────────────────
function MemberRow({ membership, onPress }: { membership: any; onPress: () => void }) {
  const m = membership.member;
  if (!m) return null;
  const initials = `${m.firstName?.[0] ?? ''}${m.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <TouchableOpacity style={mr.row} onPress={onPress} activeOpacity={0.75}>
      <View style={mr.avatar}>
        <Text style={mr.avatarText}>{initials}</Text>
      </View>
      <View style={mr.info}>
        <Text style={mr.name}>{m.firstName} {m.lastName}</Text>
        <Text style={mr.role}>{membership.roleTitle ?? 'Member'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.textGray} />
    </TouchableOpacity>
  );
}
const mr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '800', color: C.accent },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: C.textDark },
  role: { fontSize: 11, color: C.textGray, marginTop: 1 },
});

// ── Quick action button ───────────────────────────────────────────────────────
function QuickAction({ icon, label, onPress, color }: {
  icon: string; label: string; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity style={qa.btn} onPress={onPress} activeOpacity={0.8}>
      <View style={[qa.icon, color ? { backgroundColor: color } : {}]}>
        <Ionicons name={icon as any} size={18} color={C.accent} />
      </View>
      <Text style={qa.label}>{label}</Text>
    </TouchableOpacity>
  );
}
const qa = StyleSheet.create({
  btn: { alignItems: 'center', gap: 6, flex: 1 },
  icon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.darkCard,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 10, fontWeight: '700', color: C.textGray, textAlign: 'center', letterSpacing: 0.3 },
});

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[cd.card, style]}>{children}</View>;
}
const cd = StyleSheet.create({
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isPastor = ['senior_pastor', 'branch_pastor'].includes((user?.role ?? '').toLowerCase());

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/ministry-groups/${id}`);
      setGroup(res.data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not load group');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAddMember = () => {
    Alert.alert('Add Member', 'Member search & add coming soon.');
  };

  const handleScheduleMeeting = () => {
    Alert.alert('Schedule Meeting', 'Meeting scheduling coming soon.');
  };

  const handleMessageAll = () => {
    Alert.alert('Message All', 'Group messaging coming soon.');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Ionicons name="alert-circle-outline" size={48} color={C.textGray} />
        <Text style={{ fontSize: 16, color: C.textGray }}>Group not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: C.accent, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const leader = group.leader;
  const leaderInitials = leader
    ? `${leader.firstName?.[0] ?? ''}${leader.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const memberships: any[] = group.memberships ?? [];
  const attendance: any[] = group.attendance ?? [];
  const growthPct: number | null = group.growthPct ?? null;

  // Compute avg attendance rate
  const attendancePct = attendance.length
    ? Math.round(
        attendance.reduce((sum, a) => {
          const t = a.totalCount ?? 0;
          return sum + (t > 0 ? (a.presentCount / t) * 100 : 0);
        }, 0) / attendance.length,
      )
    : null;

  const visibleMembers = memberships.slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>Group Detail</Text>
          {isPastor && (
            <TouchableOpacity style={s.headerBtn} onPress={() => Alert.alert('Edit', 'Edit coming soon.')}>
              <Ionicons name="create-outline" size={22} color={C.accent} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Hero block ─────────────────────────────────────── */}
        <View style={s.hero}>
          {/* Initials placeholder (cover image not yet supported) */}
          <View style={s.heroCover}>
            <Text style={s.heroInitials}>
              {group.name
                .split(' ')
                .slice(0, 2)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase()}
            </Text>
          </View>

          <StatusPill status={group.status} />
          <Text style={s.heroName}>{group.name}</Text>
          {group.description ? (
            <Text style={s.heroDesc}>{group.description}</Text>
          ) : null}

          {/* Leader block */}
          {leader && (
            <View style={s.leaderBlock}>
              <View style={s.leaderAvatar}>
                <Text style={s.leaderAvatarText}>{leaderInitials}</Text>
              </View>
              <View>
                <Text style={s.leaderRole}>{group.leaderRoleTitle ?? 'LEADER'}</Text>
                <Text style={s.leaderName}>{leader.firstName} {leader.lastName}</Text>
              </View>
            </View>
          )}

          {/* Meta pills */}
          <View style={s.metaRow}>
            <View style={s.metaPill}>
              <Ionicons name="people-outline" size={13} color={C.accent} />
              <Text style={s.metaText}>{group.memberCount ?? 0} Members</Text>
            </View>
            {(group.cadence || group.meetingDay) && (
              <View style={s.metaPill}>
                <Ionicons name="calendar-outline" size={13} color={C.accent} />
                <Text style={s.metaText}>{group.cadence ?? group.meetingDay}</Text>
              </View>
            )}
            {group.meetingTime && (
              <View style={s.metaPill}>
                <Ionicons name="time-outline" size={13} color={C.accent} />
                <Text style={s.metaText}>{group.meetingTime}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Content area ───────────────────────────────────── */}
        <View style={{ padding: 16 }}>

          {/* Quick actions */}
          <Card>
            <View style={s.actionsRow}>
              <QuickAction icon="chatbubble-ellipses-outline" label="MESSAGE ALL" onPress={handleMessageAll} />
              <QuickAction icon="calendar-outline" label="SCHEDULE MTG" onPress={handleScheduleMeeting} />
              {isPastor && (
                <QuickAction icon="person-add-outline" label="ADD MEMBER" onPress={handleAddMember} />
              )}
            </View>
          </Card>

          {/* Attendance Trends */}
          <View style={s.navyCard}>
            <View style={s.cardHeader}>
              <Ionicons name="bar-chart-outline" size={16} color={C.accent} />
              <Text style={s.navyCardTitle}>Attendance Trends</Text>
              {attendancePct !== null && (
                <View style={s.pctBadge}>
                  <Text style={s.pctBadgeText}>AVG {attendancePct}%</Text>
                </View>
              )}
            </View>
            <Text style={s.navyCardSub}>Last {attendance.length} sessions</Text>
            <AttendanceChart attendance={attendance} />
          </View>

          {/* Growth card */}
          {growthPct !== null && (
            <View style={s.goldCard}>
              <View style={s.cardHeader}>
                <Ionicons
                  name={growthPct >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                  size={16}
                  color={C.dark}
                />
                <Text style={s.goldCardTitle}>Quarter-on-Quarter Growth</Text>
              </View>
              <Text style={s.growthPct}>
                {growthPct >= 0 ? '+' : ''}{growthPct}%
              </Text>
              <Text style={s.growthSub}>
                {growthPct >= 0
                  ? 'Membership is growing this quarter'
                  : 'Membership declined this quarter'}
              </Text>
            </View>
          )}

          {/* Members table */}
          <Card>
            <View style={s.cardHeader}>
              <Ionicons name="people-outline" size={16} color={C.dark} />
              <Text style={s.cardTitle}>Current Members</Text>
              <Text style={s.memberCount}>{group.memberCount ?? 0}</Text>
            </View>

            {memberships.length === 0 ? (
              <View style={s.emptyMembers}>
                <Ionicons name="person-outline" size={28} color={C.border} />
                <Text style={s.emptyMembersText}>No members yet</Text>
              </View>
            ) : (
              <>
                {visibleMembers.map((m: any) => (
                  <MemberRow
                    key={m.id}
                    membership={m}
                    onPress={() =>
                      router.push({
                        pathname: '/members/[id]',
                        params: { id: m.memberId },
                      } as any)
                    }
                  />
                ))}
                {memberships.length > 5 && (
                  <TouchableOpacity style={s.viewAllBtn} activeOpacity={0.8}>
                    <Text style={s.viewAllText}>VIEW ALL {memberships.length} MEMBERS</Text>
                    <Ionicons name="arrow-forward" size={14} color={C.accent} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </Card>

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerBtn: { padding: 4, width: 34 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white, flex: 1, textAlign: 'center' },

  // Hero
  hero: {
    backgroundColor: C.dark, paddingHorizontal: 20, paddingBottom: 28,
    alignItems: 'center', gap: 8,
  },
  heroCover: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.darkCard,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    borderWidth: 2, borderColor: C.accent,
  },
  heroInitials: { fontSize: 24, fontWeight: '900', color: C.accent },
  heroName: { fontSize: 22, fontWeight: '900', color: C.white, textAlign: 'center' },
  heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 19 },
  leaderBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 4,
  },
  leaderAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  leaderAvatarText: { fontSize: 11, fontWeight: '900', color: C.dark },
  leaderRole: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8 },
  leaderName: { fontSize: 13, fontWeight: '700', color: C.white },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  metaText: { fontSize: 11, color: C.white, fontWeight: '600' },

  // Quick actions
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around' },

  // Navy attendance card
  navyCard: {
    backgroundColor: C.navy, borderRadius: 16, padding: 16, marginBottom: 14,
  },
  navyCardTitle: { fontSize: 14, fontWeight: '800', color: C.white, flex: 1 },
  navyCardSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4, marginTop: 2 },

  // Gold growth card
  goldCard: {
    backgroundColor: C.accent, borderRadius: 16, padding: 16, marginBottom: 14,
  },
  goldCardTitle: { fontSize: 13, fontWeight: '800', color: C.dark, flex: 1 },
  growthPct: { fontSize: 42, fontWeight: '900', color: C.dark, letterSpacing: -1, marginTop: 4 },
  growthSub: { fontSize: 12, color: C.dark, opacity: 0.7, marginTop: 2 },

  // Card header shared
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: C.textDark, flex: 1 },
  memberCount: { fontSize: 12, fontWeight: '700', color: C.textGray },
  pctBadge: { backgroundColor: 'rgba(245,197,24,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  pctBadgeText: { fontSize: 9, fontWeight: '800', color: C.accent, letterSpacing: 0.6 },

  // Members
  emptyMembers: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  emptyMembersText: { fontSize: 13, color: C.textGray },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, marginTop: 4,
  },
  viewAllText: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 0.8 },
});
