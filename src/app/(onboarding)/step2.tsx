import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';
import { useAuthStore } from '../../stores/auth.store';

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MEDIUMS = [
  'Main Sanctuary',
  'Live Stream / Online',
  'Chapel',
  'Auditorium',
  'Youth Hall',
  'Open Field',
  'Add Custom...',
];

const EVENT_TYPES = [
  'Youth Camp',
  'Crusade',
  'Outdoor Fellowship',
  'Conference',
  'Special Program',
  'Revival Meeting',
  'All-Night Vigil',
  'Prayer Meeting',
  'Thanksgiving Service',
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Service = {
  id: string;
  name: string;
  day: string;
  time: string;
  endTime?: string;
  location: string;
  format: 'in-person' | 'online';
  kind: 'regular' | 'custom';
  eventType?: string;
};

// ─── Initial mock data ────────────────────────────────────────────────────────

const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'Sunday Morning Service',  day: 'Sundays',    time: '09:00 AM', location: 'Main Sanctuary',    format: 'in-person', kind: 'regular' },
  { id: '2', name: 'Contemporary Worship',    day: 'Sundays',    time: '11:30 AM', location: 'Live Stream / Online', format: 'online',    kind: 'regular' },
  { id: '3', name: 'Midweek Bible Study',     day: 'Wednesdays', time: '07:00 PM', location: 'Room 201',           format: 'in-person', kind: 'regular' },
];

// ─── Picker Modal ─────────────────────────────────────────────────────────────

