import {
  View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { C } from '../../../constants/theme';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Member {
  id: string; firstName: string; lastName: string;
  phone: string; email: string | null; status: string;
  departmentName: string | null; customFields: Record<string, any>;
}
interface Branch { id: string; name: string; city: string | null; }

type Mode = 'new' | 'existing';

// ── Options lists ──────────────────────────────────────────────────────────────
const GENDERS     = ['Male', 'Female', 'Other'];
const MARITAL     = ['Single', 'Married', 'Divorced', 'Widowed'];
const POSITIONS   = ['Youth Pastor', 'Associate Pastor', 'Assistant Pastor', 'Prayer Pastor', 'Evangelism Pastor'];
const ROLES       = ['Pastor', 'Branch Pastor', 'Departmental Leader', 'Worker', 'Deacon / Deaconess', 'Elder'];
const GENDER_API  : Record<string,string> = { Male:'male', Female:'female', Other:'other' };
const MARITAL_API : Record<string,string> = { Single:'single', Married:'married', Divorced:'divorced', Widowed:'widowed' };
const ROLE_API    : Record<string,string> = { 'Pastor':'pastor', 'Branch Pastor':'branch_pastor', 'Departmental Leader':'departmental_leader', 'Worker':'worker', 'Deacon / Deaconess':'deacon', 'Elder':'elder' };
const POSITION_API: Record<string,string> = { 'Youth Pastor':'youth_pastor', 'Associate Pastor':'associate_pastor', 'Assistant Pastor':'assistant_pastor', 'Prayer Pastor':'prayer_pastor', 'Evangelism Pastor':'evangelism_pastor' };

function initials(f: string, l: string) { return `${f?.[0]??''}${l?.[0]??''}`.toUpperCase(); }

// ── Picker Modal ───────────────────────────────────────────────────────────────
function PickerModal({ visible, title, options, onSelect, onClose }: {
  visible: boolean; title: string; options: string[];
  onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
        <View style={m.sheet}>
          <View style={m.handle} />
          <Text style={m.sheetTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <TouchableOpacity key={opt} style={m.sheetItem} onPress={() => { onSelect(opt); onClose(); }}>
                <Text style={m.sheetItemText}>{opt}</Text>
                <Ionicons name="chevron-forward" size={14} color={C.border} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Field components ───────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}{required && <Text style={{ color: C.error }}> *</Text>}</Text>
      {children}
    </View>
  );
}

function InputField({ value, onChange, placeholder, keyboard, multiline }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  keyboard?: any; multiline?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[f.input, focused && f.inputFocused, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      value={value} onChangeText={onChange} placeholder={placeholder ?? ''}
      placeholderTextColor={C.textGray} keyboardType={keyboard ?? 'default'}
      multiline={multiline} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}

function PickerField({ value, placeholder, onPress }: { value: string; placeholder: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={f.picker} onPress={onPress} activeOpacity={0.8}>
      <Text style={value ? f.pickerValue : f.pickerPlaceholder}>{value || placeholder}</Text>
      <Ionicons name="chevron-down" size={15} color={C.textGray} />
    </TouchableOpacity>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={f.sectionHeader}>
      <Ionicons name={icon as any} size={16} color={C.accent} />
      <Text style={f.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function AddPastorScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('new');
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Member search (Option B)
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Core fields
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [email,     setEmail]     = useState('');
  const [gender,    setGender]    = useState('');
  const [dob,       setDob]       = useState('');

  // Ministry fields
  const [role,          setRole]          = useState('');
  const [branchId,      setBranchId]      = useState('');
  const [branchLabel,   setBranchLabel]   = useState('');
  const [department,    setDepartment]    = useState('');
  const [position,      setPosition]      = useState('');
  const [ordinationDate,setOrdinationDate]= useState('');
  const [yearsMin,      setYearsMin]      = useState('');

  // Personal fields
  const [marital,  setMarital]  = useState('');
  const [address,  setAddress]  = useState('');
  const [city,     setCity]     = useState('');
  const [state,    setState]    = useState('');
  const [emergName,setEmergName]= useState('');
  const [emergPhone,setEmergPhone]=useState('');

  // Family fields
  const [spouseName, setSpouseName]   = useState('');
  const [numChildren,setNumChildren]  = useState('');

  // Biography fields
  const [bio,         setBio]         = useState('');
  const [seminary,    setSeminary]    = useState('');
  const [education,   setEducation]   = useState('');
  const [certifications,setCerts]     = useState('');
  const [specializations,setSpecs]    = useState('');

  // Pickers
  const [showGenderPicker,   setShowGenderPicker]   = useState(false);
  const [showMaritalPicker,  setShowMaritalPicker]  = useState(false);
  const [showRolePicker,     setShowRolePicker]     = useState(false);
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [showBranchPicker,   setShowBranchPicker]   = useState(false);

  useEffect(() => {
    api.get('/churches/branches').then((r) => setBranches(r.data ?? [])).catch(() => {});
  }, []);

  // Populate form from selected member (Option B)
  const populateFromMember = useCallback((m: Member) => {
    setSelectedMember(m);
    setFirstName(m.firstName);
    setLastName(m.lastName);
    setPhone(m.phone);
    setEmail(m.email ?? '');
    setDepartment(m.departmentName ?? '');
    const pp = m.customFields?.pastorProfile as Record<string, any> | undefined;
    if (pp?.biography)        setBio(pp.biography);
    if (pp?.seminary)         setSeminary(pp.seminary);
    if (pp?.educationalBackground) setEducation(pp.educationalBackground);
    if (pp?.yearsInMinistry)  setYearsMin(String(pp.yearsInMinistry));
    if (pp?.spouseName)       setSpouseName(pp.spouseName);
    if (pp?.numberOfChildren) setNumChildren(String(pp.numberOfChildren));
    setMemberSearch('');
    setMemberResults([]);
  }, []);

  const searchMembers = useCallback(async (q: string) => {
    if (q.length < 2) { setMemberResults([]); return; }
    setSearchingMembers(true);
    try {
      const res = await api.get('/members', { params: { search: q, limit: 20 } });
      setMemberResults(res.data ?? []);
    } catch { setMemberResults([]); }
    finally { setSearchingMembers(false); }
  }, []);

  const buildPayload = () => ({
    firstName: firstName.trim(),
    lastName:  lastName.trim(),
    phone:     phone.trim(),
    email:     email.trim() || undefined,
    gender:    GENDER_API[gender]   || undefined,
    dateOfBirth: dob || undefined,
    maritalStatus: MARITAL_API[marital] || undefined,
    status: 'pastor',
    membershipCategory: 'pastor_registration',
    churchRole: ROLE_API[role]      ?? undefined,
    pastoralPosition: POSITION_API[position] || undefined,
    departmentName: department.trim() || undefined,
    address:   address.trim()  || undefined,
    city:      city.trim()     || undefined,
    state:     state.trim()    || undefined,
    emergencyContactName:  emergName.trim()  || undefined,
    emergencyContactPhone: emergPhone.trim() || undefined,
    customFields: {
      pastorProfile: {
        ordinationDate:       ordinationDate || undefined,
        yearsInMinistry:      yearsMin ? parseInt(yearsMin, 10) : undefined,
        biography:            bio.trim()         || undefined,
        seminary:             seminary.trim()    || undefined,
        educationalBackground:education.trim()   || undefined,
        certifications:       certifications.trim() || undefined,
        specializations:      specializations.trim() || undefined,
        spouseName:           spouseName.trim()  || undefined,
        numberOfChildren:     numChildren ? parseInt(numChildren, 10) : undefined,
      },
    },
  });

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      Alert.alert('Required', 'First name, last name and phone are required.');
      return;
    }
    if (!role) {
      Alert.alert('Required', 'Please select a Pastoral Role before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();

      if (mode === 'existing' && selectedMember) {
        await api.patch(`/members/${selectedMember.id}`, payload);
      } else {
        await api.post('/members', payload);
      }

      // Assign to branch if selected
      if (branchId && mode === 'existing' && selectedMember) {
        await api.patch(`/churches/pastors/${selectedMember.id}/assign`, { branchId }).catch(() => {});
      }

      Alert.alert(
        'Pastor Registered',
        `${firstName} ${lastName} has been added to the clergy directory.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not save pastor.');
    } finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Register Pastor</Text>
            <Text style={s.headerSub}>Add to the clergy directory</Text>
          </View>
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={C.dark} size="small" /> : <Text style={s.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        {/* Mode toggle */}
        <View style={s.modeRow}>
          {(['new', 'existing'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.modeBtn, mode === m && s.modeBtnActive]}
              onPress={() => { setMode(m); setSelectedMember(null); }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={m === 'new' ? 'person-add-outline' : 'people-outline'}
                size={14}
                color={mode === m ? C.dark : 'rgba(255,255,255,0.6)'}
              />
              <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                {m === 'new' ? 'Create New Profile' : 'Select Existing Member'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── OPTION B: Member search ── */}
        {mode === 'existing' && (
          <View style={s.memberSearchCard}>
            <Text style={s.memberSearchTitle}>
              {selectedMember
                ? `Selected: ${selectedMember.firstName} ${selectedMember.lastName}`
                : 'Search existing church members'}
            </Text>

            {selectedMember ? (
              <View style={s.selectedMemberRow}>
                <View style={s.selectedMemberAvatar}>
                  <Text style={s.selectedMemberAvatarText}>
                    {initials(selectedMember.firstName, selectedMember.lastName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.selectedMemberName}>{selectedMember.firstName} {selectedMember.lastName}</Text>
                  <Text style={s.selectedMemberSub}>{selectedMember.phone} · {selectedMember.status}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMember(null)}>
                  <Ionicons name="close-circle" size={22} color={C.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.memberSearchBar}>
                  <Ionicons name="search" size={15} color={C.textGray} />
                  <TextInput
                    style={s.memberSearchInput}
                    value={memberSearch}
                    onChangeText={(t) => { setMemberSearch(t); searchMembers(t); }}
                    placeholder="Type name or phone..."
                    placeholderTextColor={C.textGray}
                  />
                  {searchingMembers && <ActivityIndicator size="small" color={C.accent} />}
                </View>
                {memberResults.length > 0 && (
                  <View style={s.memberResults}>
                    {memberResults.slice(0, 5).map((mb) => (
                      <TouchableOpacity
                        key={mb.id}
                        style={s.memberResultRow}
                        onPress={() => populateFromMember(mb)}
                        activeOpacity={0.8}
                      >
                        <View style={s.memberResultAvatar}>
                          <Text style={s.memberResultAvatarText}>{initials(mb.firstName, mb.lastName)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.memberResultName}>{mb.firstName} {mb.lastName}</Text>
                          <Text style={s.memberResultSub}>{mb.phone} · {mb.status.replace('_', ' ')}</Text>
                        </View>
                        <Ionicons name="add-circle" size={22} color={C.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ── SECTION 1: Basic Information ── */}
        <SectionHeader icon="person" title="Basic Information" />

        <View style={f.row}>
          <Field label="First Name" required>
            <InputField value={firstName} onChange={setFirstName} placeholder="e.g. Samuel" />
          </Field>
          <Field label="Last Name" required>
            <InputField value={lastName} onChange={setLastName} placeholder="e.g. Adeyemi" />
          </Field>
        </View>

        <Field label="Phone Number" required>
          <InputField value={phone} onChange={setPhone} placeholder="+234 800 000 0000" keyboard="phone-pad" />
        </Field>

        <Field label="Email Address">
          <InputField value={email} onChange={setEmail} placeholder="pastor@email.com" keyboard="email-address" />
        </Field>

        <View style={f.row}>
          <Field label="Gender">
            <PickerField value={gender} placeholder="Select gender" onPress={() => setShowGenderPicker(true)} />
          </Field>
          <Field label="Date of Birth">
            <InputField value={dob} onChange={setDob} placeholder="DD/MM/YYYY" />
          </Field>
        </View>

        <Field label="Marital Status">
          <PickerField value={marital} placeholder="Select status" onPress={() => setShowMaritalPicker(true)} />
        </Field>

        {/* ── SECTION 2: Ministry Information ── */}
        <SectionHeader icon="ribbon" title="Ministry Information" />

        <Field label="Pastoral Role">
          <PickerField value={role} placeholder="Select role" onPress={() => setShowRolePicker(true)} />
        </Field>

        <Field label="Pastoral Position">
          <PickerField value={position} placeholder="e.g. Youth Pastor" onPress={() => setShowPositionPicker(true)} />
        </Field>

        <Field label="Assigned Branch">
          <PickerField value={branchLabel} placeholder="Select branch" onPress={() => setShowBranchPicker(true)} />
        </Field>

        <Field label="Department / Ministry Unit">
          <InputField value={department} onChange={setDepartment} placeholder="e.g. Prayer Unit, Youth Ministry" />
        </Field>

        <View style={f.row}>
          <Field label="Ordination Date">
            <InputField value={ordinationDate} onChange={setOrdinationDate} placeholder="DD/MM/YYYY" />
          </Field>
          <Field label="Years in Ministry">
            <InputField value={yearsMin} onChange={setYearsMin} placeholder="e.g. 10" keyboard="numeric" />
          </Field>
        </View>

        {/* ── SECTION 3: Personal Details ── */}
        <SectionHeader icon="home" title="Personal Details" />

        <Field label="Residential Address">
          <InputField value={address} onChange={setAddress} placeholder="Street address" />
        </Field>

        <View style={f.row}>
          <Field label="City">
            <InputField value={city} onChange={setCity} placeholder="e.g. Lagos" />
          </Field>
          <Field label="State">
            <InputField value={state} onChange={setState} placeholder="e.g. Lagos State" />
          </Field>
        </View>

        <View style={f.row}>
          <Field label="Emergency Contact Name">
            <InputField value={emergName} onChange={setEmergName} placeholder="Full name" />
          </Field>
          <Field label="Emergency Contact Phone">
            <InputField value={emergPhone} onChange={setEmergPhone} placeholder="+234..." keyboard="phone-pad" />
          </Field>
        </View>

        {/* ── SECTION 4: Family Information ── */}
        <SectionHeader icon="people" title="Family Information" />

        <View style={f.row}>
          <Field label="Spouse Name">
            <InputField value={spouseName} onChange={setSpouseName} placeholder="Spouse full name" />
          </Field>
          <Field label="No. of Children">
            <InputField value={numChildren} onChange={setNumChildren} placeholder="0" keyboard="numeric" />
          </Field>
        </View>

        {/* ── SECTION 5: Biography & Education ── */}
        <SectionHeader icon="book" title="Biography & Education" />

        <Field label="Short Biography">
          <InputField value={bio} onChange={setBio} placeholder="Brief ministry journey and background..." multiline />
        </Field>

        <Field label="Seminary / Bible School">
          <InputField value={seminary} onChange={setSeminary} placeholder="e.g. Rhema Bible Training Centre" />
        </Field>

        <Field label="Educational Background">
          <InputField value={education} onChange={setEducation} placeholder="e.g. B.Sc Theology, University of Lagos" />
        </Field>

        <Field label="Certifications">
          <InputField value={certifications} onChange={setCerts} placeholder="e.g. Certified Marriage Counsellor" />
        </Field>

        <Field label="Areas of Specialization">
          <InputField value={specializations} onChange={setSpecs} placeholder="e.g. Youth Ministry, Evangelism" />
        </Field>

        {/* Save button */}
        <TouchableOpacity
          style={[s.bottomSaveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={C.dark} />
            : <>
                <Ionicons name="checkmark-circle" size={20} color={C.dark} />
                <Text style={s.bottomSaveBtnText}>
                  {mode === 'existing' && selectedMember ? 'UPDATE & PROMOTE PASTOR' : 'CREATE PASTOR PROFILE'}
                </Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Pickers */}
      <PickerModal visible={showGenderPicker}   title="Select Gender"           options={GENDERS}   onSelect={setGender}   onClose={() => setShowGenderPicker(false)} />
      <PickerModal visible={showMaritalPicker}  title="Marital Status"          options={MARITAL}   onSelect={setMarital}  onClose={() => setShowMaritalPicker(false)} />
      <PickerModal visible={showRolePicker}     title="Pastoral Role"           options={ROLES}     onSelect={setRole}     onClose={() => setShowRolePicker(false)} />
      <PickerModal visible={showPositionPicker} title="Pastoral Position"       options={POSITIONS} onSelect={setPosition} onClose={() => setShowPositionPicker(false)} />
      <PickerModal
        visible={showBranchPicker}
        title="Assign Branch"
        options={branches.map((b) => `${b.name}${b.city ? ' · ' + b.city : ''}`)}
        onSelect={(label) => {
          const br = branches.find((b) => label.startsWith(b.name));
          if (br) { setBranchId(br.id); setBranchLabel(label); }
        }}
        onClose={() => setShowBranchPicker(false)}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  saveBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: C.dark },
  modeRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  modeBtnActive: { backgroundColor: C.accent },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  modeBtnTextActive: { color: C.dark },
  memberSearchCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  memberSearchTitle: { fontSize: 13, fontWeight: '700', color: C.textDark, marginBottom: 10 },
  memberSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  memberSearchInput: { flex: 1, fontSize: 14, color: C.textDark },
  memberResults: { backgroundColor: C.bg, borderRadius: 10, overflow: 'hidden' },
  memberResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: C.white },
  memberResultAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  memberResultAvatarText: { fontSize: 12, fontWeight: '800', color: C.accent },
  memberResultName: { fontSize: 14, fontWeight: '700', color: C.textDark },
  memberResultSub: { fontSize: 11, color: C.textGray, marginTop: 1 },
  selectedMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#DCFCE7', borderRadius: 12, padding: 12 },
  selectedMemberAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  selectedMemberAvatarText: { fontSize: 14, fontWeight: '800', color: C.accent },
  selectedMemberName: { fontSize: 14, fontWeight: '700', color: '#166534' },
  selectedMemberSub: { fontSize: 11, color: '#166534', marginTop: 2 },
  bottomSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, marginTop: 24, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  bottomSaveBtnText: { fontSize: 15, fontWeight: '800', color: C.dark, letterSpacing: 0.5 },
});

const f = StyleSheet.create({
  wrap: { flex: 1, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontWeight: '700', color: C.textDark, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark },
  inputFocused: { borderColor: C.accent },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  pickerValue: { fontSize: 14, color: C.textDark, fontWeight: '600' },
  pickerPlaceholder: { fontSize: 14, color: C.textGray },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 4, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: C.accent },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: C.textDark },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '65%' },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: C.textDark, marginBottom: 12 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  sheetItemText: { fontSize: 15, color: C.textDark },
});
