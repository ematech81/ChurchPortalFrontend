import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Modal, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

// ── Option lists ──────────────────────────────────────────────────────────────

const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
// Pastor and Minister are excluded from the general edit form's picker.
// Records with those statuses display the current value correctly,
// but the admin cannot re-assign them here — use the Pastor registration flow.
const MEMBER_STATUSES = ['First Timer', 'New Convert', 'Member', 'Worker', 'Backslidden', 'Visitor'];
const BAPTISM_STATUSES = ['None', 'Water Baptism', 'Holy Spirit', 'Both'];
const MEMBERSHIP_CATEGORIES = ['New Member', 'Existing / Old Member', 'Pastor Registration', 'Youth Member', 'Children Member', 'Family Registration'];
const DEPARTMENTS = ['Ushering', 'Choir', 'Media', 'Protocol', 'Children Department', 'Evangelism', 'Technical Unit', 'Prayer Unit', 'Welfare', 'Sanctuary Keepers'];
// Pastoral church roles excluded — assign those via the Pastor registration flow.
const CHURCH_ROLES = ['Departmental Leader', 'Worker', 'Member', 'Deacon / Deaconess', 'Elder', 'Other'];
const PASTORAL_POSITIONS = ['Youth Pastor', 'Associate Pastor', 'Assistant Pastor', 'Prayer Pastor', 'Evangelism Pastor'];
const AGE_RANGES = ['0–5', '6–12', '13–17'];
const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Other'];
const RELATIONSHIP_OPTIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Guardian', 'Other'];
const AVAILABLE_TAGS = ['Follow-Up Needed', 'First Timer', 'Worker', 'Leader', 'Volunteer'];

// API → display label reverse maps
const GENDER_LABEL: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };
const MARITAL_LABEL: Record<string, string> = { single: 'Single', married: 'Married', divorced: 'Divorced', widowed: 'Widowed' };
const STATUS_LABEL: Record<string, string> = { first_timer: 'First Timer', new_convert: 'New Convert', member: 'Member', worker: 'Worker', minister: 'Minister', pastor: 'Pastor', visitor: 'Visitor', backslidden: 'Backslidden' };
const BAPTISM_LABEL: Record<string, string> = { none: 'None', water: 'Water Baptism', holy_spirit: 'Holy Spirit', both: 'Both' };
const CATEGORY_LABEL: Record<string, string> = { new_member: 'New Member', existing_member: 'Existing / Old Member', pastor_registration: 'Pastor Registration', youth_member: 'Youth Member', children_member: 'Children Member', family_registration: 'Family Registration' };
const ROLE_LABEL: Record<string, string> = { branch_pastor: 'Branch Pastor', pastor: 'Pastor', departmental_leader: 'Departmental Leader', worker: 'Worker', member: 'Member', deacon: 'Deacon / Deaconess', elder: 'Elder', other: 'Other' };
const PASTORAL_LABEL: Record<string, string> = { youth_pastor: 'Youth Pastor', associate_pastor: 'Associate Pastor', assistant_pastor: 'Assistant Pastor', prayer_pastor: 'Prayer Pastor', evangelism_pastor: 'Evangelism Pastor' };
const AGE_LABEL: Record<string, string> = { '0-5': '0–5', '6-12': '6–12', '13-17': '13–17' };

// display label → API value maps
const STATUS_API: Record<string, string> = { 'First Timer': 'first_timer', 'New Convert': 'new_convert', 'Member': 'member', 'Worker': 'worker', 'Minister': 'minister', 'Pastor': 'pastor', 'Visitor': 'visitor', 'Backslidden': 'backslidden' };
const BAPTISM_API: Record<string, string> = { 'None': 'none', 'Water Baptism': 'water', 'Holy Spirit': 'holy_spirit', 'Both': 'both' };
const CATEGORY_API: Record<string, string> = { 'New Member': 'new_member', 'Existing / Old Member': 'existing_member', 'Pastor Registration': 'pastor_registration', 'Youth Member': 'youth_member', 'Children Member': 'children_member', 'Family Registration': 'family_registration' };
const ROLE_API: Record<string, string> = { 'Branch Pastor': 'branch_pastor', 'Pastor': 'pastor', 'Departmental Leader': 'departmental_leader', 'Worker': 'worker', 'Member': 'member', 'Deacon / Deaconess': 'deacon', 'Elder': 'elder', 'Other': 'other' };
const PASTORAL_API: Record<string, string> = { 'Youth Pastor': 'youth_pastor', 'Associate Pastor': 'associate_pastor', 'Assistant Pastor': 'assistant_pastor', 'Prayer Pastor': 'prayer_pastor', 'Evangelism Pastor': 'evangelism_pastor' };
const AGE_API: Record<string, string> = { '0–5': '0-5', '6–12': '6-12', '13–17': '13-17' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatDateApi(d: Date) { return d.toISOString().split('T')[0]; }
function toDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// ── Sub-components (same as add.tsx) ─────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconWrap}><Ionicons name={icon} size={16} color={C.accent} /></View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}{required && <Text style={s.required}> *</Text>}</Text>
      {children}
    </View>
  );
}

