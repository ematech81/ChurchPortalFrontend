import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, Linking, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { C } from '../../../constants/theme';

const ROLE_LABELS: Record<string, string> = {
  SENIOR_PASTOR: 'SENIOR REGIONAL PASTOR', senior_pastor: 'SENIOR REGIONAL PASTOR',
  BRANCH_PASTOR: 'BRANCH PASTOR',          branch_pastor: 'BRANCH PASTOR',
  minister: 'MINISTER', pastor: 'PASTOR',
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={d.infoRow}>
      <View style={d.infoIconWrap}>
        <Ionicons name={icon as any} size={16} color={C.textGray} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={d.infoLabel}>{label}</Text>
        <Text style={d.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <View style={d.section}>
      <View style={d.sectionHeader}>
        <View style={d.sectionIconWrap}>
          <Ionicons name={icon as any} size={16} color={C.accent} />
        </View>
        <Text style={d.sectionTitle}>{title}</Text>
      </View>
      <View style={d.sectionBody}>{children}</View>
    </View>
  );
}

// ── Notifications Section ─────────────────────────────────────────────────────
interface PastorNotification {
  id: string; title: string; message: string;
  date: string; read: boolean; type: string;
}

const NOTIF_ICONS: Record<string, string> = {
  assignment: 'git-branch',
  access:     'key',
  message:    'chatbubble',
  alert:      'alert-circle',
};
const NOTIF_COLORS: Record<string, string> = {
  assignment: C.accent,
  access:     '#6366F1',
  message:    '#0EA5E9',
  alert:      C.error,
};

