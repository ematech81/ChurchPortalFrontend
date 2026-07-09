import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, Linking,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportData {
  event: { id: string; title: string; type: string; date: string; notes: string | null };
  totalAttendance: number;
  memberCount: number;
  visitorCount: number;
  totalMembers: number;
  genderDistribution: { male: number; female: number };
  previousCount: number | null;
  changePercent: number | null;
  absentRegulars: Array<{ id: string; firstName: string; lastName: string; phone: string; churchRole: string | null; departmentName: string | null }>;
  absentRegularsTotal: number;
  departments: Array<{ name: string; present: number; total: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pBar(ratio: number, color: string, height = 6) {
  return (
    <View style={{ height, backgroundColor: C.bg, borderRadius: height / 2, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${Math.min(ratio * 100, 100)}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ServiceReportScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await api.get(`/attendance/events/${eventId}/report`);
        setData(res.data);
      } catch { }
      finally { setLoading(false); }
    })();
  }, [eventId]));

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.dark }}>
        <StatusBar barStyle="light-content" backgroundColor={C.dark} />
        <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Service Report</Text>
            <View style={{ width: 30 }} />
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </View>
    );
  }

  if (!data) return null;

  const { event, totalAttendance, memberCount, visitorCount, totalMembers,
    genderDistribution, changePercent, previousCount, absentRegulars,
    absentRegularsTotal, departments } = data;

  const memberRatio = totalAttendance > 0 ? memberCount / totalAttendance : 0;
  const visitorRatio = totalAttendance > 0 ? visitorCount / totalAttendance : 0;
  const totalGender = genderDistribution.male + genderDistribution.female;

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Service Report</Text>
          <TouchableOpacity style={s.backBtn}>
            <Ionicons name="share-outline" size={22} color={C.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.typeBadge}>
            <Text style={s.typeBadgeText}>{event.type.toUpperCase()} SERVICE</Text>
          </View>
          <Text style={s.heroDate}>{fmtDate(event.date)}</Text>
          <Text style={s.heroTitle}>{event.title}</Text>
          {event.notes && <Text style={s.heroNotes}>{event.notes}</Text>}
        </View>

        <View style={{ padding: 16, gap: 12 }}>

          {/* Total Attendance */}
          <View style={s.card}>
            <Text style={s.cardLabel}>TOTAL ATTENDANCE</Text>
            <Text style={s.bigNum}>{totalAttendance.toLocaleString()}</Text>
            {changePercent !== null && (
              <View style={s.changeRow}>
                <Ionicons name={changePercent >= 0 ? 'trending-up' : 'trending-down'} size={14} color={changePercent >= 0 ? '#16A34A' : C.error} />
                <Text style={[s.changeText, { color: changePercent >= 0 ? '#16A34A' : C.error }]}>
                  {changePercent >= 0 ? '+' : ''}{changePercent}% from last {event.type} service
                  {previousCount !== null ? ` (${previousCount.toLocaleString()})` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Members vs Visitors */}
          <View style={s.card}>
            <Text style={s.cardLabel}>MEMBERS VS. VISITORS</Text>
            <View style={s.splitRow}>
              <Text style={s.splitLabel}>Members</Text>
              <Text style={s.splitVal}>{memberCount.toLocaleString()} ({Math.round(memberRatio * 100)}%)</Text>
            </View>
            {pBar(memberRatio, C.dark)}
            <View style={[s.splitRow, { marginTop: 14 }]}>
              <Text style={s.splitLabel}>First Timers / Visitors</Text>
              <Text style={s.splitVal}>{visitorCount.toLocaleString()} ({Math.round(visitorRatio * 100)}%)</Text>
            </View>
            {pBar(visitorRatio, '#16A34A')}
          </View>

          {/* Gender Distribution */}
          {totalGender > 0 && (
            <View style={s.card}>
              <Text style={s.cardLabel}>GENDER DISTRIBUTION</Text>
              <View style={s.genderRow}>
                <View style={s.genderBox}>
                  <View style={[s.genderIcon, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="male" size={22} color="#1E40AF" />
                  </View>
                  <Text style={s.genderNum}>{genderDistribution.male}</Text>
                  <Text style={s.genderLabel}>Men</Text>
                </View>
                <View style={s.genderDivider} />
                <View style={s.genderBox}>
                  <View style={[s.genderIcon, { backgroundColor: '#FCE7F3' }]}>
                    <Ionicons name="female" size={22} color="#9D174D" />
                  </View>
                  <Text style={s.genderNum}>{genderDistribution.female}</Text>
                  <Text style={s.genderLabel}>Women</Text>
                </View>
              </View>
            </View>
          )}

          {/* Absent Regulars */}
          {absentRegularsTotal > 0 && (
            <View style={s.card}>
              <View style={s.absentHeader}>
                <Text style={s.cardLabel}>ABSENT REGULARS</Text>
                <View style={s.priorityBadge}>
                  <Text style={s.priorityText}>HIGH PRIORITY</Text>
                </View>
              </View>
              <Text style={s.absentSub}>
                Members who attended recent services but were absent today.
              </Text>
              {absentRegulars.slice(0, 5).map((m) => (
                <View key={m.id} style={s.absentRow}>
                  <View style={s.absentAvatar}>
                    <Text style={s.absentInitials}>
                      {`${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.absentName}>{m.firstName} {m.lastName}</Text>
                    <Text style={s.absentMeta}>
                      {[m.departmentName, m.churchRole].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                  <View style={s.contactBtns}>
                    <TouchableOpacity
                      style={s.contactBtn}
                      onPress={() => Linking.openURL(`sms:${m.phone}`)}
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color="#16A34A" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.contactBtn}
                      onPress={() => Linking.openURL(`tel:${m.phone}`)}
                    >
                      <Ionicons name="call" size={16} color={C.dark} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {absentRegularsTotal > 5 && (
                <TouchableOpacity style={s.viewAllBtn}>
                  <Text style={s.viewAllText}>View All {absentRegularsTotal} Absentees</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Department Breakdown */}
          {departments.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardLabel}>DEPARTMENTAL BREAKDOWN</Text>
              {departments.map((d) => {
                const ratio = d.total > 0 ? d.present / d.total : 0;
                const isLow = d.total > 0 && ratio < 0.7;
                return (
                  <View key={d.name} style={s.deptRow}>
                    <View style={[s.deptDot, { backgroundColor: isLow ? C.error : '#16A34A' }]} />
                    <Text style={s.deptName} numberOfLines={1}>{d.name}</Text>
                    <Text style={[s.deptCount, isLow && { color: C.error }]}>
                      {d.present}/{d.total} Present
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },

  hero: { backgroundColor: C.dark, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 4 },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  typeBadgeText: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 1.2 },
  heroDate: { fontSize: 28, fontWeight: '800', color: C.white, marginBottom: 2 },
  heroTitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  heroNotes: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  card: { backgroundColor: C.white, borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardLabel: { fontSize: 10, fontWeight: '800', color: C.textGray, letterSpacing: 1.2, marginBottom: 12 },
  bigNum: { fontSize: 38, fontWeight: '800', color: C.textDark, marginBottom: 6 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  changeText: { fontSize: 13, fontWeight: '600' },

  splitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  splitLabel: { fontSize: 14, fontWeight: '600', color: C.textDark },
  splitVal: { fontSize: 13, color: C.textGray },

  genderRow: { flexDirection: 'row', alignItems: 'center' },
  genderBox: { flex: 1, alignItems: 'center', gap: 8 },
  genderDivider: { width: 1, height: 60, backgroundColor: C.border },
  genderIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  genderNum: { fontSize: 26, fontWeight: '800', color: C.textDark },
  genderLabel: { fontSize: 12, color: C.textGray },

  absentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  priorityBadge: { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityText: { fontSize: 9, fontWeight: '800', color: C.error, letterSpacing: 0.8 },
  absentSub: { fontSize: 12, color: C.textGray, marginBottom: 14 },
  absentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.bg },
  absentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  absentInitials: { fontSize: 13, fontWeight: '800', color: C.accent },
  absentName: { fontSize: 14, fontWeight: '700', color: C.textDark },
  absentMeta: { fontSize: 11, color: C.textGray },
  contactBtns: { flexDirection: 'row', gap: 8 },
  contactBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  viewAllBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  viewAllText: { fontSize: 13, fontWeight: '700', color: C.dark },

  deptRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.bg },
  deptDot: { width: 8, height: 8, borderRadius: 4 },
  deptName: { flex: 1, fontSize: 13, color: C.textDark, fontWeight: '600' },
  deptCount: { fontSize: 13, color: C.textGray, fontWeight: '600' },
});
