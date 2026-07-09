import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Alert, ScrollView,
} from 'react-native';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

interface QueueMember {
  id: string; firstName: string; lastName: string; phone: string;
  status: string; tags: string[]; createdAt: string;
}

interface Journey {
  id: string; memberId: string; decisionType: string | null;
  assignedWorkerId: string | null; status: string; createdAt: string;
  member: { id: string; firstName: string; lastName: string; phone: string; status: string } | null;
  progress: { total: number; done: number };
}

interface Worker {
  id: string; firstName: string; lastName: string; phone: string;
  departmentName: string | null; status: string;
}

interface Stats { active: number; completed: number; queueCount: number; }

type Tab = 'tasks' | 'assignments' | 'workers';

const MAX_WORKER_CASES = 5;

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function relativeDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= 6) return `${days} Days Ago`;
  if (days <= 13) return 'Last Week';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function TaskCard({ member, onAssign }: { member: QueueMember; onAssign: () => void }) {
  const isAtRisk = member.tags?.includes('Follow-Up Needed');
  const noteText = member.status === 'new_convert'
    ? 'New Convert · Pending assignment'
    : isAtRisk ? 'Flagged for follow-up' : 'Pending assignment';

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.cardAvatar}>
          <Text style={s.cardAvatarText}>{initials(member.firstName, member.lastName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName}>{member.firstName} {member.lastName}</Text>
          {isAtRisk && (
            <View style={s.followUpBadge}>
              <Text style={s.followUpBadgeText}>FOLLOW-UP NEEDED</Text>
            </View>
          )}
          <Text style={s.decisionLine}>
            Decision: <Text style={{ fontWeight: '700', color: C.textDark }}>{relativeDate(member.createdAt)}</Text>
          </Text>
          <Text style={s.cardNote}>{noteText}</Text>
        </View>
      </View>
      <TouchableOpacity style={s.assignBtn} onPress={onAssign} activeOpacity={0.85}>
        <Ionicons name="person-add" size={16} color={C.dark} />
        <Text style={s.assignBtnText}>ASSIGN WORKER</Text>
      </TouchableOpacity>
    </View>
  );
}