function NotificationsSection({ notifications }: { notifications: PastorNotification[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? notifications : notifications.slice(0, 3);

  return (
    <View style={[d.section, { marginBottom: 14 }]}>
      <View style={d.sectionHeader}>
        <View style={d.sectionIconWrap}>
          <Ionicons name="notifications" size={16} color={C.accent} />
        </View>
        <Text style={d.sectionTitle}>Notifications</Text>
        {notifications.filter((n) => !n.read).length > 0 && (
          <View style={n.unreadBadge}>
            <Text style={n.unreadBadgeText}>{notifications.filter((x) => !x.read).length} NEW</Text>
          </View>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={n.empty}>
          <Ionicons name="notifications-off-outline" size={32} color={C.border} />
          <Text style={n.emptyText}>No notifications yet</Text>
          <Text style={n.emptySubtext}>Assignment and access changes will appear here</Text>
        </View>
      ) : (
        <>
          {visible.map((notif) => {
            const icon  = NOTIF_ICONS[notif.type]  ?? 'information-circle';
            const color = NOTIF_COLORS[notif.type] ?? C.textGray;
            const dateStr = new Date(notif.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return (
              <View key={notif.id} style={[n.row, !notif.read && n.rowUnread]}>
                <View style={[n.iconWrap, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={icon as any} size={16} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={n.titleRow}>
                    <Text style={n.title}>{notif.title}</Text>
                    {!notif.read && <View style={n.dot} />}
                  </View>
                  <Text style={n.message}>{notif.message}</Text>
                  <Text style={n.date}>{dateStr}</Text>
                </View>
              </View>
            );
          })}
          {notifications.length > 3 && (
            <TouchableOpacity style={n.showMore} onPress={() => setShowAll(!showAll)}>
              <Text style={n.showMoreText}>{showAll ? 'Show Less' : `Show All (${notifications.length})`}</Text>
              <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={14} color={C.accent} />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

export default function PastorProfileScreen() {
  const router = useRouter();
  const { id, source, pastorRole, branchName, branchCity, memberCount, workerCount } =
    useLocalSearchParams<{
      id: string; source: string; pastorRole: string;
      branchName: string; branchCity: string;
      memberCount: string; workerCount: string;
    }>();

  const [member, setMember] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (source === 'member') {
      api.get(`/members/${id}`)
        .then((r) => setMember(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, source]);

  const role = ROLE_LABELS[pastorRole] ?? 'PASTOR';
  const pp   = member?.customFields?.pastorProfile as Record<string, any> | undefined;

  const name      = member ? `${member.firstName} ${member.lastName}` : '';
  const email     = member?.email ?? '';
  const phone     = member?.phone ?? '';
  const gender    = member?.gender?.replace(/_/g, ' ') ?? '';
  const marital   = member?.maritalStatus?.replace(/_/g, ' ') ?? '';
  const dob       = member?.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
  const address   = [member?.address, member?.city, member?.state].filter(Boolean).join(', ');
  const dept      = member?.departmentName ?? '';
  const position  = member?.pastoralPosition?.replace(/_/g, ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? '';
  const members   = parseInt(memberCount ?? '0', 10);
  const workers   = parseInt(workerCount ?? '0', 10);

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Hero ── */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => router.push({ pathname: '/admin/pastors/add', params: { pastorId: id, pastorName: name, mode: 'edit' } } as any)}
            >
              <Ionicons name="create-outline" size={18} color={C.dark} />
              <Text style={s.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            <View style={s.hero}>
              <View style={s.avatarRing}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials(name || 'UN')}</Text>
                </View>
              </View>
              <View style={s.roleChip}>
                <Text style={s.roleChipText}>{role}</Text>
              </View>
              <Text style={s.heroName}>{name}</Text>
              {email ? <Text style={s.heroEmail}>{email}</Text> : null}
            </View>
          )}

          {/* Action buttons */}
          {!loading && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.assignBtn}
                onPress={() => router.push({ pathname: '/admin/pastors/assign', params: { pastorId: id, pastorName: name, mode: 'transfer' } } as any)}
              >
                <Text style={s.assignBtnText}>ASSIGN TRANSFER</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && (
            <View style={s.contactRow}>
              {phone ? (
                <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(`tel:${phone}`)}>
                  <Ionicons name="call-outline" size={16} color={C.white} />
                  <Text style={s.contactBtnText}>Contact</Text>
                </TouchableOpacity>
              ) : null}
              {email ? (
                <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(`mailto:${email}`)}>
                  <Ionicons name="mail-outline" size={16} color={C.white} />
                  <Text style={s.contactBtnText}>Email</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </SafeAreaView>

        {/* ── Content ── */}
        {!loading && (
          <View style={{ backgroundColor: C.bg, paddingTop: 20 }}>

            {/* Quick stats */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statNum}>{members.toLocaleString()}</Text>
                <Text style={s.statLbl}>Congregation</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statNum}>{workers.toLocaleString()}</Text>
                <Text style={s.statLbl}>Workers</Text>
              </View>
              {pp?.yearsInMinistry ? (
                <View style={s.statCard}>
                  <Text style={s.statNum}>{pp.yearsInMinistry}</Text>
                  <Text style={s.statLbl}>Yrs Ministry</Text>
                </View>
              ) : null}
            </View>

            {/* Assigned Branch */}
            {branchName ? (
              <View style={[s.branchCard, { marginHorizontal: 16, marginBottom: 14 }]}>
                <Text style={s.branchCardLabel}>ASSIGNED BRANCH</Text>
                <Text style={s.branchCardName}>{branchName}</Text>
                {branchCity ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="location-outline" size={13} color={C.accent} />
                    <Text style={s.branchCardCity}>{branchCity}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <TouchableOpacity
                style={[s.vacancyCard, { marginHorizontal: 16, marginBottom: 14 }]}
                onPress={() => router.push({ pathname: '/admin/pastors/assign', params: { pastorId: id, pastorName: name } } as any)}
              >
                <Ionicons name="person-add" size={20} color={C.accent} />
                <Text style={s.vacancyText}>No branch assigned — Tap to assign</Text>
                <Ionicons name="chevron-forward" size={16} color={C.accent} />
              </TouchableOpacity>
            )}

            {/* ── Personal Information ── */}
            {(gender || marital || dob || phone || email || address) ? (
              <Section icon="person" title="Personal Information">
                <InfoRow icon="call-outline"     label="Phone Number"    value={phone} />
                <InfoRow icon="mail-outline"     label="Email Address"   value={email} />
                <InfoRow icon="person-outline"   label="Gender"          value={gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : ''} />
                <InfoRow icon="calendar-outline" label="Date of Birth"   value={dob} />
                <InfoRow icon="heart-outline"    label="Marital Status"  value={marital ? marital.charAt(0).toUpperCase() + marital.slice(1) : ''} />
                <InfoRow icon="location-outline" label="Address"         value={address} />
                {member?.emergencyContactName ? (
                  <InfoRow icon="alert-circle-outline" label="Emergency Contact"
                    value={`${member.emergencyContactName}${member.emergencyContactPhone ? ' · ' + member.emergencyContactPhone : ''}`} />
                ) : null}
              </Section>
            ) : null}

            {/* ── Ministry Information ── */}
            <Section icon="ribbon" title="Ministry Information">
              <InfoRow icon="ribbon-outline"   label="Pastoral Role"       value={role} />
              <InfoRow icon="medal-outline"    label="Pastoral Position"   value={position} />
              <InfoRow icon="business-outline" label="Department"          value={dept} />
              <InfoRow icon="calendar-outline" label="Ordination Date"     value={pp?.ordinationDate ?? ''} />
              <InfoRow icon="time-outline"     label="Years in Ministry"   value={pp?.yearsInMinistry ? `${pp.yearsInMinistry} years` : ''} />
              <InfoRow icon="ribbon-outline"   label="Specializations"     value={pp?.specializations ?? ''} />
            </Section>

            {/* ── Family Information ── */}
            {(pp?.spouseName || pp?.numberOfChildren != null) ? (
              <Section icon="people" title="Family Information">
                <InfoRow icon="person-outline"  label="Spouse Name"       value={pp?.spouseName ?? ''} />
                <InfoRow icon="heart-outline"   label="Number of Children" value={pp?.numberOfChildren != null ? String(pp.numberOfChildren) : ''} />
              </Section>
            ) : null}

            {/* ── Education & Biography ── */}
            {(pp?.biography || pp?.seminary || pp?.educationalBackground || pp?.certifications) ? (
              <Section icon="book" title="Education & Biography">
                {pp?.biography ? (
                  <View style={d.bioBlock}>
                    <Text style={d.bioLabel}>Biography</Text>
                    <Text style={d.bioText}>{pp.biography}</Text>
                  </View>
                ) : null}
                <InfoRow icon="school-outline"  label="Seminary / Bible School"    value={pp?.seminary ?? ''} />
                <InfoRow icon="library-outline" label="Educational Background"     value={pp?.educationalBackground ?? ''} />
                <InfoRow icon="medal-outline"   label="Certifications"             value={pp?.certifications ?? ''} />
              </Section>
            ) : null}

            {/* ── Notifications Section ── */}
            <NotificationsSection notifications={pp?.notifications ?? []} />

            {/* Source indicator */}
            <View style={s.sourceRow}>
              <Ionicons name="information-circle-outline" size={14} color={C.textGray} />
              <Text style={s.sourceText}>
                {source === 'user'
                  ? 'This pastor has an admin login account.'
                  : 'This pastor is registered as a church member.'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  backBtn: { padding: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  editBtnText: { fontSize: 13, fontWeight: '800', color: C.dark },
  hero: { alignItems: 'center', paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20 },
  avatarRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: C.accent, padding: 3, marginBottom: 14 },
  avatar: { flex: 1, borderRadius: 45, backgroundColor: C.darkCard, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: C.accent },
  roleChip: { backgroundColor: C.darkCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10 },
  roleChipText: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 1 },
  heroName: { fontSize: 24, fontWeight: '800', color: C.white, textAlign: 'center', marginBottom: 4 },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  actionRow: { paddingHorizontal: 16, marginBottom: 10 },
  assignBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  assignBtnText: { fontSize: 14, fontWeight: '800', color: C.dark, letterSpacing: 0.6 },
  contactRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 11 },
  contactBtnText: { fontSize: 13, fontWeight: '700', color: C.white },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statNum: { fontSize: 22, fontWeight: '800', color: C.textDark },
  statLbl: { fontSize: 10, color: C.textGray, marginTop: 2, fontWeight: '600' },
  branchCard: { backgroundColor: C.dark, borderRadius: 16, padding: 18 },
  branchCardLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, marginBottom: 6 },
  branchCardName: { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 6 },
  branchCardCity: { fontSize: 13, color: C.accent, fontWeight: '600' },
  vacancyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: C.accent, borderStyle: 'dashed' },
  vacancyText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.textDark },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 14 },
  sourceText: { fontSize: 11, color: C.textGray },
});

const d = StyleSheet.create({
  section: { marginHorizontal: 16, marginBottom: 14, backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(245,197,24,0.12)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: C.textDark },
  sectionBody: {},
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.bg },
  infoIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '700', color: C.textGray, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: C.textDark },
  bioBlock: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  bioLabel: { fontSize: 10, fontWeight: '700', color: C.textGray, marginBottom: 6 },
  bioText: { fontSize: 14, color: C.textDark, lineHeight: 22 },
});

const n = StyleSheet.create({
  unreadBadge: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' },
  unreadBadgeText: { fontSize: 8, fontWeight: '800', color: C.dark },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 24 },
  emptyText: { fontSize: 14, fontWeight: '700', color: C.textGray },
  emptySubtext: { fontSize: 11, color: C.border, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  rowUnread: { backgroundColor: 'rgba(245,197,24,0.05)' },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  title: { fontSize: 13, fontWeight: '800', color: C.textDark },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.accent },
  message: { fontSize: 13, color: C.textGray, lineHeight: 19, marginBottom: 4 },
  date: { fontSize: 10, color: C.border, fontWeight: '600' },
  showMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  showMoreText: { fontSize: 13, fontWeight: '700', color: C.accent },
});
