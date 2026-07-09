import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Modal, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

// ── Static option lists ───────────────────────────────────────────────────────

const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
// Pastor and Minister statuses are set exclusively through the dedicated
// Pastor registration form (/admin/pastors/add). The general member form
// must never produce those classifications — they contaminate filter queries.
const MEMBER_STATUSES = ['First Timer', 'New Convert', 'Member', 'Worker', 'Backslidden'];
const STATUS_API: Record<string, string> = {
  'First Timer': 'first_timer', 'New Convert': 'new_convert', 'Member': 'member',
  'Worker': 'worker', 'Backslidden': 'backslidden',
};
const BAPTISM_STATUSES = ['None', 'Water Baptism', 'Holy Spirit', 'Both'];
const BAPTISM_API: Record<string, string> = { 'None': 'none', 'Water Baptism': 'water', 'Holy Spirit': 'holy_spirit', 'Both': 'both' };
// 'Pastor Registration' category is intentionally excluded — use the dedicated
// Pastor registration form (/admin/pastors/add) for that flow.
const MEMBERSHIP_CATEGORIES = ['New Member', 'Existing / Old Member', 'Youth Member', 'Children Member', 'Family Registration'];
const CATEGORY_API: Record<string, string> = {
  'New Member': 'new_member', 'Existing / Old Member': 'existing_member',
  'Youth Member': 'youth_member', 'Children Member': 'children_member',
  'Family Registration': 'family_registration',
};
const DEPARTMENTS = ['Ushering', 'Choir', 'Media', 'Protocol', 'Children Department', 'Evangelism', 'Technical Unit', 'Prayer Unit', 'Welfare', 'Sanctuary Keepers'];
// Pastoral church roles (pastor / branch_pastor) are excluded from the member
// form. Assigning those roles is handled exclusively by the Pastor registration
// flow, which sets the correct status and membershipCategory in one shot.
const CHURCH_ROLES = ['Departmental Leader', 'Worker', 'Member', 'Deacon / Deaconess', 'Elder', 'Other'];
const ROLE_API: Record<string, string> = {
  'Departmental Leader': 'departmental_leader',
  'Worker': 'worker', 'Member': 'member', 'Deacon / Deaconess': 'deacon', 'Elder': 'elder', 'Other': 'other',
};
const PASTORAL_POSITIONS = ['Youth Pastor', 'Associate Pastor', 'Assistant Pastor', 'Prayer Pastor', 'Evangelism Pastor'];
const PASTORAL_API: Record<string, string> = {
  'Youth Pastor': 'youth_pastor', 'Associate Pastor': 'associate_pastor',
  'Assistant Pastor': 'assistant_pastor', 'Prayer Pastor': 'prayer_pastor',
  'Evangelism Pastor': 'evangelism_pastor',
};
const AGE_RANGES = ['0–5', '6–12', '13–17'];
const AGE_API: Record<string, string> = { '0–5': '0-5', '6–12': '6-12', '13–17': '13-17' };
const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'French', 'Other'];

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatDateApi(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconWrap}>
        <Ionicons name={icon} size={16} color={C.accent} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}{required && <Text style={s.required}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function TInput({
  value, onChange, placeholder, keyboard, focused, focusKey, setFocused, multiline,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
  keyboard?: any; focused: string | null; focusKey: string;
  setFocused: (v: string | null) => void; multiline?: boolean;
}) {
  return (
    <TextInput
      style={[s.input, focused === focusKey && s.inputFocused, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.textGray}
      keyboardType={keyboard ?? 'default'}
      autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
      autoCorrect={false}
      multiline={multiline}
      onFocus={() => setFocused(focusKey)}
      onBlur={() => setFocused(null)}
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

// ── Native Date Picker Field ──────────────────────────────────────────────────

function DatePickerField({
  label, value, onChange, placeholder, required, maxDate,
}: {
  label: string; value: Date | null;
  onChange: (date: Date) => void;
  placeholder: string; required?: boolean; maxDate?: Date;
}) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value ?? new Date());

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selected) onChange(selected);
    } else {
      if (selected) setTempDate(selected);
    }
  };

  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}{required && <Text style={s.required}> *</Text>}
      </Text>
      <TouchableOpacity style={s.pickerBtn} onPress={() => setShow(true)} activeOpacity={0.8}>
        <Text style={value ? s.pickerValue : s.pickerPlaceholder}>
          {value ? formatDateDisplay(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={C.textGray} />
      </TouchableOpacity>

      {/* Android: renders inline when show=true */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={maxDate}
        />
      )}

      {/* iOS: wrap in modal with Done button */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShow(false)}>
            <View style={s.iosPickerSheet}>
              <View style={s.iosPickerHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={s.iosPickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={s.iosPickerTitle}>{label}</Text>
                <TouchableOpacity onPress={() => { onChange(tempDate); setShow(false); }}>
                  <Text style={s.iosPickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={maxDate}
                style={{ backgroundColor: C.white }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

// ── Pill selector (for membership category) ───────────────────────────────────

function PillSelector({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={s.pillRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[s.pill, selected === opt && s.pillActive]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.8}
        >
          <Text style={[s.pillText, selected === opt && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Bottom sheet picker modal ─────────────────────────────────────────────────

function PickerModal({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title: string; options: string[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
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
                {selected === opt && <Ionicons name="checkmark-circle" size={18} color={C.accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Family Circle ─────────────────────────────────────────────────────────────

const RELATIONSHIP_OPTIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Guardian', 'Other'];

interface FamilyMember { id: string; name: string; phone: string; relationship: string; }

function FamilyMemberRow({ member, onUpdate, onRemove, openPicker }: {
  member: FamilyMember;
  onUpdate: (id: string, field: keyof FamilyMember, val: string) => void;
  onRemove: (id: string) => void;
  openPicker: (title: string, options: string[], current: string, onSelect: (v: string) => void) => void;
}) {
  return (
    <View style={s.familyRow}>
      <View style={s.familyRowTop}>
        <TouchableOpacity
          style={s.familyRelPicker}
          onPress={() => openPicker('Relationship', RELATIONSHIP_OPTIONS, member.relationship, (v) => onUpdate(member.id, 'relationship', v))}
          activeOpacity={0.8}
        >
          <Text style={member.relationship ? s.pickerValue : s.pickerPlaceholder}>
            {member.relationship || 'Select relationship'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={C.textGray} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onRemove(member.id)} style={{ padding: 4 }}>
          <Ionicons name="close-circle" size={22} color={C.error} />
        </TouchableOpacity>
      </View>
      <TextInput
        style={[s.input, { marginBottom: 8 }]}
        placeholder="Full name"
        placeholderTextColor={C.textGray}
        value={member.name}
        onChangeText={(v) => onUpdate(member.id, 'name', v)}
      />
      <TextInput
        style={s.input}
        placeholder="Phone number (optional)"
        placeholderTextColor={C.textGray}
        keyboardType="phone-pad"
        value={member.phone}
        onChangeText={(v) => onUpdate(member.id, 'phone', v)}
      />
    </View>
  );
}

// ── Family child row ──────────────────────────────────────────────────────────

interface FamilyChild { name: string; age: string; gender: string; }

function ChildRow({ child, index, onChange, onRemove }: {
  child: FamilyChild; index: number;
  onChange: (i: number, field: keyof FamilyChild, v: string) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <View style={s.childRow}>
      <View style={s.childRowHeader}>
        <Text style={s.childRowLabel}>Child {index + 1}</Text>
        <TouchableOpacity onPress={() => onRemove(index)}>
          <Ionicons name="close-circle" size={20} color={C.error} />
        </TouchableOpacity>
      </View>
      <View style={s.row}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder="Child name"
          placeholderTextColor={C.textGray}
          value={child.name}
          onChangeText={(v) => onChange(index, 'name', v)}
        />
        <View style={{ width: 10 }} />
        <TextInput
          style={[s.input, { width: 60 }]}
          placeholder="Age"
          placeholderTextColor={C.textGray}
          value={child.age}
          keyboardType="number-pad"
          onChangeText={(v) => onChange(index, 'age', v)}
        />
      </View>
      <View style={s.genderRow}>
        {['Male', 'Female'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[s.genderChip, child.gender === g && s.genderChipActive]}
            onPress={() => onChange(index, 'gender', g)}
          >
            <Text style={[s.genderChipText, child.gender === g && s.genderChipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AddMemberScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  // Personal Details
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

  // Church Details
  const [dateJoined, setDateJoined] = useState<Date | null>(null);
  const [memberStatus, setMemberStatus] = useState('');
  const [baptismStatus, setBaptismStatus] = useState('');
  const [category, setCategory] = useState('');

  // Children fields
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [pickupAuth, setPickupAuth] = useState('');

  // Family Circle
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const addFamilyMember = () =>
    setFamilyMembers((prev) => [...prev, { id: Date.now().toString(), name: '', phone: '', relationship: '' }]);
  const updateFamilyMember = (id: string, field: keyof FamilyMember, val: string) =>
    setFamilyMembers((prev) => prev.map((m) => m.id === id ? { ...m, [field]: val } : m));
  const removeFamilyMember = (id: string) =>
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));

  // Legacy family fields (for Family Registration category)
  const [familyName, setFamilyName] = useState('');
  const [spouseName, setSpouseName] = useState('');
  const [familyChildren, setFamilyChildren] = useState<FamilyChild[]>([]);

  // Department
  const [department, setDepartment] = useState('');
  const [deptRole, setDeptRole] = useState('');

  // Role
  const [churchRole, setChurchRole] = useState('');
  const [pastoralPosition, setPastoralPosition] = useState('');
  const [customRole, setCustomRole] = useState('');

  // Tags — searchable flags used by the Follow-Up Engine and reporting module
  const AVAILABLE_TAGS = ['Follow-Up Needed', 'First Timer', 'Worker', 'Leader', 'Volunteer'];
  const [tags, setTags] = useState<string[]>([]);
  const toggleTag = (t: string) => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  // Picker modal state
  const [picker, setPicker] = useState<{ title: string; options: string[]; current: string; onSelect: (v: string) => void } | null>(null);
  const openPicker = (title: string, options: string[], current: string, onSelect: (v: string) => void) =>
    setPicker({ title, options, current, onSelect });


  const addChild = () => setFamilyChildren((prev) => [...prev, { name: '', age: '', gender: '' }]);
  const updateChild = (i: number, field: keyof FamilyChild, v: string) =>
    setFamilyChildren((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: v } : c));
  const removeChild = (i: number) => setFamilyChildren((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      Alert.alert('Required Fields', 'Please fill in First Name, Last Name, and Phone Number.');
      return;
    }
    setSaving(true);
    try {
      const familyCircle = familyMembers
        .filter((m) => m.name.trim())
        .map((m) => ({ name: m.name.trim(), phone: m.phone.trim() || undefined, relationship: m.relationship || 'Other' }));

      const payload: Record<string, any> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName || undefined,
        gender: gender ? gender.toLowerCase() : undefined,
        dateOfBirth: dob ? formatDateApi(dob) : undefined,
        maritalStatus: maritalStatus ? maritalStatus.toLowerCase() : undefined,
        phone: phone.trim(),
        alternatePhone: altPhone || undefined,
        email: email || undefined,
        address: address || undefined,
        occupation: occupation || undefined,
        preferredLanguage: language || undefined,
        emergencyContactName: emergencyName || undefined,
        emergencyContactPhone: emergencyPhone || undefined,
        membershipDate: dateJoined ? formatDateApi(dateJoined) : undefined,
        status: STATUS_API[memberStatus] ?? 'first_timer',
        baptismStatus: BAPTISM_API[baptismStatus] ?? 'none',
        membershipCategory: CATEGORY_API[category] ?? undefined,
        churchRole: ROLE_API[churchRole] ?? undefined,
        pastoralPosition: PASTORAL_API[pastoralPosition] ?? undefined,
        customRole: customRole || undefined,
        departmentName: department || undefined,
        departmentRole: deptRole || undefined,
        tags,
        customFields: familyCircle.length > 0 ? { familyCircle } : undefined,
      };

      if (category === 'Children Member') {
        payload.parentGuardianName = guardianName || undefined;
        payload.parentGuardianPhone = guardianPhone || undefined;
        payload.ageRange = AGE_API[ageRange] ?? undefined;
        payload.pickupAuthorization = pickupAuth || undefined;
      }

      await api.post('/members', payload);

      if (category === 'Family Registration' && familyName.trim()) {
        await api.post('/families', {
          familyName: familyName.trim(),
          spouseName: spouseName || undefined,
          children: familyChildren.filter((c) => c.name.trim()),
          numberOfChildren: familyChildren.length,
        }).catch(() => {});
      }

      Alert.alert('Success', `${firstName} ${lastName} has been registered successfully.`, [
        { text: 'Add Another', onPress: () => router.replace('/members/add' as any) },
        { text: 'View Members', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : (msg ?? 'Registration failed. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const isChildren = category === 'Children Member';
  const isFamily = category === 'Family Registration';
  const isExisting = category === 'Existing / Old Member';
  const isOtherRole = churchRole === 'Other';
  const today = new Date();

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Register Member</Text>
          <View style={{ width: 30 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      >
        {/* ── SECTION 1: Personal Details ─────────────────────────────── */}
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

          <DatePickerField
            label="Date of Birth"
            value={dob}
            onChange={setDob}
            placeholder="Tap to select date"
            maxDate={today}
          />

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

        {/* ── SECTION 2: Emergency Contact ─────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="call-outline" title="EMERGENCY CONTACT" />
          <Field label="Contact Name">
            <TInput value={emergencyName} onChange={setEmergencyName} placeholder="Full name" focused={focused} focusKey="ecn" setFocused={setFocused} />
          </Field>
          <Field label="Contact Phone">
            <TInput value={emergencyPhone} onChange={setEmergencyPhone} placeholder="+234 800 000 0000" keyboard="phone-pad" focused={focused} focusKey="ecp" setFocused={setFocused} />
          </Field>
        </View>

        {/* ── SECTION 2.5: Family Circle ───────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="people-outline" title="FAMILY CIRCLE" />
          <Text style={s.tagHint}>Optional — adding family members helps us provide better pastoral care and follow-up. They do not need to attend this church.</Text>

          {familyMembers.map((fm) => (
            <FamilyMemberRow
              key={fm.id}
              member={fm}
              onUpdate={updateFamilyMember}
              onRemove={removeFamilyMember}
              openPicker={openPicker}
            />
          ))}

          <TouchableOpacity style={s.addChildBtn} onPress={addFamilyMember} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={18} color={C.accent} />
            <Text style={s.addChildText}>Add Family Member</Text>
          </TouchableOpacity>
        </View>

        {/* ── SECTION 3: Church Details ─────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="business-outline" title="CHURCH DETAILS" />

          <DatePickerField
            label="Date Joined Church (Optional)"
            value={dateJoined}
            onChange={setDateJoined}
            placeholder="Tap to select date"
            maxDate={today}
          />

          <Field label="Membership Status" required>
            <PickerBtn value={memberStatus} placeholder="Select status" onPress={() => openPicker('Membership Status', MEMBER_STATUSES, memberStatus, setMemberStatus)} />
          </Field>

          <Field label="Baptism Status">
            <PickerBtn value={baptismStatus} placeholder="Select baptism" onPress={() => openPicker('Baptism Status', BAPTISM_STATUSES, baptismStatus, setBaptismStatus)} />
          </Field>

          <Field label="Membership Category">
            <PillSelector options={MEMBERSHIP_CATEGORIES} selected={category} onSelect={setCategory} />
          </Field>

          {/* Conditional: Children Member */}
          {isChildren && (
            <View style={s.conditionalBlock}>
              <View style={s.conditionalBadge}>
                <Ionicons name="happy-outline" size={13} color={C.accent} />
                <Text style={s.conditionalBadgeText}>CHILDREN DETAILS</Text>
              </View>
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

          {/* Conditional: Family Registration */}
          {isFamily && (
            <View style={s.conditionalBlock}>
              <View style={s.conditionalBadge}>
                <Ionicons name="home-outline" size={13} color={C.accent} />
                <Text style={s.conditionalBadgeText}>FAMILY DETAILS</Text>
              </View>
              <Field label="Family Name">
                <TInput value={familyName} onChange={setFamilyName} placeholder="e.g. The Okeke Family" focused={focused} focusKey="fam" setFocused={setFocused} />
              </Field>
              <Field label="Spouse Name">
                <TInput value={spouseName} onChange={setSpouseName} placeholder="Full name of spouse" focused={focused} focusKey="sp" setFocused={setFocused} />
              </Field>
              <Text style={s.label}>Children</Text>
              {familyChildren.map((child, i) => (
                <ChildRow key={i} child={child} index={i} onChange={updateChild} onRemove={removeChild} />
              ))}
              <TouchableOpacity style={s.addChildBtn} onPress={addChild} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color={C.accent} />
                <Text style={s.addChildText}>Add Child</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Conditional: Existing Member → Department */}
          {isExisting && (
            <View style={s.conditionalBlock}>
              <View style={s.conditionalBadge}>
                <Ionicons name="briefcase-outline" size={13} color={C.accent} />
                <Text style={s.conditionalBadgeText}>DEPARTMENT ASSIGNMENT</Text>
              </View>
              <Field label="Department">
                <PickerBtn value={department} placeholder="Select department" onPress={() => openPicker('Department', DEPARTMENTS, department, setDepartment)} />
              </Field>
              <Field label="Role / Position in Department">
                <TInput value={deptRole} onChange={setDeptRole} placeholder="e.g. Coordinator, Director" focused={focused} focusKey="dr" setFocused={setFocused} />
              </Field>
            </View>
          )}
        </View>

        {/* ── SECTION 4: Church Role & Leadership ─────────────────────── */}
        <View style={s.card}>
          <SectionHeader icon="shield-outline" title="CHURCH ROLE & LEADERSHIP" />

          <Field label="Church Role">
            <PickerBtn value={churchRole} placeholder="Select role" onPress={() => openPicker('Church Role', CHURCH_ROLES, churchRole, setChurchRole)} />
          </Field>

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

        {/* ── SECTION 5: Tags & Labels ─────────────────────────────────── */}
        {/* Tags are operational flags independent of status. "Follow-Up Needed" feeds
            the Follow-Up Engine module. A member can be Worker by status AND tagged
            Follow-Up Needed at the same time — you would not change their status just
            to flag them for attention. */}
        <View style={s.card}>
          <SectionHeader icon="pricetag-outline" title="TAGS & LABELS" />
          <Text style={s.tagHint}>Quick flags for follow-up, reporting and task assignment</Text>
          <View style={s.pillRow}>
            {AVAILABLE_TAGS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.pill, tags.includes(t) && s.pillActive]}
                onPress={() => toggleTag(t)}
                activeOpacity={0.8}
              >
                <Text style={[s.pillText, tags.includes(t) && s.pillTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Save Button ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={C.dark} />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={20} color={C.dark} />
              <Text style={s.saveBtnText}>SAVE MEMBER</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={s.requiredHint}>Fields marked with * are mandatory.</Text>
      </ScrollView>

      {/* Picker modal */}
      {picker && (
        <PickerModal
          visible={!!picker}
          title={picker.title}
          options={picker.options}
          selected={picker.current}
          onSelect={picker.onSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: C.accent },

  // Card / Section
  card: { backgroundColor: C.white, borderRadius: 18, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.bg },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.textDark, letterSpacing: 1 },

  // Fields
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: C.textDark, marginBottom: 6 },
  required: { color: C.error },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark },
  inputFocused: { borderColor: C.accent },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerValue: { fontSize: 14, color: C.textDark },
  pickerPlaceholder: { fontSize: 14, color: C.textGray },
  row: { flexDirection: 'row' },

  // Pill selector
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  pillActive: { backgroundColor: C.dark, borderColor: C.dark },
  pillText: { fontSize: 12, fontWeight: '600', color: C.textGray },
  pillTextActive: { color: C.accent },

  // Conditional block
  conditionalBlock: { backgroundColor: '#FFFBEA', borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: 'rgba(245,197,24,0.3)' },
  conditionalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  conditionalBadgeText: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 1 },

  // Children
  childRow: { backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 8 },
  childRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  childRowLabel: { fontSize: 13, fontWeight: '700', color: C.textDark },
  genderRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  genderChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  genderChipActive: { backgroundColor: C.dark, borderColor: C.dark },
  genderChipText: { fontSize: 12, color: C.textGray, fontWeight: '600' },
  genderChipTextActive: { color: C.white },
  addChildBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, justifyContent: 'center', borderWidth: 1.5, borderColor: C.accent, borderStyle: 'dashed', borderRadius: 10, marginTop: 4 },
  addChildText: { fontSize: 13, fontWeight: '700', color: C.accent },

  // Family Circle rows
  familyRow: { backgroundColor: C.bg, borderRadius: 12, padding: 12, marginBottom: 10 },
  familyRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  familyRelPicker: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },

  // Tags
  tagHint: { fontSize: 12, color: C.textGray, marginBottom: 10 },

  // Save
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 18, marginTop: 4, shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: C.dark, letterSpacing: 1.5 },
  requiredHint: { textAlign: 'center', fontSize: 12, color: C.textGray, marginTop: 12, marginBottom: 8 },

  // Bottom sheet picker
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '70%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: C.textDark, marginBottom: 10 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetItemActive: { backgroundColor: C.accentFaint, marginHorizontal: -20, paddingHorizontal: 20 },
  sheetItemText: { fontSize: 15, color: C.textDark },
  sheetItemTextActive: { fontWeight: '700', color: C.accent },

  // iOS date picker sheet
  iosPickerSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  iosPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  iosPickerTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  iosPickerCancel: { fontSize: 15, color: C.textGray },
  iosPickerDone: { fontSize: 15, fontWeight: '700', color: C.accent },
});
