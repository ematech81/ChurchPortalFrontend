import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, Alert, TextInput, Modal, Linking,
} from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { C } from '../../../constants/theme';

interface Branch {
  id: string; name: string; city: string | null; address: string | null;
  memberCount: number; pastor: any | null;
}

interface EligiblePastor {
  id: string; firstName: string; lastName: string;
  email: string | null; phone: string | null; churchId: string | null;
  status?: string; role?: string; departmentName?: string | null;
  pastoralPosition?: string | null; customFields?: Record<string, any>;
  _source: 'user' | 'member';
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function fmtToday() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
}

function getSpecialization(p: EligiblePastor) {
  if (p.pastoralPosition) return p.pastoralPosition.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (p.departmentName) return p.departmentName;
  return 'General Ministry';
}

function getCurrentLocation(p: EligiblePastor, branchMap: Map<string, Branch>) {
  if (!p.churchId) return 'Unassigned';
  const branch = branchMap.get(p.churchId);
  return branch ? `${branch.name}${branch.city ? ', ' + branch.city : ''}` : 'Unassigned';
}

// ── Instant Confirmation Modal (shown on pastor select) ────────────────────────
function ConfirmationModal({ visible, pastor, branch, onConfirm, onCancel, submitting }: {
  visible: boolean;
  pastor: EligiblePastor | null;
  branch: Branch | null;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  if (!pastor || !branch) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={cm.overlay}>
        <View style={cm.card}>
          {/* Header */}
          <View style={cm.header}>
            <View style={cm.headerIcon}>
              <Ionicons name="person-add" size={22} color={C.accent} />
            </View>
            <Text style={cm.title}>Confirm Assignment</Text>
            <TouchableOpacity onPress={onCancel} style={cm.closeBtn}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* Pastor */}
          <View style={cm.infoRow}>
            <View style={cm.infoIcon}><Ionicons name="person" size={16} color={C.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={cm.infoLabel}>SELECTED PASTOR</Text>
              <Text style={cm.infoValue}>{pastor.firstName} {pastor.lastName}</Text>
              {pastor.phone ? (
                <Text style={cm.infoSub}>📱 {pastor.phone} — becomes login credential</Text>
              ) : (
                <Text style={[cm.infoSub, { color: '#FCA5A5' }]}>⚠️ No phone — login will not work</Text>
              )}
            </View>
          </View>

          {/* Branch */}
          <View style={cm.infoRow}>
            <View style={cm.infoIcon}><Ionicons name="business" size={16} color={C.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={cm.infoLabel}>TARGET BRANCH</Text>
              <Text style={cm.infoValue}>{branch.name}</Text>
              {branch.city ? <Text style={cm.infoSub}>📍 {branch.city}</Text> : null}
            </View>
          </View>

          {/* Effective date */}
          <View style={cm.infoRow}>
            <View style={cm.infoIcon}><Ionicons name="calendar" size={16} color={C.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={cm.infoLabel}>EFFECTIVE DATE</Text>
              <Text style={cm.infoValue}>{fmtToday()}</Text>
            </View>
          </View>

          {/* Phone note */}
          <View style={cm.notice}>
            <Ionicons name="key-outline" size={14} color={C.accent} />
            <Text style={cm.noticeText}>
              The pastor's phone number will become an active Branch Pastor login credential upon confirmation.
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[cm.confirmBtn, submitting && { opacity: 0.7 }]}
            onPress={onConfirm}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color={C.dark} />
              : <>
                  <Ionicons name="checkmark-circle" size={20} color={C.dark} />
                  <Text style={cm.confirmBtnText}>CONFIRM ASSIGNMENT</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity style={cm.cancelBtn} onPress={onCancel}>
            <Text style={cm.cancelBtnText}>Cancel & Return</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Success Modal (shown after confirmed) ─────────────────────────────────────
function SuccessModal({ visible, pastor, branch, onDone }: {
  visible: boolean;
  pastor: EligiblePastor | null;
  branch: Branch | null;
  onDone: () => void;
}) {
  const PRIVILEGES = [
    'Manage all activities within the assigned branch',
    'Oversee branch statistics and performance data',
    'Manage branch members and registrations',
    'Manage branch workers and assignments',
    'Monitor attendance and service records',
    'Perform branch-level administrative actions',
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={sm.overlay}>
        <ScrollView
          style={sm.container}
          contentContainerStyle={sm.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={sm.header}>
            <View style={sm.checkCircle}>
              <Ionicons name="checkmark" size={36} color={C.dark} />
            </View>
            <Text style={sm.title}>Assignment Confirmed!</Text>
            <Text style={sm.subtitle}>
              {pastor?.firstName} {pastor?.lastName} has been successfully assigned to {branch?.name}.
            </Text>
          </View>

          {/* ── Section 1: Branch Access ── */}
          <View style={sm.section}>
            <View style={sm.sectionHead}>
              <View style={sm.sectionIconWrap}>
                <Ionicons name="shield-checkmark" size={18} color={C.accent} />
              </View>
              <Text style={sm.sectionTitle}>Branch Administrative Access</Text>
            </View>
            {PRIVILEGES.map((priv, i) => (
              <View key={i} style={sm.bulletRow}>
                <View style={sm.bullet} />
                <Text style={sm.bulletText}>{priv}</Text>
              </View>
            ))}
          </View>

          {/* ── Section 2: Login Credential — GOLD background, high contrast ── */}
          <View style={sm.credSection}>
            <View style={sm.credHead}>
              <View style={sm.credIconWrap}>
                <Ionicons name="key" size={18} color={C.dark} />
              </View>
              <Text style={sm.credTitle}>Login Credential Activation</Text>
            </View>

            <View style={sm.credAlert}>
              <Ionicons name="alert-circle" size={18} color={C.dark} style={{ marginTop: 1 }} />
              <Text style={sm.credAlertText}>
                <Text style={sm.credAlertBold}>Very Important: </Text>
                The pastor's phone number is now an active login credential for the Branch Pastor dashboard.
              </Text>
            </View>

            {pastor?.phone ? (
              <View style={sm.phoneBox}>
                <Ionicons name="phone-portrait" size={20} color={C.dark} />
                <View style={{ flex: 1 }}>
                  <Text style={sm.phoneLabel}>Authorized Login Number</Text>
                  <Text style={sm.phoneNumber}>{pastor.phone}</Text>
                </View>
                <View style={sm.activeBadge}>
                  <Text style={sm.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>
            ) : (
              <View style={sm.noPhoneBox}>
                <Ionicons name="warning" size={18} color="#92400E" />
                <Text style={sm.noPhoneText}>
                  No phone number on file. Please update the pastor's profile to enable login access.
                </Text>
              </View>
            )}
          </View>

          {/* ── Section 3: Role Scope ── */}
          <View style={sm.section}>
            <View style={sm.sectionHead}>
              <View style={sm.sectionIconWrap}>
                <Ionicons name="git-branch" size={18} color={C.accent} />
              </View>
              <Text style={sm.sectionTitle}>Role-Based Access Scope</Text>
            </View>
            {[
              { ok: true,  text: `Access limited to ${branch?.name ?? 'assigned branch'} only` },
              { ok: false, text: 'Ministry-wide access remains under the Senior Pastor' },
              { ok: true,  text: 'Branch members, workers and attendance accessible' },
              { ok: true,  text: 'Branch-level statistics and reports accessible' },
            ].map((item, i) => (
              <View key={i} style={sm.scopeRow}>
                <Ionicons
                  name={item.ok ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={item.ok ? '#10B981' : '#EF4444'}
                />
                <Text style={sm.scopeText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* ── Section 4: Notifications ── */}
          <View style={sm.section}>
            <View style={sm.sectionHead}>
              <View style={sm.sectionIconWrap}>
                <Ionicons name="notifications" size={18} color={C.accent} />
              </View>
              <Text style={sm.sectionTitle}>Notification Sent</Text>
            </View>
            <View style={sm.notifChipRow}>
              {[
                { icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366' },
                { icon: 'mail',          label: 'Email',    color: '#0EA5E9' },
                { icon: 'phone-portrait',label: 'In-App',  color: C.accent  },
              ].map((ch) => (
                <View key={ch.label} style={sm.notifChip}>
                  <Ionicons name={ch.icon as any} size={15} color={ch.color} />
                  <Text style={sm.notifChipText}>{ch.label}</Text>
                </View>
              ))}
            </View>
            <Text style={sm.notifNote}>
              The pastor has been notified of their assignment, login instructions, and responsibilities.
            </Text>
          </View>

          <Text style={sm.date}>Effective Date: {fmtToday()}</Text>

          <TouchableOpacity style={sm.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={sm.doneBtnText}>DONE</Text>
          </TouchableOpacity>

          {pastor?.phone && (
            <TouchableOpacity
              style={sm.waBtn}
              onPress={() => {
                const msg = `Congratulations ${pastor.firstName}! You have been assigned as Branch Pastor of *${branch?.name}*.\n\nYour phone number (${pastor.phone}) is now your login credential for Kingdom Portal.\n\nLogin steps:\n1. Open Kingdom Portal\n2. Tap "Branch Pastor Login"\n3. Enter your phone number\n4. Enter the OTP sent to you\n\nGod bless your ministry! 🙏`;
                Linking.openURL(`https://wa.me/${pastor.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color={C.white} />
              <Text style={sm.waBtnText}>Send WhatsApp Notification</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Pastor Card ────────────────────────────────────────────────────────────────
function PastorCard({
  pastor, isSelected, branchMap, onSelect,
}: {
  pastor: EligiblePastor; isSelected: boolean;
  branchMap: Map<string, Branch>; onSelect: () => void;
}) {
  const isTransfer = !!pastor.churchId && branchMap.has(pastor.churchId);

  return (
    <TouchableOpacity
      style={[pc.card, isSelected && pc.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      {isSelected && <View style={pc.checkmark}><Ionicons name="checkmark-circle" size={22} color={C.accent} /></View>}

      <View style={pc.head}>
        <View style={[pc.avatarRing, isSelected && pc.avatarRingActive]}>
          <View style={pc.avatar}>
            <Text style={pc.avatarText}>{initials(pastor.firstName, pastor.lastName)}</Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pc.name}>{pastor.firstName} {pastor.lastName}</Text>
          <View style={pc.badge}>
            <Text style={pc.badgeText}>
              {pastor._source === 'user' ? 'ADMIN PASTOR' : (pastor.status?.toUpperCase() ?? 'MINISTER')}
            </Text>
          </View>
        </View>
      </View>

      <View style={pc.infoRows}>
        <View style={pc.infoRow}>
          <Text style={pc.infoLabel}>Current Status:</Text>
          <Text style={[pc.infoVal, isTransfer && { color: '#F59E0B' }]}>
            {isTransfer ? 'Eligible for Transfer' : 'Unassigned'}
          </Text>
        </View>
        <View style={pc.infoRow}>
          <Text style={pc.infoLabel}>Specialization:</Text>
          <Text style={pc.infoVal}>{getSpecialization(pastor)}</Text>
        </View>
        <View style={pc.infoRow}>
          <Text style={pc.infoLabel}>Current Location:</Text>
          <Text style={pc.infoVal}>{getCurrentLocation(pastor, branchMap)}</Text>
        </View>
        {pastor.phone ? (
          <View style={pc.infoRow}>
            <Text style={pc.infoLabel}>Login Phone:</Text>
            <Text style={[pc.infoVal, { color: '#10B981', fontWeight: '800' }]}>{pastor.phone}</Text>
          </View>
        ) : null}
      </View>

      <View style={[pc.selectBtn, isSelected && pc.selectBtnActive]}>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'person-add-outline'}
          size={15}
          color={isSelected ? C.dark : C.dark}
        />
        <Text style={[pc.selectBtnText, isSelected && { color: C.dark }]}>
          {isSelected ? 'SELECTED — TAP TO DESELECT' : 'SELECT THIS PASTOR'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function AssignPastorScreen() {
  const router = useRouter();
  const { pastorId, branchId, mode } =
    useLocalSearchParams<{ pastorId?: string; branchId?: string; mode?: string }>();

  const [branches, setBranches]             = useState<Branch[]>([]);
  const [allPastors, setAllPastors]         = useState<EligiblePastor[]>([]);
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [search, setSearch]                 = useState('');
  const [selectedPastor, setSelectedPastor] = useState<EligiblePastor | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showConfirm, setShowConfirm]       = useState(false);  // instant modal
  const [showSuccess, setShowSuccess]       = useState(false);  // success modal

  useEffect(() => {
    (async () => {
      try {
        const [bRes, uRes, mRes] = await Promise.all([
          api.get('/churches/branches'),
          api.get('/churches/pastors'),
          api.get('/members', { params: { status: 'pastoral', limit: 500 } }),
        ]);

        const branchList: Branch[] = bRes.data ?? [];
        setBranches(branchList);

        const users: EligiblePastor[]   = (uRes.data ?? []).map((u: any) => ({ ...u, _source: 'user'   as const }));
        const members: EligiblePastor[] = (mRes.data ?? []).map((m: any) => ({ ...m, _source: 'member' as const }));

        const userEmails = new Set(users.map((u) => (u.email ?? '').toLowerCase()));
        const uniqueMembers = members.filter(
          (m) => !m.email || !userEmails.has((m.email as string).toLowerCase()),
        );
        setAllPastors([...users, ...uniqueMembers]);

        // Pre-select from params
        if (pastorId) {
          const allCombined = [...users, ...uniqueMembers];
          const found = allCombined.find((p) => p.id === pastorId);
          if (found) setSelectedPastor(found);
        }
        if (branchId) {
          const found = branchList.find((b) => b.id === branchId);
          if (found) setSelectedBranch(found);
        }
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const targetBranch = useMemo(
    () => selectedBranch ?? (branchId ? branches.find((b) => b.id === branchId) ?? null : null),
    [selectedBranch, branchId, branches],
  );

  const filteredPastors = useMemo(() => {
    if (!search.trim()) return allPastors;
    const q = search.toLowerCase();
    return allPastors.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }, [allPastors, search]);

  // When a pastor card is tapped
  const handlePastorSelect = useCallback((pastor: EligiblePastor) => {
    if (selectedPastor?.id === pastor.id) {
      // Deselect
      setSelectedPastor(null);
      return;
    }

    if (!targetBranch) {
      Alert.alert(
        'Select a Branch First',
        'Please select a target branch above before choosing a pastor.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Branch selected → show instant confirmation modal
    setSelectedPastor(pastor);
    setShowConfirm(true);
  }, [selectedPastor, targetBranch]);

  // Called when user taps CONFIRM inside the instant modal
  const handleConfirm = useCallback(async () => {
    if (!selectedPastor || !targetBranch) return;
    setSubmitting(true);
    try {
      if (selectedPastor._source === 'user') {
        // Existing branch-pastor User account — just update churchId
        await api.patch(`/churches/pastors/${selectedPastor.id}/assign`, {
          branchId: targetBranch.id,
        });
      } else {
        // Member-source pastor: promote to branch pastor (creates User account for login)
        await api.post('/churches/pastors/promote-member', {
          memberId: selectedPastor.id,
          branchId: targetBranch.id,
        });
      }

      // Store notification in member customFields
      if (selectedPastor._source === 'member') {
        const existing = selectedPastor.customFields?.pastorProfile?.notifications ?? [];
        await api.patch(`/members/${selectedPastor.id}`, {
          customFields: {
            ...(selectedPastor.customFields ?? {}),
            pastorProfile: {
              ...(selectedPastor.customFields?.pastorProfile ?? {}),
              notifications: [{
                id: Date.now().toString(),
                title: 'Branch Assignment',
                message: `You have been assigned as Branch Pastor of ${targetBranch.name}.`,
                date: new Date().toISOString(),
                read: false,
                type: 'assignment',
              }, ...existing].slice(0, 50),
            },
          },
        }).catch(() => {});
      }

      setShowConfirm(false);
      setShowSuccess(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Could not complete assignment. Please try again.';
      Alert.alert('Assignment Failed', String(msg));
    } finally {
      setSubmitting(false);
    }
  }, [selectedPastor, targetBranch]);

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
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {mode === 'transfer' ? 'Branch Transfer' : 'Pastor Assignment'}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Target Branch ── */}
        {targetBranch ? (
          <View style={s.branchHero}>
            <View style={{ flex: 1 }}>
              <Text style={s.branchHeroLabel}>TARGET BRANCH</Text>
              <Text style={s.branchHeroName}>{targetBranch.name}</Text>
              <View style={s.branchHeroMeta}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={s.branchHeroMetaText}>{targetBranch.city ?? 'No location'}</Text>
              </View>
              <View style={s.branchHeroMeta}>
                <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={s.branchHeroMetaText}>Congregation: {(targetBranch.memberCount ?? 0).toLocaleString()}</Text>
              </View>
            </View>
            <View style={s.vacancyBadge}>
              <Text style={s.vacancyLine1}>VACANCY</Text>
              <Text style={s.vacancyLine2}>PASTOR</Text>
            </View>
          </View>
        ) : (
          // Branch picker when no branch pre-selected
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={s.sectionAccent} />
              <Text style={s.sectionTitle}>Step 1 — Select Target Branch</Text>
            </View>
            {branches.map((branch) => {
              const isSel = selectedBranch?.id === branch.id;
              return (
                <TouchableOpacity
                  key={branch.id}
                  style={[s.branchPickCard, isSel && s.branchPickCardSel]}
                  onPress={() => setSelectedBranch(isSel ? null : branch)}
                  activeOpacity={0.82}
                >
                  {isSel && <View style={s.branchPickCheck}><Ionicons name="checkmark-circle" size={20} color={C.accent} /></View>}
                  <Text style={[s.branchPickName, isSel && { color: C.dark }]}>{branch.name}</Text>
                  {branch.city ? <Text style={[s.branchPickCity, isSel && { color: 'rgba(18,13,46,0.7)' }]}>{branch.city}</Text> : null}
                  <Text style={[s.branchPickMeta, isSel && { color: 'rgba(18,13,46,0.6)' }]}>
                    {branch.memberCount} members · {branch.pastor ? 'Has pastor' : 'No pastor'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Pastor list ── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionTitle}>
              {targetBranch ? 'Step 2 — Select a Pastor' : 'Eligible Pastors'}
            </Text>
          </View>

          {!targetBranch && (
            <View style={s.branchFirstNote}>
              <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
              <Text style={s.branchFirstNoteText}>
                Select a branch above first, then tap a pastor to assign.
              </Text>
            </View>
          )}

          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color={C.textGray} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search pastors by name..."
              placeholderTextColor={C.textGray}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={C.textGray} />
              </TouchableOpacity>
            ) : null}
          </View>

          {filteredPastors.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="person-circle-outline" size={48} color={C.border} />
              <Text style={s.emptyTitle}>No pastors found</Text>
              <Text style={s.emptySub}>Register members with "Pastor" or "Minister" status.</Text>
            </View>
          ) : (
            filteredPastors.map((pastor) => (
              <PastorCard
                key={`${pastor._source}-${pastor.id}`}
                pastor={pastor}
                isSelected={selectedPastor?.id === pastor.id}
                branchMap={branchMap}
                onSelect={() => handlePastorSelect(pastor)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Instant confirmation modal (opens immediately on select) ── */}
      <ConfirmationModal
        visible={showConfirm}
        pastor={selectedPastor}
        branch={targetBranch}
        onConfirm={handleConfirm}
        onCancel={() => { setShowConfirm(false); setSelectedPastor(null); }}
        submitting={submitting}
      />

      {/* ── Success modal (after confirmation) ── */}
      <SuccessModal
        visible={showSuccess}
        pastor={selectedPastor}
        branch={targetBranch}
        onDone={() => { setShowSuccess(false); router.back(); }}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  branchHero: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: C.darkCard, margin: 16, borderRadius: 18, padding: 20, gap: 12 },
  branchHeroLabel: { fontSize: 9, fontWeight: '800', color: C.accent, letterSpacing: 1.5, marginBottom: 6 },
  branchHeroName: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 10, lineHeight: 28 },
  branchHeroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  branchHeroMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  vacancyBadge: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  vacancyLine1: { fontSize: 8, fontWeight: '800', color: C.dark, letterSpacing: 1 },
  vacancyLine2: { fontSize: 11, fontWeight: '800', color: C.dark },
  section: { padding: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent: { width: 4, height: 18, borderRadius: 2, backgroundColor: C.accent },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.textDark },
  branchPickCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  branchPickCardSel: { backgroundColor: C.accent, borderColor: C.accent },
  branchPickCheck: { position: 'absolute', top: 12, right: 12 },
  branchPickName: { fontSize: 15, fontWeight: '800', color: C.textDark, marginBottom: 3, paddingRight: 28 },
  branchPickCity: { fontSize: 12, color: C.textGray, marginBottom: 2 },
  branchPickMeta: { fontSize: 11, color: C.textGray },
  branchFirstNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF9C3', borderRadius: 10, padding: 12, marginBottom: 12 },
  branchFirstNoteText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark },
  empty: { alignItems: 'center', gap: 8, paddingTop: 32, paddingBottom: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center', paddingHorizontal: 20 },
});

// Instant confirmation modal styles
const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', backgroundColor: C.dark, borderRadius: 24, padding: 24, borderWidth: 1.5, borderColor: 'rgba(245,197,24,0.2)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,197,24,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: C.white },
  closeBtn: { padding: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 8 },
  infoIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(245,197,24,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  infoLabel: { fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 },
  infoValue: { fontSize: 15, fontWeight: '800', color: C.white },
  infoSub: { fontSize: 11, color: C.accent, marginTop: 3 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(245,197,24,0.08)', borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 20 },
  noticeText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, marginBottom: 10 },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: C.dark, letterSpacing: 0.6 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
});

// Success modal styles
const sm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  container: { width: '100%', maxHeight: '92%', backgroundColor: C.dark, borderRadius: 24 },
  content: { padding: 24, paddingBottom: 32 },
  header: { alignItems: 'center', marginBottom: 24 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 8 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },
  section: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 18, marginBottom: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,197,24,0.15)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.white, flex: 1 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  bullet: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.accent, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 22 },

  // Login Credential — gold background, dark text
  credSection: { backgroundColor: C.accent, borderRadius: 16, padding: 18, marginBottom: 12 },
  credHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  credIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(18,13,46,0.15)', alignItems: 'center', justifyContent: 'center' },
  credTitle: { fontSize: 15, fontWeight: '800', color: C.dark, flex: 1 },
  credAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(18,13,46,0.12)', borderRadius: 12, padding: 14, marginBottom: 12 },
  credAlertText: { flex: 1, fontSize: 14, color: C.dark, lineHeight: 22 },
  credAlertBold: { fontWeight: '800' },
  phoneBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.dark, borderRadius: 12, padding: 14 },
  phoneLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 3 },
  phoneNumber: { fontSize: 18, fontWeight: '800', color: C.accent },
  activeBadge: { backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: C.white },
  noPhoneBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF9C3', borderRadius: 12, padding: 12 },
  noPhoneText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 },

  scopeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  scopeText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 22 },
  notifChipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  notifChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  notifChipText: { fontSize: 12, fontWeight: '700', color: C.white },
  notifNote: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },
  date: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 20, marginTop: 4 },
  doneBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  doneBtnText: { fontSize: 15, fontWeight: '800', color: C.dark, letterSpacing: 0.6 },
  waBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 14 },
  waBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
});

// Pastor card styles
const pc = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1.5, borderColor: 'transparent' },
  cardSelected: { borderColor: C.accent },
  checkmark: { position: 'absolute', top: 14, right: 14, zIndex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
  avatarRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, borderColor: C.border, padding: 2, alignItems: 'center', justifyContent: 'center' },
  avatarRingActive: { borderColor: C.accent },
  avatar: { flex: 1, borderRadius: 26, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.accent },
  name: { fontSize: 16, fontWeight: '800', color: C.textDark, marginBottom: 6 },
  badge: { alignSelf: 'flex-start', backgroundColor: C.dark, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', color: C.accent, letterSpacing: 0.5 },
  infoRows: { gap: 6, marginBottom: 14 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoLabel: { fontSize: 12, color: C.textGray, width: 130 },
  infoVal: { fontSize: 12, fontWeight: '700', color: C.textDark, flex: 1 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: C.dark, borderRadius: 10, paddingVertical: 11 },
  selectBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  selectBtnText: { fontSize: 13, fontWeight: '800', color: C.dark, letterSpacing: 0.3 },
});