function PickerModal({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title?: string; options: string[]; selected: string;
  onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          {title && <Text style={s.sheetTitle}>{title}</Text>}
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

// ─── Custom Slot Modal ────────────────────────────────────────────────────────

function CustomSlotModal({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (event: Service) => void;
}) {
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const reset = () => {
    setName(''); setEventType(''); setDate('');
    setStartTime(''); setEndTime(''); setVenue('');
  };

  const handleAdd = () => {
    if (!name.trim() || !date.trim()) return;
    onAdd({
      id: Date.now().toString(),
      name,
      day: date,
      time: startTime || '--:--',
      endTime: endTime || undefined,
      location: venue || 'TBD',
      format: 'in-person',
      kind: 'custom',
      eventType,
    });
    reset();
    onClose();
  };

  const fi = (f: string) => [s.input, focused === f && s.inputFocused] as any;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end', flex: 1 }}>
          <View style={s.customSheet}>
            <View style={s.sheetHandle} />

            <View style={s.customSheetHeader}>
              <View>
                <Text style={s.customSheetTitle}>Add Custom Service Slot</Text>
                <Text style={s.customSheetSub}>Special events, camps & programmes</Text>
              </View>
              <TouchableOpacity onPress={() => { reset(); onClose(); }} style={s.closeBtn}>
                <Ionicons name="close" size={20} color={C.textGray} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Event Name */}
              <Text style={s.label}>Event Name <Text style={s.required}>*</Text></Text>
              <TextInput
                style={fi('name')}
                placeholder="e.g. Annual Youth Camp 2026"
                placeholderTextColor={C.textGray}
                value={name} onChangeText={setName}
                onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
              />

              {/* Event Type */}
              <Text style={s.label}>Event Type <Text style={s.required}>*</Text></Text>
              <TouchableOpacity
                style={[s.pickerBtn, !eventType && { borderColor: C.border }]}
                onPress={() => setShowTypePicker(true)}
              >
                <Text style={eventType ? s.pickerText : s.pickerPlaceholder}>
                  {eventType || 'Select event type'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={C.textGray} />
              </TouchableOpacity>

              {/* Date */}
              <Text style={s.label}>Date <Text style={s.required}>*</Text></Text>
              <View style={[s.timeInput, focused === 'date' && s.inputFocused]}>
                <Ionicons name="calendar-outline" size={16} color={C.textGray} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: C.textDark }}
                  placeholder="DD / MM / YYYY"
                  placeholderTextColor={C.textGray}
                  value={date} onChangeText={setDate}
                  onFocus={() => setFocused('date')} onBlur={() => setFocused(null)}
                />
              </View>

              {/* Start & End Time */}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Start Time</Text>
                  <View style={[s.timeInput, focused === 'start' && s.inputFocused]}>
                    <TextInput
                      style={{ flex: 1, fontSize: 14, color: C.textDark }}
                      placeholder="09:00 AM"
                      placeholderTextColor={C.textGray}
                      value={startTime} onChangeText={setStartTime}
                      onFocus={() => setFocused('start')} onBlur={() => setFocused(null)}
                    />
                    <Ionicons name="time-outline" size={15} color={C.textGray} />
                  </View>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>End Time <Text style={s.optional}>(opt.)</Text></Text>
                  <View style={[s.timeInput, focused === 'end' && s.inputFocused]}>
                    <TextInput
                      style={{ flex: 1, fontSize: 14, color: C.textDark }}
                      placeholder="05:00 PM"
                      placeholderTextColor={C.textGray}
                      value={endTime} onChangeText={setEndTime}
                      onFocus={() => setFocused('end')} onBlur={() => setFocused(null)}
                    />
                    <Ionicons name="time-outline" size={15} color={C.textGray} />
                  </View>
                </View>
              </View>

              {/* Venue */}
              <Text style={s.label}>Location / Venue</Text>
              <View style={[s.timeInput, focused === 'venue' && s.inputFocused]}>
                <Ionicons name="location-outline" size={16} color={C.textGray} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: C.textDark }}
                  placeholder="e.g. Church Premises, City Stadium"
                  placeholderTextColor={C.textGray}
                  value={venue} onChangeText={setVenue}
                  onFocus={() => setFocused('venue')} onBlur={() => setFocused(null)}
                />
              </View>

              <TouchableOpacity
                style={[s.addBtn, { marginTop: 20, marginBottom: 8 }, (!name.trim() || !date.trim()) && { opacity: 0.5 }]}
                onPress={handleAdd}
                disabled={!name.trim() || !date.trim()}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-number-outline" size={18} color={C.dark} />
                <Text style={s.addBtnText}>ADD TO SCHEDULE</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      <PickerModal
        visible={showTypePicker}
        title="Select Event Type"
        options={EVENT_TYPES}
        selected={eventType}
        onSelect={setEventType}
        onClose={() => setShowTypePicker(false)}
      />
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Step2Screen() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setOnboardingDone = useAuthStore((s) => s.setOnboardingDone);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState('');

  // Regular service form
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [serviceName, setServiceName] = useState('');
  const [day, setDay] = useState('Sunday');
  const [time, setTime] = useState('');
  const [medium, setMedium] = useState('Main Sanctuary');
  const [customMedium, setCustomMedium] = useState('');
  const [showCustomMediumInput, setShowCustomMediumInput] = useState(false);

  // Pickers
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showMediumPicker, setShowMediumPicker] = useState(false);
  const [showCustomSlot, setShowCustomSlot] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const effectiveMedium = medium === 'Add Custom...' ? customMedium : medium;
  const derivedFormat = effectiveMedium.toLowerCase().includes('stream') || effectiveMedium.toLowerCase().includes('online')
    ? 'online' : 'in-person';

  const handleMediumSelect = (v: string) => {
    setMedium(v);
    if (v === 'Add Custom...') setShowCustomMediumInput(true);
    else setShowCustomMediumInput(false);
  };

  const addService = () => {
    if (!serviceName.trim()) return;
    setServices((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: serviceName,
        day: `${day}s`,
        time: time || '--:-- --',
        location: effectiveMedium || 'TBD',
        format: derivedFormat,
        kind: 'regular',
      },
    ]);
    setServiceName('');
    setTime('');
  };

  const removeService = (id: string) => setServices((prev) => prev.filter((svc) => svc.id !== id));

  const handleFinish = async () => {
    setFinishing(true);
    setFinishError('');
    try {
      await api.post('/service-events', {
        services: services.map((svc) => ({
          name: svc.name,
          day: svc.day,
          time: svc.time,
          endTime: svc.endTime,
          location: svc.location,
          format: svc.format,
          kind: svc.kind,
          eventType: svc.eventType,
          eventDate: svc.kind === 'custom' ? svc.day : undefined,
        })),
      });
      // Navigate to step3 (Branch Setup) — setOnboardingDone is called there
      router.push('/(onboarding)/step3');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setFinishError(Array.isArray(msg) ? msg[0] : (msg ?? 'Failed to save service schedule. Please try again.'));
    } finally {
      setFinishing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Kingdom Portal</Text>
          <View style={s.avatar}>
            <Ionicons name="person" size={16} color={C.white} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        {/* Badge + Heading */}
        <View style={s.badgeRow}>
          <View style={s.badge}><Text style={s.badgeText}>Step 2 of 2</Text></View>
          <Text style={s.badgeSub}>  ONBOARDING</Text>
        </View>
        <Text style={s.heading}>Configure Your{'\n'}Services</Text>
        <Text style={s.subheading}>
          Define when and how your community gathers. Add regular Sunday worship, midweek studies, or youth gatherings.
        </Text>

        {/* ── Add Service Card ── */}
        <View style={s.card}>
          <View style={s.addServiceHeader}>
            <Ionicons name="add-circle-outline" size={20} color={C.textDark} />
            <Text style={s.addServiceTitle}>Add Service Type</Text>
          </View>

          <Text style={s.label}>Service Name</Text>
          <TextInput
            style={[s.input, focused === 'name' && s.inputFocused]}
            placeholder="e.g. Sunday Morning Worship"
            placeholderTextColor={C.textGray}
            value={serviceName}
            onChangeText={setServiceName}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
          />

          {/* Day + Time */}
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Day of Week</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setShowDayPicker(true)}>
                <Text style={s.pickerText}>{day}</Text>
                <Ionicons name="chevron-down" size={14} color={C.textGray} />
              </TouchableOpacity>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Start Time</Text>
              <View style={[s.timeInput, focused === 'time' && s.inputFocused]}>
                <TextInput
                  style={{ flex: 1, fontSize: 14, color: C.textDark }}
                  placeholder="09:00 AM"
                  placeholderTextColor={C.textGray}
                  value={time}
                  onChangeText={setTime}
                  onFocus={() => setFocused('time')}
                  onBlur={() => setFocused(null)}
                />
                <Ionicons name="time-outline" size={16} color={C.textGray} />
              </View>
            </View>
          </View>

          {/* Service Medium */}
          <Text style={s.label}>Service Medium</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowMediumPicker(true)}>
            <Text style={effectiveMedium ? s.pickerText : s.pickerPlaceholder}>
              {medium === 'Add Custom...' ? (customMedium || 'Enter custom medium...') : medium}
            </Text>
            <Ionicons name="chevron-down" size={14} color={C.textGray} />
          </TouchableOpacity>

          {/* Custom medium text input */}
          {showCustomMediumInput && (
            <TextInput
              style={[s.input, { marginTop: 8 }, focused === 'customMedium' && s.inputFocused]}
              placeholder="Type custom medium (e.g. School Hall, Tent)"
              placeholderTextColor={C.textGray}
              value={customMedium}
              onChangeText={setCustomMedium}
              onFocus={() => setFocused('customMedium')}
              onBlur={() => setFocused(null)}
              autoFocus
            />
          )}

          <TouchableOpacity style={s.addBtn} onPress={addService} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={18} color={C.dark} />
            <Text style={s.addBtnText}>ADD TO SCHEDULE</Text>
          </TouchableOpacity>
        </View>

        {/* Quote Banner */}
        <View style={s.quoteBanner}>
          <View style={s.quoteAccent} />
          <Text style={s.quoteText}>
            "Gathering together is the heart of our community."
          </Text>
        </View>

        {/* ── Active Schedule ── */}
        <View style={s.scheduleCard}>
          <View style={s.scheduleHeader}>
            <Text style={s.scheduleTitle}>Active Schedule</Text>
            <View style={s.scheduleBadge}>
              <Text style={s.scheduleBadgeText}>{services.length} SERVICES ADDED</Text>
            </View>
          </View>

          {services.map((svc) => (
            <View key={svc.id} style={s.serviceItem}>
              <View style={s.serviceIcon}>
                <Ionicons
                  name={
                    svc.kind === 'custom' ? 'star' :
                    svc.format === 'online' ? 'wifi' : 'business'
                  }
                  size={18}
                  color={C.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={s.serviceName}>{svc.name}</Text>
                  {svc.kind === 'custom' && (
                    <View style={s.eventTag}>
                      <Text style={s.eventTagText}>EVENT</Text>
                    </View>
                  )}
                </View>
                <View style={s.serviceMeta}>
                  <Ionicons name={svc.kind === 'custom' ? 'today-outline' : 'calendar-outline'} size={11} color={C.textGray} />
                  <Text style={s.serviceMetaText}>{svc.day}</Text>
                  <Ionicons name="time-outline" size={11} color={C.textGray} />
                  <Text style={s.serviceMetaText}>
                    {svc.time}{svc.endTime ? ` – ${svc.endTime}` : ''}
                  </Text>
                  <Ionicons name="location-outline" size={11} color={C.accent} />
                  <Text style={[s.serviceMetaText, { color: C.accent }]} numberOfLines={1}>{svc.location}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeService(svc.id)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#555" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Custom Slot Button */}
          <TouchableOpacity style={s.customSlot} onPress={() => setShowCustomSlot(true)} activeOpacity={0.75}>
            <View style={s.customSlotIcon}>
              <Ionicons name="add-circle-outline" size={22} color={C.accent} />
            </View>
            <Text style={s.customSlotText}>Need specialized youth or children's ministry slots?</Text>
            <Text style={s.customSlotLink}>ADD CUSTOM SERVICE SLOT</Text>
          </TouchableOpacity>
        </View>

        {/* Finish error */}
        {finishError ? (
          <View style={s.finishError}>
            <Ionicons name="alert-circle-outline" size={15} color={C.error} />
            <Text style={s.finishErrorText}>{finishError}</Text>
          </View>
        ) : null}

        {/* Next: Branch Setup */}
        <TouchableOpacity
          style={[s.finishBtn, finishing && { opacity: 0.7 }]}
          onPress={handleFinish}
          disabled={finishing}
          activeOpacity={0.85}
        >
          {finishing ? (
            <ActivityIndicator color={C.dark} />
          ) : (
            <>
              <Text style={s.finishBtnText}>NEXT: BRANCH SETUP</Text>
              <Ionicons name="arrow-forward" size={20} color={C.dark} />
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Pickers */}
      <PickerModal
        visible={showDayPicker}
        title="Day of Week"
        options={DAYS}
        selected={day}
        onSelect={setDay}
        onClose={() => setShowDayPicker(false)}
      />
      <PickerModal
        visible={showMediumPicker}
        title="Service Medium"
        options={MEDIUMS}
        selected={medium}
        onSelect={handleMediumSelect}
        onClose={() => setShowMediumPicker(false)}
      />

      {/* Custom Slot Modal */}
      <CustomSlotModal
        visible={showCustomSlot}
        onClose={() => setShowCustomSlot(false)}
        onAdd={(event) => setServices((prev) => [...prev, event])}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: C.accent },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.darkCard, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  badge: { backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: '800', color: C.dark },
  badgeSub: { fontSize: 12, fontWeight: '700', color: C.textGray, letterSpacing: 1 },
  heading: { fontSize: 28, fontWeight: '800', color: C.textDark, lineHeight: 36, marginBottom: 10 },
  subheading: { fontSize: 14, color: C.textGray, lineHeight: 22, marginBottom: 20 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  addServiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  addServiceTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  label: { fontSize: 12, fontWeight: '600', color: C.textDark, marginBottom: 6, marginTop: 14 },
  required: { color: C.error },
  optional: { fontSize: 11, color: C.textGray, fontWeight: '400' },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark },
  inputFocused: { borderColor: C.accent },
  row: { flexDirection: 'row', marginTop: 4 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13 },
  pickerText: { fontSize: 14, color: C.textDark },
  pickerPlaceholder: { fontSize: 14, color: C.textGray },
  timeInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, marginTop: 18, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  addBtnText: { fontSize: 14, fontWeight: '800', color: C.dark, letterSpacing: 0.5 },
  quoteBanner: { backgroundColor: C.darkCard, borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  quoteAccent: { width: 4, height: '100%', backgroundColor: C.accent, borderRadius: 2, minHeight: 40 },
  quoteText: { flex: 1, fontSize: 15, fontStyle: 'italic', color: C.white, lineHeight: 24 },
  // Active Schedule (unchanged UI)
  scheduleCard: { backgroundColor: C.dark, borderRadius: 18, padding: 20, marginBottom: 16 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  scheduleTitle: { fontSize: 16, fontWeight: '700', color: C.white },
  scheduleBadge: { backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  scheduleBadgeText: { fontSize: 10, fontWeight: '800', color: C.dark },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  serviceIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.darkCard, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 14, fontWeight: '700', color: C.white },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  serviceMetaText: { fontSize: 11, color: C.textGray, marginRight: 4 },
  eventTag: { backgroundColor: 'rgba(245,197,24,0.2)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  eventTagText: { fontSize: 9, fontWeight: '800', color: C.accent },
  customSlot: { alignItems: 'center', paddingTop: 20, gap: 6 },
  customSlotIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(245,197,24,0.1)', alignItems: 'center', justifyContent: 'center' },
  customSlotText: { fontSize: 12, color: C.textGray, textAlign: 'center' },
  customSlotLink: { fontSize: 12, fontWeight: '800', color: C.accent, letterSpacing: 0.5 },
  // Error
  finishError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  finishErrorText: { fontSize: 13, color: C.error, flex: 1 },
  // Buttons
  finishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, marginBottom: 12, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  finishBtnText: { fontSize: 15, fontWeight: '800', color: C.dark, letterSpacing: 1 },
  // Picker sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '65%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 8 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetItemActive: { backgroundColor: C.accentFaint, marginHorizontal: -20, paddingHorizontal: 20 },
  sheetItemText: { fontSize: 15, color: C.textDark },
  sheetItemTextActive: { fontWeight: '700', color: C.accent },
  // Custom slot sheet
  customSheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '88%' },
  customSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  customSheetTitle: { fontSize: 17, fontWeight: '800', color: C.textDark },
  customSheetSub: { fontSize: 12, color: C.textGray, marginTop: 2 },
  closeBtn: { padding: 4 },
});
