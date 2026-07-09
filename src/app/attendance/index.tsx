import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';
import NewEventModal from './_new-event-modal';

interface ServiceEvent {
  id: string; title: string; type: string; date: string;
  notes: string | null; attendanceCount: number;
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  sunday:  { icon: 'sunny',      color: '#0EA5E9' },
  midweek: { icon: 'moon',       color: '#8B5CF6' },
  cell:    { icon: 'people',     color: '#10B981' },
  special: { icon: 'star',       color: '#F97316' },
  crusade: { icon: 'megaphone',  color: '#EF4444' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pct(a: number, b: number) {
  if (b === 0) return null;
  return Math.round(((a - b) / b) * 10) / 10;
}

export default function AttendanceDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [newConverts, setNewConverts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [evRes, ncRes] = await Promise.all([
        api.get('/attendance/events'),
        api.get('/members/count', { params: { status: 'new_convert' } }),
      ]);
      setEvents(evRes.data);
      setNewConverts(typeof ncRes.data === 'number' ? ncRes.data : ncRes.data?.count ?? 0);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleDelete = async (id: string, title: string) => {
    Alert.alert('Delete Service', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/attendance/events/${id}`); setEvents((p) => p.filter((e) => e.id !== id)); }
        catch { Alert.alert('Error', 'Could not delete this service.'); }
      }},
    ]);
  };

  // Computed stats
  const lastEvent = events[0];
  const prevEvent = events[1];
  const change = lastEvent && prevEvent ? pct(lastEvent.attendanceCount, prevEvent.attendanceCount) : null;
  const avg = events.length ? Math.round(events.reduce((s, e) => s + e.attendanceCount, 0) / events.length) : 0;
  const maxCount = events.length ? Math.max(...events.map((e) => e.attendanceCount), 1) : 1;
  const trendEvents = events.slice(0, 4).reverse(); // last 4 ascending

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Attendance Dashboard</Text>
            <Text style={s.headerSub}>Real-time ministry growth vitals</Text>
          </View>
          <TouchableOpacity onPress={() => setShowNew(true)} style={s.newBtn}>
            <Ionicons name="add" size={22} color={C.dark} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={[s.centered, { backgroundColor: C.bg }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.accent} />}
        >
          {/* Last Service */}
          <View style={s.statCard}>
            <Text style={s.statCardLabel}>LAST SERVICE ATTENDANCE</Text>
            <View style={s.statRow}>
              <Text style={s.statBigNum}>{lastEvent?.attendanceCount.toLocaleString() ?? '--'}</Text>
              {change !== null && (
                <View style={[s.changePill, { backgroundColor: change >= 0 ? '#DCFCE7' : '#FEF2F2' }]}>
                  <Ionicons name={change >= 0 ? 'trending-up' : 'trending-down'} size={12} color={change >= 0 ? '#166534' : '#991B1B'} />
                  <Text style={[s.changeText, { color: change >= 0 ? '#166534' : '#991B1B' }]}>
                    {change >= 0 ? '+' : ''}{change}%
                  </Text>
                </View>
              )}
            </View>
            {prevEvent && (
              <Text style={s.statSub}>Previous: {prevEvent.attendanceCount.toLocaleString()} souls</Text>
            )}
          </View>

          {/* Average */}
          <View style={s.statCard}>
            <Text style={s.statCardLabel}>AVERAGE ATTENDANCE</Text>
            <Text style={s.statBigNum}>{avg.toLocaleString()}</Text>
            {lastEvent && avg > 0 && (
              <>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.min((lastEvent.attendanceCount / Math.max(avg * 1.2, lastEvent.attendanceCount)) * 100, 100)}%` }]} />
                </View>
                <Text style={s.progressLabel}>{Math.round((lastEvent.attendanceCount / Math.max(avg, 1)) * 100)}% of average</Text>
              </>
            )}
          </View>

          {/* Trend bars — last 4 services */}
          {trendEvents.length >= 2 && (
            <View style={s.trendCard}>
              <Text style={s.trendLabel}>ATTENDANCE TRENDS</Text>
              <Text style={s.trendSub}>Last {trendEvents.length} services</Text>
              <View style={s.trendBars}>
                {trendEvents.map((e, i) => {
                  const h = maxCount > 0 ? Math.max((e.attendanceCount / maxCount) * 80, 8) : 8;
                  return (
                    <View key={e.id} style={s.trendBarWrap}>
                      <Text style={s.trendBarCount}>{e.attendanceCount > 0 ? e.attendanceCount : ''}</Text>
                      <View style={[s.trendBar, { height: h, opacity: i === trendEvents.length - 1 ? 1 : 0.5 }]} />
                      <Text style={s.trendBarLabel}>WK {i + 1}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Recent Services */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recent Services</Text>
            <TouchableOpacity><Text style={s.viewAll}>View All</Text></TouchableOpacity>
          </View>

          {events.slice(0, 5).map((e) => {
            const meta = TYPE_META[e.type] ?? { icon: 'calendar', color: C.textGray };
            const hasRecords = e.attendanceCount > 0;
            return (
              <View key={e.id} style={s.serviceRow}>
                <View style={[s.serviceIcon, { backgroundColor: `${meta.color}15` }]}>
                  <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.serviceName}>{e.title}</Text>
                  <Text style={s.serviceMeta}>
                    {fmtDate(e.date)}{hasRecords ? ` • ${e.attendanceCount.toLocaleString()} Present` : ' • Record pending'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.serviceBtn, hasRecords && s.serviceBtnFilled]}
                  onPress={() => router.push({ pathname: '/attendance/[eventId]', params: { eventId: e.id } } as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.serviceBtnText, hasRecords && s.serviceBtnTextFilled]}>
                    {hasRecords ? 'View' : 'Record'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {events.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={48} color={C.border} />
              <Text style={s.emptyTitle}>No services recorded yet</Text>
              <Text style={s.emptySub}>Tap + to create your first service</Text>
            </View>
          )}

          {/* New Converts Banner */}
          {newConverts > 0 && (
            <View style={s.convertsBanner}>
              <View style={{ flex: 1 }}>
                <Text style={s.convertsTitle}>New Converts Tracking</Text>
                <Text style={s.convertsBody}>
                  Ensure no soul is lost. {newConverts} new convert{newConverts !== 1 ? 's' : ''} may not have been assigned a follow-up worker yet.
                </Text>
              </View>
              <TouchableOpacity style={s.convertsBtn} activeOpacity={0.85}>
                <Ionicons name="person-add" size={14} color={C.white} />
                <Text style={s.convertsBtnText}>Assign Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <NewEventModal visible={showNew} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); fetchData(); }} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  newBtn: { marginLeft: 'auto', width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statCard: { backgroundColor: C.white, borderRadius: 16, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statCardLabel: { fontSize: 10, fontWeight: '800', color: C.textGray, letterSpacing: 1.2, marginBottom: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  statBigNum: { fontSize: 38, fontWeight: '800', color: C.textDark },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  changeText: { fontSize: 12, fontWeight: '700' },
  statSub: { fontSize: 12, color: C.textGray },
  progressTrack: { height: 6, backgroundColor: C.bg, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.dark, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: C.textGray, textAlign: 'right', marginTop: 4 },

  trendCard: { backgroundColor: C.dark, borderRadius: 16, padding: 18, marginBottom: 12 },
  trendLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2 },
  trendSub: { fontSize: 13, fontWeight: '700', color: C.white, marginBottom: 20 },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  trendBarWrap: { alignItems: 'center', gap: 4, flex: 1 },
  trendBarCount: { fontSize: 10, color: C.accent, fontWeight: '700' },
  trendBar: { width: 28, backgroundColor: C.accent, borderRadius: 4 },
  trendBarLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.textDark },
  viewAll: { fontSize: 13, fontWeight: '700', color: C.dark },

  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  serviceIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 14, fontWeight: '700', color: C.textDark },
  serviceMeta: { fontSize: 11, color: C.textGray, marginTop: 2 },
  serviceBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.dark },
  serviceBtnFilled: { backgroundColor: C.dark, borderColor: C.dark },
  serviceBtnText: { fontSize: 12, fontWeight: '700', color: C.dark },
  serviceBtnTextFilled: { color: C.white },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray },

  convertsBanner: { backgroundColor: '#16A34A', borderRadius: 16, padding: 18, marginTop: 8, gap: 14 },
  convertsTitle: { fontSize: 15, fontWeight: '800', color: C.white, marginBottom: 6 },
  convertsBody: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  convertsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.dark, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  convertsBtnText: { fontSize: 13, fontWeight: '800', color: C.white },
});
