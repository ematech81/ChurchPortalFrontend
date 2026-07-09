import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Modal, Image, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { C } from '../../constants/theme';

const STEPS = ['Profile', 'Services', 'Launch'];

const DENOMINATIONS = [
  'Anglican', 'Assemblies of God', 'Baptist', 'Catholic',
  'Deeper Life', 'Lutheran', 'Methodist', 'MFM',
  'Non-Denominational', 'Pentecostal', 'Presbyterian',
  'RCCG', 'Seventh-Day Adventist', "Winners' Chapel", 'Other',
];

function StepBar({ current }: { current: number }) {
  return (
    <View style={s.stepBar}>
      {STEPS.map((label, i) => (
        <View key={i} style={s.stepItem}>
          {i > 0 && (
            <View style={[s.stepLine, i <= current && s.stepLineDone]} />
          )}
          <View style={[s.stepCircle, i === current && s.stepCircleActive, i < current && s.stepCircleDone]}>
            {i < current
              ? <Ionicons name="checkmark" size={13} color={C.dark} />
              : <Text style={[s.stepNum, i <= current && s.stepNumActive]}>{i + 1}</Text>
            }
          </View>
          <Text style={[s.stepLabel, i === current && s.stepLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function PickerModal({ visible, options, selected, onSelect, onClose, title }: {
  visible: boolean; options: string[]; selected: string;
  onSelect: (v: string) => void; onClose: () => void; title: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[s.sheetItem, selected === opt && s.sheetItemActive]}
                onPress={() => { onSelect(opt); onClose(); }}
              >
                <Text style={[s.sheetItemText, selected === opt && s.sheetItemTextActive]}>{opt}</Text>
                {selected === opt && <Ionicons name="checkmark-circle" size={20} color={C.accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function Step1Screen() {
  const router = useRouter();
  const updateTokens = useAuthStore((s) => s.updateTokens);
  const [logo, setLogo] = useState<string | null>(null);
  const [churchName, setChurchName] = useState('');
  const [denomination, setDenomination] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [showDenomPicker, setShowDenomPicker] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setLogo(result.assets[0].uri);
  };

  const handleContinue = async () => {
    if (!churchName.trim()) return;
    setSaving(true);
    setServerError('');
    try {
      const res = await api.post('/churches', {
        name: churchName,
        denomination: denomination || undefined,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        logoUrl: logo || undefined,
      });
      // Server returns fresh tokens with churchId now in JWT payload
      const { church, accessToken, refreshToken, user } = res.data;
      await updateTokens(user, accessToken, refreshToken);
      router.push('/(onboarding)/step2');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? 'Failed to save church profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (field: string) => [
    s.input,
    focused === field && s.inputFocused,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Kingdom Portal</Text>
          <TouchableOpacity
            onPress={async () => {
              await useAuthStore.getState().logout();
              router.replace('/(auth)/login');
            }}
            style={s.signOutBtn}
          >
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <StepBar current={0} />

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Church Profile{'\n'}Setup</Text>
          <Text style={s.cardSubtitle}>
            Provide the foundational details of your ministry to begin personalizing your digital portal.
          </Text>

          {/* Logo Upload */}
          <TouchableOpacity style={s.logoWrap} onPress={pickLogo} activeOpacity={0.8}>
            <View style={s.logoRing}>
              {logo ? (
                <Image source={{ uri: logo }} style={s.logoImage} />
              ) : (
                <MaterialCommunityIcons name="church" size={52} color={C.textGray} />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.uploadRow} onPress={pickLogo}>
            <Ionicons name="cloud-upload-outline" size={16} color={C.textDark} />
            <Text style={s.uploadText}>UPLOAD LOGO</Text>
          </TouchableOpacity>
          <Text style={s.uploadHint}>PNG or JPG, max 2MB</Text>

          {/* Fields */}
          <Text style={s.label}>Church Name</Text>
          <TextInput
            style={inputStyle('name')}
            placeholder="e.g. Victory Assembly International"
            placeholderTextColor={C.textGray}
            value={churchName}
            onChangeText={setChurchName}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
          />

          <Text style={s.label}>Denomination</Text>
          <TouchableOpacity
            style={[s.pickerBtn, focused === 'denom' && s.inputFocused]}
            onPress={() => setShowDenomPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={denomination ? s.pickerSelected : s.pickerPlaceholder}>
              {denomination || 'Select your denomination'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.textGray} />
          </TouchableOpacity>

          <Text style={s.label}>Physical Address</Text>
          <View style={[s.inputRow, focused === 'addr' && s.inputFocused]}>
            <Ionicons name="location-outline" size={16} color={C.textGray} style={{ marginRight: 8 }} />
            <TextInput
              style={[s.input, { flex: 1, borderWidth: 0, marginBottom: 0, paddingHorizontal: 0 }]}
              placeholder="123 Faith Street, City, State"
              placeholderTextColor={C.textGray}
              value={address}
              onChangeText={setAddress}
              onFocus={() => setFocused('addr')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <Text style={s.label}>Primary Phone</Text>
          <TextInput
            style={inputStyle('phone')}
            placeholder="+234 (000) 000-0000"
            placeholderTextColor={C.textGray}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            onFocus={() => setFocused('phone')}
            onBlur={() => setFocused(null)}
          />

          <Text style={s.label}>Official Email</Text>
          <TextInput
            style={inputStyle('email')}
            placeholder="contact@churchname.org"
            placeholderTextColor={C.textGray}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
          />

          {/* Server Error */}
          {serverError ? (
            <View style={s.serverError}>
              <Ionicons name="alert-circle-outline" size={15} color={C.error} />
              <Text style={s.serverErrorText}>{serverError}</Text>
            </View>
          ) : null}

          {/* Buttons */}
          <TouchableOpacity style={s.draftBtn} onPress={() => {}}>
            <Text style={s.draftBtnText}>SAVE DRAFT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.continueBtn, (saving || !churchName.trim()) && { opacity: 0.6 }]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={saving || !churchName.trim()}
          >
            {saving ? (
              <ActivityIndicator color={C.dark} />
            ) : (
              <Text style={s.continueBtnText}>CONTINUE TO STEP 2</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Support Footer */}
        <View style={s.supportPill}>
          <Text style={s.supportText}>Need assistance with setup?</Text>
          <View style={s.supportDivider} />
          <TouchableOpacity style={s.supportBtn}>
            <Ionicons name="headset-outline" size={16} color={C.textDark} />
            <Text style={s.supportBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PickerModal
        visible={showDenomPicker}
        title="Select Denomination"
        options={DENOMINATIONS}
        selected={denomination}
        onSelect={setDenomination}
        onClose={() => setShowDenomPicker(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  signOutBtn: { position: 'absolute', right: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.accent, letterSpacing: 1 },
  stepBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: C.bg, alignItems: 'flex-start' },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepLine: { position: 'absolute', left: '-50%', right: '50%', top: 13, height: 2, backgroundColor: C.border },
  stepLineDone: { backgroundColor: C.accent },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: C.accent, borderWidth: 3, borderColor: C.dark },
  stepCircleDone: { backgroundColor: C.accent },
  stepNum: { fontSize: 12, fontWeight: '700', color: C.textGray },
  stepNumActive: { color: C.dark },
  stepLabel: { fontSize: 10, color: C.textGray, marginTop: 5, fontWeight: '500', textAlign: 'center' },
  stepLabelActive: { color: C.dark, fontWeight: '700' },
  card: { marginHorizontal: 16, backgroundColor: C.white, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardTitle: { fontSize: 26, fontWeight: '800', color: C.textDark, textAlign: 'center', lineHeight: 34, marginBottom: 10 },
  cardSubtitle: { fontSize: 14, color: C.textGray, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 12 },
  logoRing: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: C.accent, backgroundColor: '#F8F8FA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: 120, height: 120 },
  uploadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 },
  uploadText: { fontSize: 13, fontWeight: '700', color: C.textDark, letterSpacing: 0.5 },
  uploadHint: { fontSize: 11, color: C.textGray, textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: C.textDark, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: C.textDark },
  inputFocused: { borderColor: C.accent },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  pickerPlaceholder: { fontSize: 14, color: C.textGray },
  pickerSelected: { fontSize: 14, color: C.textDark },
  draftBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 24 },
  draftBtnText: { fontSize: 13, fontWeight: '700', color: C.textGray, letterSpacing: 1 },
  continueBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  continueBtnText: { fontSize: 15, fontWeight: '800', color: C.dark, letterSpacing: 1 },
  supportPill: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 24, backgroundColor: C.white, borderRadius: 50, paddingVertical: 14, paddingHorizontal: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  supportText: { fontSize: 12, color: C.textDark, flex: 1 },
  supportDivider: { width: 1, height: 20, backgroundColor: C.border, marginHorizontal: 12 },
  supportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  supportBtnText: { fontSize: 12, fontWeight: '600', color: C.textDark },
  serverError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 16 },
  serverErrorText: { fontSize: 13, color: C.error, flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '70%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: C.textDark, marginBottom: 12 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetItemActive: { backgroundColor: C.accentFaint, marginHorizontal: -20, paddingHorizontal: 20 },
  sheetItemText: { fontSize: 15, color: C.textDark },
  sheetItemTextActive: { fontWeight: '700', color: C.accent },
});
