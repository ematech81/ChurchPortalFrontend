import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { C } from '../../constants/theme';

// ── Progress Indicator ────────────────────────────────────────────────────────

function ProgressBar() {
  return (
    <View style={s.progress}>
      {/* Step 1 — Account (done) */}
      <View style={s.stepItem}>
        <View style={[s.stepCircle, s.stepDone]}>
          <Ionicons name="checkmark" size={14} color={C.white} />
        </View>
        <Text style={s.stepLabelDone}>Account</Text>
      </View>
      <View style={[s.stepLine, s.stepLineDone]} />

      {/* Step 2 — Profile (done) */}
      <View style={s.stepItem}>
        <View style={[s.stepCircle, s.stepDone]}>
          <Ionicons name="checkmark" size={14} color={C.white} />
        </View>
        <Text style={s.stepLabelDone}>Profile</Text>
      </View>
      <View style={s.stepLine} />

      {/* Step 3 — Branches (current) */}
      <View style={s.stepItem}>
        <View style={[s.stepCircle, s.stepCurrent]}>
          <Text style={s.stepNum}>3</Text>
        </View>
        <Text style={s.stepLabelCurrent}>Branches</Text>
      </View>
    </View>
  );
}

// ── Branch Row (for multi-branch input) ───────────────────────────────────────

interface BranchInput { id: string; name: string; address: string; }