function TInput({ value, onChange, placeholder, keyboard, focused, focusKey, setFocused, multiline }: any) {
  return (
    <TextInput
      style={[s.input, focused === focusKey && s.inputFocused, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={C.textGray} keyboardType={keyboard ?? 'default'}
      autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
      autoCorrect={false} multiline={multiline}
      onFocus={() => setFocused(focusKey)} onBlur={() => setFocused(null)}
    />
  );
}

function PickerBtn({ value, placeholder, onPress }: { value: string; placeholder: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.pickerBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={value ? s.pickerValue : s.pickerPlaceholder}>{value || placeholder}</Text>
      <Ionicons name="chevron-down" size={16} color={C.textGray} />
    </TouchableOpacity>
  );
}

function DatePickerField({ label, value, onChange, placeholder, required, maxDate }: any) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value ?? new Date());
  const handleChange = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') { setShow(false); if (selected) onChange(selected); }
    else { if (selected) setTempDate(selected); }
  };
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}{required && <Text style={s.required}> *</Text>}</Text>
      <TouchableOpacity style={s.pickerBtn} onPress={() => setShow(true)} activeOpacity={0.8}>
        <Text style={value ? s.pickerValue : s.pickerPlaceholder}>{value ? formatDateDisplay(value) : placeholder}</Text>
        <Ionicons name="calendar-outline" size={16} color={C.textGray} />
      </TouchableOpacity>
      {Platform.OS === 'android' && show && (
        <DateTimePicker value={tempDate} mode="date" display="default" onChange={handleChange} maximumDate={maxDate} />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShow(false)}>
            <View style={s.iosPickerSheet}>
              <View style={s.iosPickerHeader}>
                <TouchableOpacity onPress={() => setShow(false)}><Text style={s.iosPickerCancel}>Cancel</Text></TouchableOpacity>
                <Text style={s.iosPickerTitle}>{label}</Text>
                <TouchableOpacity onPress={() => { onChange(tempDate); setShow(false); }}><Text style={s.iosPickerDone}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={tempDate} mode="date" display="spinner" onChange={handleChange} maximumDate={maxDate} style={{ backgroundColor: C.white }} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

function PillSelector({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={s.pillRow}>
      {options.map((opt) => (
        <TouchableOpacity key={opt} style={[s.pill, selected === opt && s.pillActive]} onPress={() => onSelect(opt)} activeOpacity={0.8}>
          <Text style={[s.pillText, selected === opt && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PickerModal({ visible, title, options, selected, onSelect, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt: string) => (
              <TouchableOpacity key={opt} style={[s.sheetItem, selected === opt && s.sheetItemActive]} onPress={() => { onSelect(opt); onClose(); }}>
                <Text style={[s.sheetItemText, selected === opt && s.sheetItemTextActive]}>{opt}</Text>
                {selected === opt && <Ionicons name="checkmark-circle" size={18} color={C.accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

interface FamilyMember { id: string; name: string; phone: string; relationship: string; }

function FamilyMemberRow({ member, onUpdate, onRemove, openPicker }: { member: FamilyMember; onUpdate: (id: string, field: keyof FamilyMember, val: string) => void; onRemove: (id: string) => void; openPicker: any }) {
  return (
    <View style={s.familyRow}>
      <View style={s.familyRowTop}>
        <TouchableOpacity style={s.familyRelPicker} onPress={() => openPicker('Relationship', RELATIONSHIP_OPTIONS, member.relationship, (v: string) => onUpdate(member.id, 'relationship', v))} activeOpacity={0.8}>
          <Text style={member.relationship ? s.pickerValue : s.pickerPlaceholder}>{member.relationship || 'Select relationship'}</Text>
          <Ionicons name="chevron-down" size={14} color={C.textGray} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onRemove(member.id)} style={{ padding: 4 }}>
          <Ionicons name="close-circle" size={22} color={C.error} />
        </TouchableOpacity>
      </View>
      <TextInput style={[s.input, { marginBottom: 8 }]} placeholder="Full name" placeholderTextColor={C.textGray} value={member.name} onChangeText={(v) => onUpdate(member.id, 'name', v)} />
      <TextInput style={s.input} placeholder="Phone number (optional)" placeholderTextColor={C.textGray} keyboardType="phone-pad" value={member.phone} onChangeText={(v) => onUpdate(member.id, 'phone', v)} />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EditMemberScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  // Personal
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [maritalStatus, setMaritalStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [language, setLanguage] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Church
  const [dateJoined, setDateJoined] = useState<Date | null>(null);
  const [memberStatus, setMemberStatus] = useState('');
  const [baptismStatus, setBaptismStatus] = useState('');
  const [category, setCategory] = useState('');
  const [churchRole, setChurchRole] = useState('');
  const [pastoralPosition, setPastoralPosition] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [department, setDepartment] = useState('');
  const [deptRole, setDeptRole] = useState('');

  // Children
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [pickupAuth, setPickupAuth] = useState('');

  // Family Circle
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const addFamilyMember = () => setFamilyMembers((p) => [...p, { id: `${Date.now()}`, name: '', phone: '', relationship: '' }]);
  const updateFamilyMember = (fid: string, field: keyof FamilyMember, val: string) =>
    setFamilyMembers((p) => p.map((m) => m.id === fid ? { ...m, [field]: val } : m));
  const removeFamilyMember = (fid: string) => setFamilyMembers((p) => p.filter((m) => m.id !== fid));

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const toggleTag = (t: string) => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  // Picker modal
  const [picker, setPicker] = useState<{ title: string; options: string[]; current: string; onSelect: (v: string) => void } | null>(null);
  const openPicker = (title: string, options: string[], current: string, onSelect: (v: string) => void) =>
    setPicker({ title, options, current, onSelect });

  // ── Load member ─────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/members/${id}`);
        const m = res.data;
        setFirstName(m.firstName ?? '');
        setLastName(m.lastName ?? '');
        setMiddleName(m.middleName ?? '');
        setGender(GENDER_LABEL[m.gender] ?? '');
        setDob(toDate(m.dateOfBirth));
        setMaritalStatus(MARITAL_LABEL[m.maritalStatus] ?? '');
        setPhone(m.phone ?? '');
        setAltPhone(m.alternatePhone ?? '');
        setEmail(m.email ?? '');
        setAddress(m.address ?? '');
        setOccupation(m.occupation ?? '');
        setLanguage(m.preferredLanguage ?? '');
        setEmergencyName(m.emergencyContactName ?? '');
        setEmergencyPhone(m.emergencyContactPhone ?? '');
        setDateJoined(toDate(m.membershipDate));
        setMemberStatus(STATUS_LABEL[m.status] ?? '');
        setBaptismStatus(BAPTISM_LABEL[m.baptismStatus] ?? '');
        setCategory(CATEGORY_LABEL[m.membershipCategory] ?? '');
        setChurchRole(ROLE_LABEL[m.churchRole] ?? '');
        setPastoralPosition(PASTORAL_LABEL[m.pastoralPosition] ?? '');
        setCustomRole(m.customRole ?? '');
        setDepartment(m.departmentName ?? '');
        setDeptRole(m.departmentRole ?? '');
        setGuardianName(m.parentGuardianName ?? '');
        setGuardianPhone(m.parentGuardianPhone ?? '');
        setAgeRange(AGE_LABEL[m.ageRange] ?? '');
        setPickupAuth(m.pickupAuthorization ?? '');
        setTags(Array.isArray(m.tags) ? m.tags : []);
        const fc: any[] = m.customFields?.familyCircle ?? [];
        setFamilyMembers(fc.map((f, i) => ({ id: `${i}`, name: f.name ?? '', phone: f.phone ?? '', relationship: f.relationship ?? '' })));
      } catch {
        Alert.alert('Error', 'Could not load member data.', [{ text: 'Go Back', onPress: () => router.back() }]);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [id]);

  // ── Update ──────────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      Alert.alert('Required Fields', 'First Name, Last Name, and Phone are required.');
      return;
    }
    setSaving(true);
    try {
      const familyCircle = familyMembers
        .filter((m) => m.name.trim())
        .map((m) => ({ name: m.name.trim(), phone: m.phone.trim() || undefined, relationship: m.relationship || 'Other' }));

      const payload: Record<string, any> = {
        firstName: firstName.trim(), lastName: lastName.trim(),
        middleName: middleName || undefined,
        gender: gender ? gender.toLowerCase() : undefined,
        dateOfBirth: dob ? formatDateApi(dob) : undefined,
        maritalStatus: maritalStatus ? maritalStatus.toLowerCase() : undefined,
        phone: phone.trim(), alternatePhone: altPhone || undefined,
        email: email || undefined, address: address || undefined,
        occupation: occupation || undefined, preferredLanguage: language || undefined,
        emergencyContactName: emergencyName || undefined,
        emergencyContactPhone: emergencyPhone || undefined,
        membershipDate: dateJoined ? formatDateApi(dateJoined) : undefined,
        status: STATUS_API[memberStatus] ?? 'first_timer',
        baptismStatus: BAPTISM_API[baptismStatus] ?? undefined,
        membershipCategory: CATEGORY_API[category] ?? undefined,
        churchRole: ROLE_API[churchRole] ?? undefined,
        pastoralPosition: PASTORAL_API[pastoralPosition] ?? undefined,
        customRole: customRole || undefined,
        departmentName: department || undefined,
        departmentRole: deptRole || undefined,
        tags,
        customFields: { familyCircle },
      };

      const isChildren = category === 'Children Member';
      if (isChildren) {
        payload.parentGuardianName = guardianName || undefined;
        payload.parentGuardianPhone = guardianPhone || undefined;
        payload.ageRange = AGE_API[ageRange] ?? undefined;
        payload.pickupAuthorization = pickupAuth || undefined;
      }

      await api.patch(`/members/${id}`, payload);
      Alert.alert('Updated', `${firstName} ${lastName}'s profile has been updated.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : (msg ?? 'Update failed. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const isChildren = category === 'Children Member';
  const isPastor = churchRole === 'Pastor';
  const isOtherRole = churchRole === 'Other';
  const isExisting = category === 'Existing / Old Member';
  const today = new Date();

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loadingData) {
    return (
      <View style={{ flex: 1, backgroundColor: C.dark }}>
        <StatusBar barStyle="light-content" backgroundColor={C.dark} />
        <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Edit Member</Text>
            <View style={{ width: 30 }} />
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={{ fontSize: 14, color: C.textGray }}>Loading member data...</Text>
        </View>
      </View>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Edit Member</Text>
          <View style={{ width: 30 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* SECTION 1: Personal Details */}
        <View style={s.card}>
          <SectionHeader icon="person-outline" title="PERSONAL DETAILS" />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="First Name" required>
                <TInput value={firstName} onChange={setFirstName} placeholder="e.g. Chidi" focused={focused} focusKey="fn" setFocused={setFocused} />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Last Name" required>
                <TInput value={lastName} onChange={setLastName} placeholder="e.g. Okeke" focused={focused} focusKey="ln" setFocused={setFocused} />
              </Field>
            </View>
          </View>
          <Field label="Middle Name">
            <TInput value={middleName} onChange={setMiddleName} placeholder="Optional" focused={focused} focusKey="mn" setFocused={setFocused} />
          </Field>
          <Field label="Gender">
            <PickerBtn value={gender} placeholder="Select gender" onPress={() => openPicker('Gender', GENDERS, gender, setGender)} />
          </Field>
          <DatePickerField label="Date of Birth" value={dob} onChange={setDob} placeholder="Tap to select date" maxDate={today} />
          <Field label="Marital Status">
            <PickerBtn value={maritalStatus} placeholder="Select status" onPress={() => openPicker('Marital Status', MARITAL_STATUSES, maritalStatus, setMaritalStatus)} />
          </Field>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Phone Number" required>
                <TInput value={phone} onChange={setPhone} placeholder="+234 800 000 0000" keyboard="phone-pad" focused={focused} focusKey="ph" setFocused={setFocused} />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Alt. Phone">
                <TInput value={altPhone} onChange={setAltPhone} placeholder="Optional" keyboard="phone-pad" focused={focused} focusKey="aph" setFocused={setFocused} />
              </Field>
            </View>
          </View>
          <Field label="Email Address">
            <TInput value={email} onChange={setEmail} placeholder="member@email.com" keyboard="email-address" focused={focused} focusKey="em" setFocused={setFocused} />
          </Field>
          <Field label="Residential Address">
            <TInput value={address} onChange={setAddress} placeholder="Street, City, State" focused={focused} focusKey="addr" setFocused={setFocused} multiline />
          </Field>
          <Field label="Occupation">
            <TInput value={occupation} onChange={setOccupation} placeholder="e.g. Teacher, Engineer" focused={focused} focusKey="occ" setFocused={setFocused} />
          </Field>
          <Field label="Preferred Language">
            <PickerBtn value={language} placeholder="Select language" onPress={() => openPicker('Preferred Language', LANGUAGES, language, setLanguage)} />
          </Field>
        </View>

        {/* SECTION 2: Emergency Contact */}
        <View style={s.card}>
          <SectionHeader icon="call-outline" title="EMERGENCY CONTACT" />
          <Field label="Contact Name">
            <TInput value={emergencyName} onChange={setEmergencyName} placeholder="Full name" focused={focused} focusKey="ecn" setFocused={setFocused} />
          </Field>
          <Field label="Contact Phone">
            <TInput value={emergencyPhone} onChange={setEmergencyPhone} placeholder="+234 800 000 0000" keyboard="phone-pad" focused={focused} focusKey="ecp" setFocused={setFocused} />
          </Field>
        </View>

        {/* SECTION 3: Family Circle */}
        <View style={s.card}>
          <SectionHeader icon="people-outline" title="FAMILY CIRCLE" />
          <Text style={s.tagHint}>Optional — adding family members helps us provide better pastoral care. They do not need to attend this church.</Text>
          {familyMembers.map((fm) => (
            <FamilyMemberRow key={fm.id} member={fm} onUpdate={updateFamilyMember} onRemove={removeFamilyMember} openPicker={openPicker} />
          ))}
          <TouchableOpacity style={s.addChildBtn} onPress={addFamilyMember} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={18} color={C.accent} />
            <Text style={s.addChildText}>Add Family Member</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 4: Church Details */}
        <View style={s.card}>
          <SectionHeader icon="business-outline" title="CHURCH DETAILS" />
          <DatePickerField label="Date Joined Church (Optional)" value={dateJoined} onChange={setDateJoined} placeholder="Tap to select date" maxDate={today} />
          <Field label="Membership Status" required>
            <PickerBtn value={memberStatus} placeholder="Select status" onPress={() => openPicker('Membership Status', MEMBER_STATUSES, memberStatus, setMemberStatus)} />
          </Field>
          <Field label="Baptism Status">
            <PickerBtn value={baptismStatus} placeholder="Select baptism" onPress={() => openPicker('Baptism Status', BAPTISM_STATUSES, baptismStatus, setBaptismStatus)} />
          </Field>
          <Field label="Membership Category">
            <PillSelector options={MEMBERSHIP_CATEGORIES} selected={category} onSelect={setCategory} />
          </Field>

          {isChildren && (
            <View style={s.conditionalBlock}>
              <View style={s.conditionalBadge}><Ionicons name="happy-outline" size={13} color={C.accent} /><Text style={s.conditionalBadgeText}>CHILDREN DETAILS</Text></View>
              <Field label="Parent / Guardian Name">
                <TInput value={guardianName} onChange={setGuardianName} placeholder="Full name" focused={focused} focusKey="gn" setFocused={setFocused} />
              </Field>
              <Field label="Parent / Guardian Phone">
                <TInput value={guardianPhone} onChange={setGuardianPhone} placeholder="+234 800 000 0000" keyboard="phone-pad" focused={focused} focusKey="gp" setFocused={setFocused} />
              </Field>
              <Field label="Age Range">
                <PickerBtn value={ageRange} placeholder="Select age group" onPress={() => openPicker('Age Range', AGE_RANGES, ageRange, setAgeRange)} />
              </Field>
              <Field label="Pickup Authorization (optional)">
                <TInput value={pickupAuth} onChange={setPickupAuth} placeholder="Names authorised for pickup" focused={focused} focusKey="pu" setFocused={setFocused} multiline />
              </Field>
            </View>
          )}

          {isExisting && (
            <View style={s.conditionalBlock}>
              <View style={s.conditionalBadge}><Ionicons name="briefcase-outline" size={13} color={C.accent} /><Text style={s.conditionalBadgeText}>DEPARTMENT ASSIGNMENT</Text></View>
              <Field label="Department">
                <PickerBtn value={department} placeholder="Select department" onPress={() => openPicker('Department', DEPARTMENTS, department, setDepartment)} />
              </Field>
              <Field label="Role / Position in Department">
                <TInput value={deptRole} onChange={setDeptRole} placeholder="e.g. Coordinator, Director" focused={focused} focusKey="dr" setFocused={setFocused} />
              </Field>
            </View>
          )}
        </View>

        {/* SECTION 5: Church Role & Leadership */}
        <View style={s.card}>
          <SectionHeader icon="shield-outline" title="CHURCH ROLE & LEADERSHIP" />
          <Field label="Church Role">
            <PickerBtn value={churchRole} placeholder="Select role" onPress={() => openPicker('Church Role', CHURCH_ROLES, churchRole, setChurchRole)} />
          </Field>
          {isPastor && (
            <Field label="Pastoral Position">
              <PickerBtn value={pastoralPosition} placeholder="Select position" onPress={() => openPicker('Pastoral Position', PASTORAL_POSITIONS, pastoralPosition, setPastoralPosition)} />
            </Field>
          )}
          {isOtherRole && (
            <Field label="Custom Role / Title">
              <TInput value={customRole} onChange={setCustomRole} placeholder="e.g. HOD, Choir Coordinator" focused={focused} focusKey="cr" setFocused={setFocused} />
            </Field>
          )}
          {!isExisting && (
            <Field label="Department (optional)">
              <PickerBtn value={department} placeholder="Select department" onPress={() => openPicker('Department', DEPARTMENTS, department, setDepartment)} />
            </Field>
          )}
        </View>

        {/* SECTION 6: Tags */}
        <View style={s.card}>
          <SectionHeader icon="pricetag-outline" title="TAGS & LABELS" />
          <Text style={s.tagHint}>Quick flags for follow-up, reporting and task assignment</Text>
          <View style={s.pillRow}>
            {AVAILABLE_TAGS.map((t) => (
              <TouchableOpacity key={t} style={[s.pill, tags.includes(t) && s.pillActive]} onPress={() => toggleTag(t)} activeOpacity={0.8}>
                <Text style={[s.pillText, tags.includes(t) && s.pillTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Update Button */}
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleUpdate} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={C.dark} /> : (
            <>
              <MaterialCommunityIcons name="content-save-check" size={20} color={C.dark} />
              <Text style={s.saveBtnText}>UPDATE MEMBER</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={s.requiredHint}>Fields marked with * are mandatory.</Text>
      </ScrollView>

      {picker && (
        <PickerModal visible={!!picker} title={picker.title} options={picker.options} selected={picker.current} onSelect={picker.onSelect} onClose={() => setPicker(null)} />
      )}
    </View>
  );
}

// ── Styles (identical to add.tsx) ─────────────────────────────────────────────

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: C.accent },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.bg },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.textDark, letterSpacing: 1 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: C.textDark, marginBottom: 6 },
  required: { color: C.error },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark },
  inputFocused: { borderColor: C.accent },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerValue: { fontSize: 14, color: C.textDark },
  pickerPlaceholder: { fontSize: 14, color: C.textGray },
  row: { flexDirection: 'row' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  pillActive: { backgroundColor: C.dark, borderColor: C.dark },
  pillText: { fontSize: 12, fontWeight: '600', color: C.textGray },
  pillTextActive: { color: C.accent },
  conditionalBlock: { backgroundColor: '#FFFBEA', borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: 'rgba(245,197,24,0.3)' },
  conditionalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  conditionalBadgeText: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 1 },
  familyRow: { backgroundColor: C.bg, borderRadius: 12, padding: 12, marginBottom: 10 },
  familyRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  familyRelPicker: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  tagHint: { fontSize: 12, color: C.textGray, marginBottom: 10 },
  addChildBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, justifyContent: 'center', borderWidth: 1.5, borderColor: C.accent, borderStyle: 'dashed', borderRadius: 10, marginTop: 4 },
  addChildText: { fontSize: 13, fontWeight: '700', color: C.accent },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 18, marginTop: 4, shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: C.dark, letterSpacing: 1.5 },
  requiredHint: { textAlign: 'center', fontSize: 12, color: C.textGray, marginTop: 12, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '70%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: C.textDark, marginBottom: 10 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetItemActive: { backgroundColor: C.accentFaint, marginHorizontal: -20, paddingHorizontal: 20 },
  sheetItemText: { fontSize: 15, color: C.textDark },
  sheetItemTextActive: { fontWeight: '700', color: C.accent },
  iosPickerSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  iosPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  iosPickerTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  iosPickerCancel: { fontSize: 15, color: C.textGray },
  iosPickerDone: { fontSize: 15, fontWeight: '700', color: C.accent },
});
