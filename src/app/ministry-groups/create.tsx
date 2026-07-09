import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

const C = {
  dark: '#120D2E', darkCard: '#1E1650', accent: '#F5C518',
  bg: '#F2F2F7', white: '#FFFFFF', textDark: '#120D2E',
  textGray: '#8888A0', border: '#E8E8EF', error: '#FF4C4C',
};

const ICON_MAP: Record<string, string> = {
  home: 'home', business: 'business', heart: 'heart', hammer: 'hammer',
  people: 'people', music: 'musical-notes', star: 'star',
};
function catIcon(key: string | null): string {
  return ICON_MAP[key ?? ''] ?? 'layers-outline';
}

const STATUS_OPTIONS = ['active', 'recruiting', 'core', 'inactive'];
const CADENCE_OPTIONS = ['Weekly', 'Bi-weekly', 'Monthly', 'Shift-based', 'As needed'];

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={p.wrap}>
      <View style={p.track}>
        <View style={[p.fill, { width: `${(step / total) * 100}%` as any }]} />
      </View>
    </View>
  );
}
const p = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 16 },
  track: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: C.accent, borderRadius: 2 },
});

// ── Inline member search ──────────────────────────────────────────────────────
function MemberSearchField({ label, value, onSelect, placeholder }: {
  label: string;
  value: string;
  onSelect: (m: any) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get('/members', { params: { search: q.trim(), limit: 5 } });
      setResults(res.data ?? []);
    } catch {}
    finally { setSearching(false); }
  }, []);

  return (
    <View style={ms.wrap}>
      <Text style={ms.label}>{label}</Text>
      <View style={ms.inputRow}>
        <TextInput
          style={ms.input}
          value={query}
          onChangeText={(t) => { setQuery(t); search(t); }}
          placeholder={placeholder ?? 'Type name or phone...'}
          placeholderTextColor={C.textGray}
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={C.accent} style={{ marginRight: 8 }} />}
      </View>
      {results.length > 0 && (
        <View style={ms.results}>
          {results.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={ms.resultRow}
              onPress={() => { onSelect(m); setQuery(`${m.firstName} ${m.lastName}`); setResults([]); }}
              activeOpacity={0.8}
            >
              <View style={ms.avatar}>
                <Text style={ms.avatarText}>{m.firstName[0]}{m.lastName[0]}</Text>
              </View>
              <View>
                <Text style={ms.resultName}>{m.firstName} {m.lastName}</Text>
                <Text style={ms.resultPhone}>{m.phone}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const ms = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: C.textDark, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingLeft: 14,
  },
  input: { flex: 1, fontSize: 14, color: C.textDark, paddingVertical: 12 },
  results: {
    backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    marginTop: 4, overflow: 'hidden',
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: C.bg },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '800', color: C.accent },
  resultName: { fontSize: 13, fontWeight: '700', color: C.textDark },
  resultPhone: { fontSize: 11, color: C.textGray },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CreateGroupScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  // Step 2
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leader, setLeader] = useState<any | null>(null);
  const [leaderRoleTitle, setLeaderRoleTitle] = useState('Leader');
  const [status, setStatus] = useState('active');
  const [cadence, setCadence] = useState('');
  const [meetingDay, setMeetingDay] = useState('');

  // Step 3 — members
  const [members, setMembers] = useState<{ member: any; roleTitle: string }[]>([]);
  const [memberToAdd, setMemberToAdd] = useState<any | null>(null);
  const [memberRoleTitle, setMemberRoleTitle] = useState('Member');

  useEffect(() => {
    api.get('/group-categories').then((r) => setCategories(r.data ?? [])).catch(() => {});
  }, []);

  // When category changes, set default leader role title
  useEffect(() => {
    if (selectedCategory) {
      setLeaderRoleTitle(selectedCategory.defaultLeaderTitle ?? 'Leader');
      setMemberRoleTitle(selectedCategory.defaultMemberTitle ?? 'Member');
    }
  }, [selectedCategory]);

  const handleNext = () => {
    if (step === 1 && !selectedCategory) return;
    if (step === 2) {
      if (!name.trim()) { Alert.alert('Required', 'Please enter a group name.'); return; }
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const addMemberToList = () => {
    if (!memberToAdd) return;
    if (members.find((m) => m.member.id === memberToAdd.id)) {
      Alert.alert('Already added', 'This member is already in the list.');
      return;
    }
    setMembers((prev) => [...prev, { member: memberToAdd, roleTitle: memberRoleTitle }]);
    setMemberToAdd(null);
  };

  const removeMemberFromList = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.member.id !== id));
  };

  const handleSaveDraft = async () => {
    if (!selectedCategory) { Alert.alert('Required', 'Please select a category first.'); return; }
    setSaving(true);
    try {
      await api.post('/ministry-groups?draft=true', {
        categoryId: selectedCategory.id,
        name: name.trim() || `Draft — ${selectedCategory.name}`,
        description: description.trim() || null,
        leaderId: leader?.id ?? null,
        leaderRoleTitle: leaderRoleTitle || null,
        status: 'draft',
        isDraft: true,
      });
      Alert.alert('Draft saved', 'Your group draft has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not save draft.');
    } finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!name.trim() || !selectedCategory) return;
    setSaving(true);
    try {
      const res = await api.post('/ministry-groups', {
        categoryId: selectedCategory.id,
        name: name.trim(),
        description: description.trim() || null,
        leaderId: leader?.id ?? null,
        leaderRoleTitle: leaderRoleTitle || null,
        status,
        cadence: cadence || null,
        meetingDay: meetingDay || null,
        initialMemberIds: members.map((m) => ({ memberId: m.member.id, roleTitle: m.roleTitle })),
      });
      Alert.alert('Created!', `"${name}" has been created.`, [
        { text: 'View Group', onPress: () => router.replace({ pathname: '/ministry-groups/[id]', params: { id: res.data.id } } as any) },
      ]);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : (msg ?? 'Could not create group.'));
    } finally { setSaving(false); }
  };

  const stepLabels = ['Group Type Selection', 'Basic Information', 'Members & Review'];

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Create Group</Text>
            <Text style={s.headerSub}>Step {step} of 3 — {stepLabels[step - 1]}</Text>
          </View>
        </View>
        <ProgressBar step={step} total={3} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1: Category selection ──────────────────────────────────── */}
        {step === 1 && (
          <>
            <Text style={s.stepTitle}>What type of group are you creating?</Text>
            <Text style={s.stepSub}>
              Select the most appropriate category for your new ministry group.
            </Text>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[s.catCard, selectedCategory?.id === cat.id && s.catCardSelected]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.85}
              >
                <View style={[s.catIcon, selectedCategory?.id === cat.id && s.catIconSelected]}>
                  <Ionicons name={catIcon(cat.iconKey) as any} size={22} color={selectedCategory?.id === cat.id ? C.dark : C.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.catName, selectedCategory?.id === cat.id && s.catNameSelected]}>{cat.name}</Text>
                  <Text style={s.catDesc} numberOfLines={2}>{cat.description}</Text>
                </View>
                {selectedCategory?.id === cat.id && (
                  <Ionicons name="checkmark-circle" size={22} color={C.accent} />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── STEP 2: Group details ───────────────────────────────────────── */}
        {step === 2 && (
          <>
            <Text style={s.stepTitle}>Group Details</Text>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Group Name *</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder={`e.g. Grace Cell — Ikeja`}
                placeholderTextColor={C.textGray}
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Description *</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Briefly describe this group's purpose..."
                placeholderTextColor={C.textGray}
                multiline
              />
            </View>

            <MemberSearchField
              label="Leader"
              value={leader ? `${leader.firstName} ${leader.lastName}` : ''}
              onSelect={(m) => setLeader(m)}
              placeholder="Search members, workers, pastors..."
            />

            <View style={s.field}>
              <Text style={s.fieldLabel}>Leader Role Title</Text>
              <TextInput
                style={s.input}
                value={leaderRoleTitle}
                onChangeText={setLeaderRoleTitle}
                placeholder="e.g. Leader, Director, Coordinator"
                placeholderTextColor={C.textGray}
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Meeting Cadence</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CADENCE_OPTIONS.map((o) => (
                    <TouchableOpacity
                      key={o}
                      style={[s.pill, cadence === o && s.pillActive]}
                      onPress={() => setCadence(cadence === o ? '' : o)}
                    >
                      <Text style={[s.pillText, cadence === o && s.pillTextActive]}>{o}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Meeting Day / Time (optional)</Text>
              <TextInput
                style={s.input}
                value={meetingDay}
                onChangeText={setMeetingDay}
                placeholder="e.g. Sundays 7pm, Every 2nd Friday"
                placeholderTextColor={C.textGray}
              />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Status</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {STATUS_OPTIONS.map((o) => (
                  <TouchableOpacity
                    key={o}
                    style={[s.pill, status === o && s.pillActive]}
                    onPress={() => setStatus(o)}
                  >
                    <Text style={[s.pillText, status === o && s.pillTextActive]}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ── STEP 3: Members + Review ────────────────────────────────────── */}
        {step === 3 && (
          <>
            <Text style={s.stepTitle}>Add Initial Members</Text>

            {/* Member search + add */}
            <MemberSearchField
              label="Search & add members"
              value={memberToAdd ? `${memberToAdd.firstName} ${memberToAdd.lastName}` : ''}
              onSelect={(m) => setMemberToAdd(m)}
            />

            <View style={s.field}>
              <Text style={s.fieldLabel}>Role in group</Text>
              <TextInput
                style={s.input}
                value={memberRoleTitle}
                onChangeText={setMemberRoleTitle}
                placeholder="e.g. Member, Volunteer, Usher"
                placeholderTextColor={C.textGray}
              />
            </View>

            {memberToAdd && (
              <TouchableOpacity style={s.addMemberBtn} onPress={addMemberToList} activeOpacity={0.85}>
                <Ionicons name="person-add" size={16} color={C.dark} />
                <Text style={s.addMemberBtnText}>Add {memberToAdd.firstName}</Text>
              </TouchableOpacity>
            )}

            {members.length > 0 && (
              <View style={s.memberList}>
                {members.map((m) => (
                  <View key={m.member.id} style={s.memberRow}>
                    <View style={s.memberAvatar}>
                      <Text style={s.memberAvatarText}>
                        {m.member.firstName[0]}{m.member.lastName[0]}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>{m.member.firstName} {m.member.lastName}</Text>
                      <Text style={s.memberRole}>{m.roleTitle}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeMemberFromList(m.member.id)}>
                      <Ionicons name="close-circle" size={20} color={C.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Review summary */}
            <View style={s.reviewCard}>
              <Text style={s.reviewTitle}>Review Summary</Text>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Category</Text><Text style={s.reviewValue}>{selectedCategory?.name}</Text></View>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Name</Text><Text style={s.reviewValue}>{name}</Text></View>
              {leader && <View style={s.reviewRow}><Text style={s.reviewLabel}>Leader</Text><Text style={s.reviewValue}>{leader.firstName} {leader.lastName}</Text></View>}
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Status</Text><Text style={s.reviewValue}>{status}</Text></View>
              {cadence && <View style={s.reviewRow}><Text style={s.reviewLabel}>Cadence</Text><Text style={s.reviewValue}>{cadence}</Text></View>}
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Members</Text><Text style={s.reviewValue}>{members.length} added</Text></View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom CTA — stays above keyboard via KeyboardAvoidingView */}
      <View style={s.cta}>
        {step < 3 ? (
          <TouchableOpacity
            style={[s.nextBtn, (!selectedCategory && step === 1) && s.nextBtnDisabled]}
            onPress={handleNext}
            disabled={step === 1 && !selectedCategory}
            activeOpacity={0.85}
          >
            <Text style={s.nextBtnText}>NEXT STEP</Text>
            <Ionicons name="arrow-forward" size={18} color={C.dark} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.nextBtn, saving && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color={C.dark} /> : <Text style={s.nextBtnText}>CREATE GROUP</Text>}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.draftBtn} onPress={handleSaveDraft} disabled={saving}>
          <Text style={s.draftBtnText}>Save Draft & Exit</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },

  stepTitle: { fontSize: 20, fontWeight: '800', color: C.textDark, marginBottom: 8 },
  stepSub: { fontSize: 13, color: C.textGray, lineHeight: 20, marginBottom: 20 },

  catCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  catCardSelected: { borderColor: C.accent },
  catIcon: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: C.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  catIconSelected: { backgroundColor: C.accent },
  catName: { fontSize: 15, fontWeight: '800', color: C.textDark, marginBottom: 3 },
  catNameSelected: { color: C.dark },
  catDesc: { fontSize: 12, color: C.textGray, lineHeight: 17 },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.textDark, marginBottom: 6 },
  input: {
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.textDark,
  },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
  },
  pillActive: { backgroundColor: C.dark, borderColor: C.dark },
  pillText: { fontSize: 12, fontWeight: '600', color: C.textGray },
  pillTextActive: { color: C.accent },

  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, marginBottom: 12,
  },
  addMemberBtnText: { fontSize: 13, fontWeight: '800', color: C.dark },

  memberList: { backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: C.bg },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 11, fontWeight: '800', color: C.accent },
  memberName: { fontSize: 13, fontWeight: '700', color: C.textDark },
  memberRole: { fontSize: 11, color: C.textGray },

  reviewCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: C.accent },
  reviewTitle: { fontSize: 14, fontWeight: '800', color: C.textDark, marginBottom: 12 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.bg },
  reviewLabel: { fontSize: 12, color: C.textGray },
  reviewValue: { fontSize: 12, fontWeight: '700', color: C.textDark, maxWidth: '60%', textAlign: 'right' },

  cta: {
    backgroundColor: C.white, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.accent, borderRadius: 14, paddingVertical: 13, marginBottom: 8,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: 15, fontWeight: '800', color: C.dark, letterSpacing: 1 },
  draftBtn: { alignItems: 'center', paddingVertical: 8 },
  draftBtnText: { fontSize: 13, color: C.textGray, fontWeight: '600' },
});
