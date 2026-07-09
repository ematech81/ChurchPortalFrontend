import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { C } from '../../../constants/theme';

interface ReportData {
  members: { total: number; workers: number; newConverts: number; firstTimers: number; ministers: number };
  attendance: { events: number; lastCount: number; avgCount: number };
  finance: { monthTotal: number; todayTotal: number };
  followUp: { active: number; completed: number; queueCount: number };
  branches: number;
}

function StatBlock({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: string }) {
  return (
    <View style={[b.block, { borderLeftColor: color }]}>
      <View style={[b.iconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={b.value}>{value}</Text>
      <Text style={b.label}>{label}</Text>
      {sub && <Text style={b.sub}>{sub}</Text>}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={r.sectionTitle}>
      <View style={r.sectionAccent} />
      <Ionicons name={icon as any} size={15} color={C.textDark} />
      <Text style={r.sectionTitleText}>{title}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [membersTotal, workers, newConverts, firstTimers, ministers, events, dashStats, followStats, monthFinance, todayFinance, branches] = await Promise.all([
        api.get('/members/count'),
        api.get('/members/count', { params: { status: 'worker' } }),
        api.get('/members/count', { params: { status: 'new_convert' } }),
        api.get('/members/count', { params: { status: 'first_timer' } }),
        api.get('/members/count', { params: { status: 'minister' } }),
        api.get('/attendance/events'),
        api.get('/dashboard/stats'),
        api.get('/follow-up/stats'),
        api.get('/giving/summary/month'),
        api.get('/giving/summary/today'),
        api.get('/churches/branches'),
      ]);

      const evList = events.data as Array<{ attendanceCount: number }>;
      const avgCount = evList.length ? Math.round(evList.reduce((s, e) => s + e.attendanceCount, 0) / evList.length) : 0;
      const lastCount = evList[0]?.attendanceCount ?? 0;

      const n = (v: any) => typeof v === 'number' ? v : v?.count ?? 0;

      setData({
        members: { total: n(membersTotal.data), workers: n(workers.data), newConverts: n(newConverts.data), firstTimers: n(firstTimers.data), ministers: n(ministers.data) },
        attendance: { events: evList.length, lastCount, avgCount },
        finance: { monthTotal: monthFinance.data?.grandTotal ?? 0, todayTotal: typeof todayFinance.data === 'number' ? todayFinance.data : 0 },
        followUp: followStats.data,
        branches: branches.data?.length ?? 0,
      });
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const fmtCurrency = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={r.header}>
          <TouchableOpacity onPress={() => router.back()} style={r.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={r.headerTitle}>Reports & Analytics</Text>
            <Text style={r.headerSub}>Ministry health overview</Text>
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={[r.centered, { backgroundColor: C.bg }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={C.accent} />}
        >
          {/* Members */}
          <SectionTitle icon="people" title="People & Membership" />
          <View style={r.grid}>
            <StatBlock label="Total Members" value={data?.members.total.toLocaleString() ?? '--'} icon="people" color="#0EA5E9" />
            <StatBlock label="Workers" value={data?.members.workers.toLocaleString() ?? '--'} icon="construct" color="#F59E0B" />
            <StatBlock label="New Converts" value={data?.members.newConverts.toLocaleString() ?? '--'} icon="heart" color="#EC4899" />
            <StatBlock label="First Timers" value={data?.members.firstTimers.toLocaleString() ?? '--'} icon="star" color="#10B981" />
            <StatBlock label="Ministers" value={data?.members.ministers.toLocaleString() ?? '--'} icon="ribbon" color="#6366F1" />
            <StatBlock label="Branches" value={data?.branches.toLocaleString() ?? '--'} icon="git-branch" color="#8B5CF6" />
          </View>

          {/* Attendance */}
          <SectionTitle icon="checkbox" title="Attendance" />
          <View style={r.grid}>
            <StatBlock label="Total Services" value={data?.attendance.events.toLocaleString() ?? '--'} icon="calendar" color="#0EA5E9" />
            <StatBlock label="Last Service" value={data?.attendance.lastCount.toLocaleString() ?? '--'} icon="people" color="#14B8A6" />
            <StatBlock label="Average Attendance" value={data?.attendance.avgCount.toLocaleString() ?? '--'} icon="analytics" color="#F97316" />
          </View>

          {/* Finance */}
          <SectionTitle icon="wallet" title="Finance & Giving" />
          <View style={r.grid}>
            <StatBlock label="This Month" value={fmtCurrency(data?.finance.monthTotal ?? 0)} icon="wallet" color="#22C55E" />
            <StatBlock label="Today" value={fmtCurrency(data?.finance.todayTotal ?? 0)} icon="today" color="#16A34A" />
          </View>

          {/* Follow-Up */}
          <SectionTitle icon="trending-up" title="Follow-Up Engine" />
          <View style={r.grid}>
            <StatBlock label="In Queue" value={data?.followUp.queueCount.toLocaleString() ?? '--'} icon="time" color="#F59E0B" />
            <StatBlock label="Active Journeys" value={data?.followUp.active.toLocaleString() ?? '--'} icon="map" color="#0EA5E9" />
            <StatBlock label="Completed" value={data?.followUp.completed.toLocaleString() ?? '--'} icon="checkmark-circle" color="#10B981" />
          </View>

          {/* Quick links */}
          <View style={r.quickLinks}>
            {[
              { label: 'View Members', route: '/members', icon: 'people' },
              { label: 'Attendance', route: '/attendance', icon: 'checkbox' },
              { label: 'Follow-Up', route: '/follow-up', icon: 'trending-up' },
              { label: 'Finance', route: '/finance', icon: 'wallet' },
            ].map((link) => (
              <TouchableOpacity key={link.route} style={r.quickLink} onPress={() => router.push(link.route as any)} activeOpacity={0.8}>
                <Ionicons name={link.icon as any} size={18} color={C.dark} />
                <Text style={r.quickLinkText}>{link.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={C.textGray} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const b = StyleSheet.create({
  block: { flex: 1, minWidth: '45%', backgroundColor: C.white, borderRadius: 14, padding: 14, borderLeftWidth: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 },
  iconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  value: { fontSize: 22, fontWeight: '800', color: C.textDark, marginBottom: 2 },
  label: { fontSize: 11, color: C.textGray, fontWeight: '600' },
  sub: { fontSize: 10, color: C.textGray, marginTop: 2 },
});

const r = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12 },
  sectionAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: C.accent },
  sectionTitleText: { fontSize: 14, fontWeight: '800', color: C.textDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickLinks: { marginTop: 24, backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  quickLinkText: { fontSize: 14, fontWeight: '600', color: C.textDark },
});
