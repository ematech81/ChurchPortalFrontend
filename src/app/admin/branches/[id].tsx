import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../../constants/theme';

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export default function BranchDetailScreen() {
  const router = useRouter();
  const {
    id, branchName, branchCity, branchAddress, branchPhone,
    memberCount, workerCount, pastorName, pastorEmail, pastorPhone,
  } = useLocalSearchParams<{
    id: string; branchName: string; branchCity: string;
    branchAddress: string; branchPhone: string;
    memberCount: string; workerCount: string;
    pastorName: string; pastorEmail: string; pastorPhone: string;
  }>();

  const members = parseInt(memberCount ?? '0', 10);
  const workers = parseInt(workerCount ?? '0', 10);
  const workerPct = members > 0 ? Math.round((workers / members) * 100) : 0;
  const hasPastor = !!pastorName;

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Hero header ── */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.assignBtn}
              onPress={() => router.push({
                pathname: '/admin/pastors/assign',
                params: { branchId: id, branchName, branchCity },
              } as any)}
              activeOpacity={0.85}
            >
              <Text style={s.assignBtnText}>ASSIGN PASTOR</Text>
            </TouchableOpacity>
          </View>

          <View style={s.heroBody}>
            {/* Branch icon */}
            <View style={s.branchIconWrap}>
              <Ionicons name="business" size={32} color={C.accent} />
            </View>

            <Text style={s.heroName}>{branchName}</Text>
            {branchCity ? (
              <View style={s.heroLocation}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
                <Text style={s.heroLocationText}>{branchCity}</Text>
              </View>
            ) : null}
          </View>

          {/* Quick stat bar */}
          <View style={s.quickStats}>
            <View style={s.quickStat}>
              <Text style={s.quickStatNum}>{fmt(members)}</Text>
              <Text style={s.quickStatLbl}>Members</Text>
            </View>
            <View style={s.quickStatDivider} />
            <View style={s.quickStat}>
              <Text style={s.quickStatNum}>{fmt(workers)}</Text>
              <Text style={s.quickStatLbl}>Workers</Text>
            </View>
            <View style={s.quickStatDivider} />
            <View style={s.quickStat}>
              <Text style={s.quickStatNum}>{workerPct}%</Text>
              <Text style={s.quickStatLbl}>Worker Rate</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* ── Content ── */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 20 }}>

          {/* ── Global Reach stat cards (matches analytics image) ── */}
          <Text style={s.sectionTitle}>Global Reach</Text>
          <Text style={s.sectionSub}>Real-time branch impact overview.</Text>

          <View style={s.statRow}>
            <View style={s.statCardDark}>
              <Ionicons name="people" size={22} color={C.accent} style={{ marginBottom: 10 }} />
              <Text style={s.statNumDark}>{fmt(members)}</Text>
              <Text style={s.statLblDark}>Total Members</Text>
            </View>
            <View style={s.statCardAccent}>
              <Ionicons name="ribbon" size={22} color={C.dark} style={{ marginBottom: 10 }} />
              <Text style={s.statNumAccent}>{fmt(workers)}</Text>
              <Text style={s.statLblAccent}>Active Workers</Text>
            </View>
          </View>

          {/* Worker rate progress bar */}
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <Text style={s.progressLabel}>Worker Engagement Rate</Text>
              <Text style={s.progressValue}>{workerPct}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.min(workerPct, 100)}%` }]} />
            </View>
            <Text style={s.progressSub}>
              {workers} active workers out of {members} total members
            </Text>
          </View>

          {/* ── Lead Pastor card ── */}
          <Text style={[s.sectionTitle, { marginTop: 20 }]}>Lead Pastor</Text>
          {hasPastor ? (
            <View style={s.pastorCard}>
              <View style={s.pastorAvatarRing}>
                <View style={s.pastorAvatar}>
                  <Text style={s.pastorAvatarText}>{initials(pastorName)}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.pastorName}>{pastorName}</Text>
                {pastorEmail ? <Text style={s.pastorEmail}>{pastorEmail}</Text> : null}
                <View style={s.pastorStatusRow}>
                  <View style={s.pastorStatusBadge}>
                    <Text style={s.pastorStatusText}>ASSIGNED</Text>
                  </View>
                </View>
              </View>
              <View style={s.pastorActions}>
                {pastorPhone ? (
                  <TouchableOpacity style={s.pastorActionBtn} onPress={() => Linking.openURL(`tel:${pastorPhone}`)}>
                    <Ionicons name="call" size={16} color={C.dark} />
                  </TouchableOpacity>
                ) : null}
                {pastorEmail ? (
                  <TouchableOpacity style={s.pastorActionBtn} onPress={() => Linking.openURL(`mailto:${pastorEmail}`)}>
                    <Ionicons name="mail" size={16} color={C.dark} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={s.vacancyCard}
              onPress={() => router.push({
                pathname: '/admin/pastors/assign',
                params: { branchId: id, branchName, branchCity },
              } as any)}
              activeOpacity={0.85}
            >
              <View style={s.vacancyIcon}>
                <Ionicons name="person-add" size={22} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.vacancyTitle}>No Pastor Assigned</Text>
                <Text style={s.vacancySub}>Tap to assign a lead pastor to this branch</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.accent} />
            </TouchableOpacity>
          )}

          {/* ── Branch Info ── */}
          {(branchAddress || branchPhone) && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 20 }]}>Branch Info</Text>
              <View style={s.infoCard}>
                {branchAddress ? (
                  <View style={s.infoRow}>
                    <Ionicons name="location-outline" size={18} color={C.textGray} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.infoLabel}>Address</Text>
                      <Text style={s.infoValue}>{branchAddress}</Text>
                    </View>
                  </View>
                ) : null}
                {branchPhone ? (
                  <View style={[s.infoRow, branchAddress ? { borderTopWidth: 1, borderTopColor: C.bg } : {}]}>
                    <Ionicons name="call-outline" size={18} color={C.textGray} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.infoLabel}>Phone</Text>
                      <Text style={s.infoValue}>{branchPhone}</Text>
                    </View>
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${branchPhone}`)}>
                      <Text style={{ color: C.accent, fontWeight: '700', fontSize: 13 }}>Call</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </>
          )}

          {/* ── Quick Actions ── */}
          <Text style={[s.sectionTitle, { marginTop: 20 }]}>Quick Actions</Text>
          <View style={s.actionsGrid}>
            {[
              { icon: 'people', label: 'View Members', route: '/members' },
              { icon: 'checkbox', label: 'Attendance', route: '/attendance' },
              { icon: 'wallet', label: 'Finance', route: '/finance' },
              { icon: 'trending-up', label: 'Follow-Up', route: '/follow-up' },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={s.actionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <View style={s.actionIcon}>
                  <Ionicons name={action.icon as any} size={20} color={C.dark} />
                </View>
                <Text style={s.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  backBtn: { padding: 4 },
  assignBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  assignBtnText: { fontSize: 12, fontWeight: '800', color: C.dark },

  heroBody: { alignItems: 'center', paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20 },
  branchIconWrap: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: C.accent, backgroundColor: C.darkCard, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroName: { fontSize: 24, fontWeight: '800', color: C.white, textAlign: 'center', marginBottom: 6 },
  heroLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLocationText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  quickStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 16, borderRadius: 14, paddingVertical: 14, marginBottom: 0 },
  quickStat: { flex: 1, alignItems: 'center' },
  quickStatNum: { fontSize: 22, fontWeight: '800', color: C.accent },
  quickStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: '600' },
  quickStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: C.textGray, marginBottom: 16 },

  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCardDark: { flex: 1, backgroundColor: C.dark, borderRadius: 18, padding: 18 },
  statCardAccent: { flex: 1, backgroundColor: C.accent, borderRadius: 18, padding: 18 },
  statNumDark: { fontSize: 28, fontWeight: '800', color: C.accent, marginBottom: 4 },
  statLblDark: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  statNumAccent: { fontSize: 28, fontWeight: '800', color: C.dark, marginBottom: 4 },
  statLblAccent: { fontSize: 11, color: 'rgba(18,13,46,0.6)', fontWeight: '600' },

  progressCard: { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 13, fontWeight: '700', color: C.textDark },
  progressValue: { fontSize: 18, fontWeight: '800', color: C.accent },
  progressTrack: { height: 8, backgroundColor: C.bg, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: 4 },
  progressSub: { fontSize: 11, color: C.textGray },

  pastorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 16, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  pastorAvatarRing: { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, borderColor: C.accent, padding: 2, alignItems: 'center', justifyContent: 'center' },
  pastorAvatar: { flex: 1, borderRadius: 24, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  pastorAvatarText: { fontSize: 15, fontWeight: '800', color: C.accent },
  pastorName: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 2 },
  pastorEmail: { fontSize: 12, color: C.textGray, marginBottom: 6 },
  pastorStatusRow: { flexDirection: 'row' },
  pastorStatusBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  pastorStatusText: { fontSize: 9, fontWeight: '800', color: '#166534' },
  pastorActions: { gap: 8 },
  pastorActionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },

  vacancyCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: C.accent, borderStyle: 'dashed' },
  vacancyIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(245,197,24,0.12)', alignItems: 'center', justifyContent: 'center' },
  vacancyTitle: { fontSize: 14, fontWeight: '700', color: C.textDark },
  vacancySub: { fontSize: 12, color: C.textGray, marginTop: 2 },

  infoCard: { backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: C.textGray, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: C.textDark },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '47%', backgroundColor: C.white, borderRadius: 14, padding: 16, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  actionIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '700', color: C.textDark },
});