function AssignmentCard({ journey, onComplete, onAbandon }: {
  journey: Journey; onComplete: () => void; onAbandon: () => void;
}) {
  const m = journey.member;
  const pct = journey.progress.total > 0
    ? Math.round((journey.progress.done / journey.progress.total) * 100)
    : 0;

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.cardAvatar}>
          <Text style={s.cardAvatarText}>{m ? initials(m.firstName, m.lastName) : '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName}>{m ? `${m.firstName} ${m.lastName}` : 'Unknown member'}</Text>
          {journey.decisionType && (
            <Text style={s.decisionLine}>{journey.decisionType}</Text>
          )}
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={s.progressLabel}>{pct}% · {journey.progress.done}/{journey.progress.total} steps</Text>
          </View>
          {!journey.assignedWorkerId && (
            <View style={s.unassigned}>
              <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
              <Text style={s.unassignedText}>No worker assigned</Text>
            </View>
          )}
        </View>
        <View style={s.journeyActions}>
          <TouchableOpacity onPress={onComplete} style={s.completeBtn}>
            <Ionicons name="checkmark" size={14} color="#166534" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAbandon} style={s.abandonBtn}>
            <Ionicons name="close" size={14} color={C.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function WorkerCard({ worker, activeCount }: { worker: Worker; activeCount: number }) {
  const isFull = activeCount >= MAX_WORKER_CASES;
  return (
    <View style={[s.workerCard, isFull && s.workerCardFull]}>
      <View style={[s.workerAvatar, isFull ? s.workerAvatarFull : s.workerAvatarActive]}>
        <Text style={s.workerAvatarText}>{initials(worker.firstName, worker.lastName)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.workerName}>{worker.firstName} {worker.lastName}</Text>
        <Text style={s.workerRole}>{worker.departmentName ?? 'Follow-Up Worker'}</Text>
      </View>
      <View style={s.workerRight}>
        <Text style={[s.workerActiveNum, { color: isFull ? C.error : '#0EA5E9' }]}>{activeCount}</Text>
        <Text style={s.workerActiveLbl}>Active</Text>
        <View style={[s.caseBadge, isFull ? s.caseBadgeFull : s.caseBadgeOk]}>
          <Text style={[s.caseBadgeText, isFull && { color: C.error }]}>
            {isFull ? 'FULL' : `${activeCount}/${MAX_WORKER_CASES}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function FollowUpScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('tasks');
  const [queue, setQueue] = useState<QueueMember[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unassignedCount = useMemo(
    () => journeys.filter((j) => j.status === 'active' && !j.assignedWorkerId).length,
    [journeys],
  );

  const workerActiveCounts = useMemo(() => {
    const map: Record<string, number> = {};
    journeys.forEach((j) => {
      if (j.status === 'active' && j.assignedWorkerId) {
        map[j.assignedWorkerId] = (map[j.assignedWorkerId] ?? 0) + 1;
      }
    });
    return map;
  }, [journeys]);

  const fetchAll = useCallback(async () => {
    try {
      const [qRes, jRes, sRes, wRes] = await Promise.all([
        api.get('/follow-up/queue'),
        api.get('/follow-up/journeys'),
        api.get('/follow-up/stats'),
        api.get('/members', { params: { status: 'worker', limit: 100 } }),
      ]);
      setQueue(qRes.data ?? []);
      setJourneys(jRes.data ?? []);
      setStats(sRes.data);
      setWorkers(wRes.data ?? []);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const handleAssignWorker = (member: QueueMember) => {
    router.push({
      pathname: '/follow-up/assign-worker',
      params: {
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        memberStatus: member.status,
        memberPhone: member.phone ?? '',
      },
    } as any);
  };

  const handleComplete = (j: Journey) => {
    Alert.alert('Complete Journey', `Mark ${j.member?.firstName}'s journey as complete?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: async () => {
        await api.patch(`/follow-up/journeys/${j.id}/status`, { status: 'completed' });
        await fetchAll();
      }},
    ]);
  };

  const handleAbandon = (j: Journey) => {
    Alert.alert('Abandon Journey', 'This will stop the follow-up sequence. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Abandon', style: 'destructive', onPress: async () => {
        await api.patch(`/follow-up/journeys/${j.id}/status`, { status: 'abandoned' });
        await fetchAll();
      }},
    ]);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'tasks', label: `Tasks (${queue.length})` },
    { key: 'assignments', label: 'Assignments' },
    { key: 'workers', label: 'Workers' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Follow-Up Engine</Text>
            <Text style={s.headerSub}>Pastoral care tracking</Text>
          </View>
        </View>

        {/* Stats — two prominent blocks */}
        {stats && (
          <View style={s.statsRow}>
            <View style={s.statBlockDark}>
              <Text style={s.statBlockLabel}>Pending Follow-ups</Text>
              <Text style={s.statBlockNum}>{stats.queueCount}</Text>
            </View>
            <View style={s.statBlockOutline}>
              <Text style={[s.statBlockLabel, { color: 'rgba(255,255,255,0.55)' }]}>Unassigned</Text>
              <Text style={[s.statBlockNum, { color: C.white }]}>{unassignedCount}</Text>
            </View>
          </View>
        )}

        {/* Three tabs */}
        <View style={s.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, tab === t.key && s.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={[s.centered, { backgroundColor: C.bg }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : tab === 'workers' ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={C.accent} />}
        >
          <View style={s.teamCard}>
            <Text style={s.teamCardSub}>TEAM OVERVIEW</Text>
            <Text style={s.teamCardTitle}>Total Workforce</Text>
            <View style={s.teamCardBottom}>
              <Text style={s.teamCardNum}>{workers.length}</Text>
              <Text style={s.teamCardNumSub}>Active now</Text>
            </View>
          </View>

          {workers.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={C.border} />
              <Text style={s.emptyTitle}>No workers yet</Text>
              <Text style={s.emptySub}>Members with Worker status will appear here.</Text>
            </View>
          ) : (
            workers.map((w) => (
              <WorkerCard key={w.id} worker={w} activeCount={workerActiveCounts[w.id] ?? 0} />
            ))
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={tab === 'tasks' ? queue : journeys}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={C.accent} />}
          ListHeaderComponent={
            tab === 'tasks' && queue.length > 0 ? (
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>New Converts</Text>
                <View style={s.recentBadge}>
                  <Text style={s.recentBadgeText}>Recent</Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            tab === 'tasks'
              ? <TaskCard member={item as QueueMember} onAssign={() => handleAssignWorker(item as QueueMember)} />
              : <AssignmentCard journey={item as Journey} onComplete={() => handleComplete(item as Journey)} onAbandon={() => handleAbandon(item as Journey)} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons
                name={tab === 'tasks' ? 'checkmark-circle-outline' : 'trending-up-outline'}
                size={52}
                color={C.border}
              />
              <Text style={s.emptyTitle}>
                {tab === 'tasks' ? 'Queue is clear' : 'No active journeys'}
              </Text>
              <Text style={s.emptySub}>
                {tab === 'tasks'
                  ? 'All new converts have been followed up.'
                  : 'Assign a worker from the Tasks tab to start a journey.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  statBlockDark: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 14 },
  statBlockOutline: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)' },
  statBlockLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  statBlockNum: { fontSize: 34, fontWeight: '800', color: C.white },

  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 0, gap: 5 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  tabActive: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1.5, borderColor: C.accent },
  tabText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  tabTextActive: { color: C.accent },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.textDark },
  recentBadge: { backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  recentBadgeText: { fontSize: 11, fontWeight: '800', color: C.dark },

  // Task / Assignment cards
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  cardAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { fontSize: 16, fontWeight: '800', color: C.accent },
  cardName: { fontSize: 17, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  followUpBadge: { alignSelf: 'flex-start', backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 5 },
  followUpBadgeText: { fontSize: 9, fontWeight: '800', color: C.error, letterSpacing: 0.5 },
  decisionLine: { fontSize: 12, color: C.textGray, marginBottom: 2 },
  cardNote: { fontSize: 11, color: C.textGray },
  assignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14 },
  assignBtnText: { fontSize: 14, fontWeight: '800', color: C.dark, letterSpacing: 0.6 },

  // Assignment tab extras
  progressWrap: { gap: 4, marginTop: 4 },
  progressTrack: { height: 5, backgroundColor: C.bg, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0EA5E9', borderRadius: 3 },
  progressLabel: { fontSize: 10, color: C.textGray },
  unassigned: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  unassignedText: { fontSize: 10, color: '#F59E0B', fontWeight: '600' },
  journeyActions: { gap: 6 },
  completeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  abandonBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

  // Workers tab
  teamCard: { backgroundColor: C.dark, borderRadius: 18, padding: 20, marginBottom: 16 },
  teamCardSub: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2, marginBottom: 4 },
  teamCardTitle: { fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 10 },
  teamCardBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  teamCardNum: { fontSize: 40, fontWeight: '800', color: C.accent },
  teamCardNumSub: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  workerCard: { backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  workerCardFull: { borderWidth: 1.5, borderColor: '#FECACA' },
  workerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  workerAvatarActive: { borderColor: C.accent },
  workerAvatarFull: { borderColor: '#FCA5A5' },
  workerAvatarText: { fontSize: 15, fontWeight: '800', color: C.accent },
  workerName: { fontSize: 15, fontWeight: '700', color: C.textDark },
  workerRole: { fontSize: 11, color: C.textGray, marginTop: 2 },
  workerRight: { alignItems: 'center', gap: 4 },
  workerActiveNum: { fontSize: 22, fontWeight: '800' },
  workerActiveLbl: { fontSize: 9, color: C.textGray, fontWeight: '600' },
  caseBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  caseBadgeOk: { backgroundColor: '#DCFCE7' },
  caseBadgeFull: { backgroundColor: '#FEF2F2' },
  caseBadgeText: { fontSize: 10, fontWeight: '800', color: '#166534' },

  empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center', paddingHorizontal: 32 },
});