function BranchRow({
  branch, index, onChange, onRemove, focused, setFocused,
}: {
  branch: BranchInput; index: number;
  onChange: (id: string, field: 'name' | 'address', value: string) => void;
  onRemove: (id: string) => void;
  focused: string | null;
  setFocused: (k: string | null) => void;
}) {
  return (
    <View style={s.branchRow}>
      <View style={s.branchRowHeader}>
        <View style={s.branchNumBadge}>
          <Text style={s.branchNumText}>{index + 1}</Text>
        </View>
        <Text style={s.branchRowLabel}>Branch {index + 1}</Text>
        <TouchableOpacity onPress={() => onRemove(branch.id)} style={s.branchRemoveBtn}>
          <Ionicons name="close-circle" size={20} color={C.error} />
        </TouchableOpacity>
      </View>

      <Text style={s.fieldLabel}>Branch Name <Text style={s.required}>*</Text></Text>
      <TextInput
        style={[s.input, focused === `${branch.id}-name` && s.inputFocused]}
        placeholder="e.g. Lagos Headquarters"
        placeholderTextColor={C.textGray}
        value={branch.name}
        onChangeText={(v) => onChange(branch.id, 'name', v)}
        onFocus={() => setFocused(`${branch.id}-name`)}
        onBlur={() => setFocused(null)}
      />

      <Text style={s.fieldLabel}>Branch Address <Text style={s.optional}>(optional)</Text></Text>
      <TextInput
        style={[s.input, focused === `${branch.id}-address` && s.inputFocused]}
        placeholder="e.g. 45 Allen Avenue, Ikeja"
        placeholderTextColor={C.textGray}
        value={branch.address}
        onChangeText={(v) => onChange(branch.id, 'address', v)}
        onFocus={() => setFocused(`${branch.id}-address`)}
        onBlur={() => setFocused(null)}
      />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function Step3Screen() {
  const router = useRouter();
  const setOnboardingDone = useAuthStore((s) => s.setOnboardingDone);

  const [structure, setStructure] = useState<'single' | 'multi'>('single');
  const [branches, setBranches] = useState<BranchInput[]>([
    { id: '1', name: '', address: '' },
  ]);
  const [focused, setFocused] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const addBranch = () => {
    setBranches((prev) => [...prev, { id: Date.now().toString(), name: '', address: '' }]);
  };

  const removeBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBranch = (id: string, field: 'name' | 'address', value: string) => {
    setBranches((prev) => prev.map((b) => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleComplete = async () => {
    setSaving(true);
    setSaveError('');
    try {
      if (structure === 'multi') {
        // Only submit branches that have a name
        const named = branches.filter((b) => b.name.trim());
        for (const branch of named) {
          await api.post('/churches/branch', {
            name: branch.name.trim(),
            address: branch.address.trim() || undefined,
          });
        }
      }
      await setOnboardingDone();
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setSaveError(Array.isArray(msg) ? msg[0] : (msg ?? 'Could not save branch details. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtnHeader}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Church Setup</Text>
          <TouchableOpacity style={s.helpBtn}>
            <Ionicons name="help-circle-outline" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <ProgressBar />
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Text style={s.heroEmoji}>🎉</Text>
          </View>
          <Text style={s.heroTitle}>Almost there!</Text>
          <Text style={s.heroSub}>
            Configure how your ministry is organized. This is the final step of your digital transformation.
          </Text>
        </View>

        {/* ── Single Branch Option ── */}
        <TouchableOpacity
          style={[s.optionCard, structure === 'single' && s.optionCardSelected]}
          onPress={() => setStructure('single')}
          activeOpacity={0.85}
        >
          <View style={s.optionLeft}>
            <View style={[s.optionIconWrap, structure === 'single' && s.optionIconWrapSelected]}>
              <Ionicons name="business-outline" size={26} color={structure === 'single' ? C.white : C.textDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.optionTitle, structure === 'single' && s.optionTitleSelected]}>Single Branch</Text>
              <Text style={[s.optionDesc, structure === 'single' && s.optionDescSelected]}>
                Perfect for local ministries or independent churches focused on one location.
              </Text>
            </View>
          </View>
          <View style={[s.radio, structure === 'single' && s.radioSelected]}>
            {structure === 'single' && <View style={s.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* ── Multi-Branch Option ── */}
        <TouchableOpacity
          style={[s.optionCard, structure === 'multi' && s.optionCardSelected]}
          onPress={() => setStructure('multi')}
          activeOpacity={0.85}
        >
          <View style={s.optionLeft}>
            <View style={[s.optionIconWrap, structure === 'multi' && s.optionIconWrapSelected]}>
              <Ionicons name="git-network-outline" size={26} color={structure === 'multi' ? C.white : C.textDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.optionTitle, structure === 'multi' && s.optionTitleSelected]}>Multi-Branch / Denomination</Text>
              <Text style={[s.optionDesc, structure === 'multi' && s.optionDescSelected]}>
                Ideal for regional networks or national headquarters managing multiple satellite locations.
              </Text>
            </View>
          </View>
          <View style={[s.radio, structure === 'multi' && s.radioSelected]}>
            {structure === 'multi' && <View style={s.radioDot} />}
          </View>
        </TouchableOpacity>

        {/* ── Multi-Branch: Branch Inputs ── */}
        {structure === 'multi' && (
          <View style={s.branchSection}>
            {/* Skip notice */}
            <View style={s.skipNotice}>
              <Ionicons name="information-circle-outline" size={16} color={C.accent} />
              <Text style={s.skipNoticeText}>
                Adding branches is <Text style={s.skipNoticeBold}>optional</Text> — you can skip this and create branches anytime from the <Text style={s.skipNoticeBold}>Administration Dashboard</Text>.
              </Text>
            </View>

            <Text style={s.branchSectionTitle}>ADD YOUR BRANCHES</Text>

            {branches.map((branch, i) => (
              <BranchRow
                key={branch.id}
                branch={branch}
                index={i}
                onChange={updateBranch}
                onRemove={removeBranch}
                focused={focused}
                setFocused={setFocused}
              />
            ))}

            <TouchableOpacity style={s.addBranchBtn} onPress={addBranch} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={20} color={C.accent} />
              <Text style={s.addBranchText}>Add Another Branch</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Info Tip (Single Branch) ── */}
        {structure === 'single' && (
          <View style={s.infoTip}>
            <Ionicons name="information-circle-outline" size={18} color={C.dark} />
            <Text style={s.infoTipText}>
              Don't worry, you can easily add more branches and assign regional pastors from your main dashboard later.
            </Text>
          </View>
        )}

        {/* ── Error ── */}
        {saveError ? (
          <View style={s.errorCard}>
            <Ionicons name="alert-circle-outline" size={15} color={C.error} />
            <Text style={s.errorCardText}>{saveError}</Text>
          </View>
        ) : null}

        {/* ── Buttons ── */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.completeBtn, saving && { opacity: 0.7 }]}
            onPress={handleComplete}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Text style={s.completeBtnText}>Complete Setup</Text>
                <Text style={s.completeBtnSparkle}>✦</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtnHeader: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.white },
  helpBtn: { padding: 4 },

  // Progress bar
  progress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepLine: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginBottom: 18 },
  stepLineDone: { backgroundColor: '#4ADE80' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: '#22C55E' },
  stepCurrent: { backgroundColor: C.accent },
  stepNum: { fontSize: 14, fontWeight: '800', color: C.dark },
  stepLabelDone: { fontSize: 11, fontWeight: '600', color: '#4ADE80' },
  stepLabelCurrent: { fontSize: 11, fontWeight: '700', color: C.accent },

  // Hero
  hero: { alignItems: 'center', marginBottom: 28 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245,197,24,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(245,197,24,0.3)' },
  heroEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: C.textDark, marginBottom: 10 },
  heroSub: { fontSize: 14, color: C.textGray, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },

  // Option cards
  optionCard: { backgroundColor: C.white, borderRadius: 16, padding: 18, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  optionCardSelected: { borderColor: C.dark, backgroundColor: C.white },
  optionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, flex: 1 },
  optionIconWrap: { width: 54, height: 54, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  optionIconWrapSelected: { backgroundColor: C.dark },
  optionTitle: { fontSize: 16, fontWeight: '700', color: C.textDark, marginBottom: 5 },
  optionTitleSelected: { color: C.dark },
  optionDesc: { fontSize: 13, color: C.textGray, lineHeight: 20 },
  optionDescSelected: { color: C.textGray },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  radioSelected: { borderColor: C.dark },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.dark },

  // Branch section
  branchSection: { marginTop: 4, marginBottom: 8 },
  skipNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFBEA', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245,197,24,0.4)' },
  skipNoticeText: { flex: 1, fontSize: 13, color: C.textDark, lineHeight: 20 },
  skipNoticeBold: { fontWeight: '700', color: C.textDark },
  branchSectionTitle: { fontSize: 11, fontWeight: '800', color: C.textGray, letterSpacing: 1.5, marginBottom: 14 },

  // Branch row
  branchRow: { backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  branchRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  branchNumBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  branchNumText: { fontSize: 12, fontWeight: '800', color: C.accent },
  branchRowLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: C.textDark },
  branchRemoveBtn: { padding: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textDark, marginBottom: 6 },
  required: { color: C.error },
  optional: { fontWeight: '400', color: C.textGray },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark, marginBottom: 12 },
  inputFocused: { borderColor: C.accent },

  // Add branch button
  addBranchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: C.accent, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  addBranchText: { fontSize: 14, fontWeight: '700', color: C.accent },

  // Info tip (single branch)
  infoTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 16, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  infoTipText: { flex: 1, fontSize: 13, color: C.textDark, lineHeight: 20 },

  // Error
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorCardText: { fontSize: 13, color: C.error, flex: 1 },

  // Bottom buttons
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  backBtn: { flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: C.white },
  backBtnText: { fontSize: 15, fontWeight: '700', color: C.textDark },
  completeBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.dark, borderRadius: 14, paddingVertical: 16, shadowColor: C.dark, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  completeBtnText: { fontSize: 15, fontWeight: '800', color: C.white },
  completeBtnSparkle: { fontSize: 16, color: C.accent },
});
