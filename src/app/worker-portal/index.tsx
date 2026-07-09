import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

const C = {
  dark: '#120D2E', darkCard: '#1E1650', accent: '#F5C518',
  accentFaint: 'rgba(245,197,24,0.12)', white: '#FFFFFF',
  bg: '#F2F2F7', textDark: '#120D2E', textGray: '#8888A0',
  error: '#FF4C4C', blue: '#3B82F6', green: '#25D366',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member { id: string; firstName: string; lastName: string; phone: string; email: string | null; status: string; }
interface Journey { id: string; memberId: string; journeyStage: string | null; journeyProgress: number; urgent: boolean; dueDate: string | null; notes: string | null; member?: Member | null; progressPercent?: number; progress?: { total: number; done: number }; }
interface Visit { id: string; title: string; scheduledAt: string; address: string | null; context: string | null; latitude: number | null; longitude: number | null; }
interface PortalData { worker: { id: string; firstName: string; lastName: string; }; urgentCount: number; todaysTasks: Journey[]; activeJourneys: Journey[]; upcomingVisits: Visit[]; retentionRate: number; stats: { totalAssigned: number; converted: number; active: number }; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatVisitDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === now.toDateString()) return `TODAY, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  if (d.toDateString() === tomorrow.toDateString()) return `TOMORROW, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase() +
    `, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function initials(m?: Member | null) {
  if (!m) return '??';
  return `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase();
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  Linking.openURL(`https://maps.google.com/?q=${encoded}`);
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ journey }: { journey: Journey }) {
  const member = journey.member;
  const callPhone = () => member?.phone && Linking.openURL(`tel:${member.phone}`);
  const openWhatsApp = () => member?.phone && Linking.openURL(`https://wa.me/${member.phone.replace(/\D/g, '')}`);

  return (
    <View style={t.card}>
      <View style={t.avatar}>
        <Text style={t.avatarText}>{initials(member)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={t.name}>{member ? `${member.firstName} ${member.lastName}` : 'Unknown'}</Text>
        <Text style={t.reason} numberOfLines={2}>
          {journey.notes ?? journey.journeyStage ?? 'Follow-up task'}
        </Text>
      </View>
      <View style={t.actions}>
        <TouchableOpacity style={t.actionBtnGreen} onPress={openWhatsApp} activeOpacity={0.8}>
          <Ionicons name="chatbubble" size={16} color={C.white} />
        </TouchableOpacity>
        <TouchableOpacity style={t.actionBtnDark} onPress={callPhone} activeOpacity={0.8}>
          <Ionicons name="call" size={16} color={C.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Journey Row ───────────────────────────────────────────────────────────────

function JourneyRow({ journey }: { journey: Journey }) {
  const member = journey.member;
  const pct = journey.progressPercent ?? journey.journeyProgress ?? 0;
  const isLate = pct < 40;

  return (
    <View style={j.row}>
      <Text style={j.name}>{member ? `${member.firstName} ${member.lastName}` : 'Unknown'}</Text>
      <View style={j.stageRow}>
        <Text style={j.stage}>{journey.journeyStage ?? 'Active Follow-up'}</Text>
        <Text style={j.pct}>{pct}% Complete</Text>
      </View>
      <View style={j.barTrack}>
        <View style={[j.barFill, { width: `${pct}%` as any, backgroundColor: isLate ? C.accent : C.dark }]} />
      </View>
    </View>
  );
}

// ── Visit Card ────────────────────────────────────────────────────────────────

function VisitCard({ visit }: { visit: Visit }) {
  const hasLocation = !!(visit.address || (visit.latitude && visit.longitude));
  const getDirections = () => {
    if (visit.latitude && visit.longitude) {
      Linking.openURL(`https://maps.google.com/?q=${visit.latitude},${visit.longitude}`);
    } else if (visit.address) {
      openMaps(visit.address);
    }
  };

  return (
    <View style={v.card}>
      <Text style={v.dateLabel}>{formatVisitDate(visit.scheduledAt)}</Text>
      <Text style={v.title}>{visit.title}</Text>
      {(visit.address || visit.context) && (
        <Text style={v.context}>{visit.address ?? visit.context}</Text>
      )}
      {hasLocation && (
        <TouchableOpacity style={v.dirBtn} onPress={getDirections} activeOpacity={0.85}>
          <Ionicons name="map-outline" size={16} color={C.dark} />
          <Text style={v.dirBtnText}>Get Directions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function WorkerPortalScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/follow-up/worker/portal');
      setData(res.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const workerName = data?.worker
    ? `${data.worker.firstName} ${data.worker.lastName}`
    : user ? `${user.firstName} ${user.lastName}` : 'Worker';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Worker Portal</Text>
          <TouchableOpacity style={s.headerBtn}>
            <Ionicons name="help-circle-outline" size={22} color={C.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* Welcome block */}
        <View style={s.welcome}>
          <Text style={s.welcomeTitle}>Welcome back,{'\n'}{workerName}</Text>
          {(data?.urgentCount ?? 0) > 0 ? (
            <Text style={s.welcomeSub}>
              You have <Text style={s.urgent}>{data!.urgentCount} urgent</Text> follow-ups today.
            </Text>
          ) : (
            <Text style={s.welcomeSub}>You're all caught up for today.</Text>
          )}
        </View>

        {/* Today's Tasks */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="calendar-outline" size={18} color={C.dark} />
            <Text style={s.cardTitle}>Today's Tasks</Text>
            {(data?.urgentCount ?? 0) > 0 && (
              <View style={s.urgentPill}><Text style={s.urgentPillText}>URGENT</Text></View>
            )}
          </View>

          {data?.todaysTasks.length ? (
            data.todaysTasks.map((task) => <TaskCard key={task.id} journey={task} />)
          ) : (
            <View style={s.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={36} color={C.textGray} />
              <Text style={s.emptyText}>You're all caught up. New assignments will appear here.</Text>
            </View>
          )}
        </View>

        {/* Active Journeys */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Active Follow-up Journeys</Text>
          </View>

          {data?.activeJourneys.length ? (
            data.activeJourneys.map((journey) => <JourneyRow key={journey.id} journey={journey} />)
          ) : (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={36} color={C.textGray} />
              <Text style={s.emptyText}>No one in active follow-up yet. Assignments from your pastor will appear here.</Text>
            </View>
          )}
        </View>

        {/* Upcoming Visits */}
        {(data?.upcomingVisits?.length ?? 0) > 0 && (
          <View style={[s.card, s.cardNavy]}>
            <View style={s.cardHeader}>
              <Ionicons name="location" size={18} color={C.accent} />
              <Text style={[s.cardTitle, { color: C.white }]}>Upcoming Visits</Text>
            </View>
            {data!.upcomingVisits.map((visit) => <VisitCard key={visit.id} visit={visit} />)}
          </View>
        )}

        {/* Retention Rate */}
        <View style={s.cardAccent}>
          <Text style={s.retentionLabel}>RETENTION RATE</Text>
          <Text style={s.retentionValue}>{data?.retentionRate ?? 0}%</Text>
          <Text style={s.retentionSub}>
            {(data?.retentionRate ?? 0) >= 70
              ? 'Your converts are successfully transitioning to full members.'
              : 'Keep following up — every check-in matters.'}
          </Text>
          <View style={s.retentionGoalRow}>
            <Text style={s.retentionGoalText}>
              Weekly Goal  {data?.stats.converted ?? 0}/{data?.stats.totalAssigned ?? 0}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },

  welcome: { backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: C.bg },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: C.dark, lineHeight: 34, marginBottom: 8 },
  welcomeSub: { fontSize: 15, color: C.textGray, lineHeight: 22 },
  urgent: { color: C.error, fontWeight: '800' },

  card: { backgroundColor: C.white, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardNavy: { backgroundColor: C.dark },
  cardAccent: { backgroundColor: C.accent, marginHorizontal: 16, marginTop: 16, borderRadius: 18, padding: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.dark },
  urgentPill: { backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  urgentPillText: { fontSize: 10, fontWeight: '800', color: C.dark, letterSpacing: 0.5 },

  empty: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  emptyText: { fontSize: 13, color: C.textGray, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },

  retentionLabel: { fontSize: 11, fontWeight: '800', color: C.dark, letterSpacing: 1.5, marginBottom: 4 },
  retentionValue: { fontSize: 64, fontWeight: '900', color: C.dark, lineHeight: 72 },
  retentionSub: { fontSize: 14, color: C.dark, lineHeight: 22, marginTop: 4, opacity: 0.7 },
  retentionGoalRow: { marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(18,13,46,0.15)', paddingTop: 12 },
  retentionGoalText: { fontSize: 13, fontWeight: '700', color: C.dark },
});

// Task card styles
const t = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.bg },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: C.accent },
  name: { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 2 },
  reason: { fontSize: 12, color: C.textGray, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtnGreen: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  actionBtnDark: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
});

// Journey row styles
const j = StyleSheet.create({
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  name: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  stageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stage: { fontSize: 12, color: C.blue, fontWeight: '600' },
  pct: { fontSize: 12, color: C.textGray, fontWeight: '600' },
  barTrack: { height: 8, backgroundColor: C.bg, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
});

// Visit card styles
const v = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, marginBottom: 10 },
  dateLabel: { fontSize: 10, fontWeight: '800', color: C.textGray, letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '800', color: C.white, marginBottom: 4 },
  context: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  dirBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 10 },
  dirBtnText: { fontSize: 13, fontWeight: '800', color: C.dark },
});
