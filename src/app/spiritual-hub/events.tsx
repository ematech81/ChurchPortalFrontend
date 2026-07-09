import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Switch,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

const C = {
  dark: '#120D2E', darkCard: '#1E1650', accent: '#F5C518',
  bg: '#F2F2F7', white: '#FFFFFF', textDark: '#120D2E',
  textGray: '#8888A0', border: '#E8E8EF', error: '#FF4C4C',
};

const EVENT_TYPES = [
  { key: 'kingdom_summit', label: 'Kingdom\nSummit',  icon: 'globe-outline'      },
  { key: 'prayer_session', label: 'Prayer\nSession',  icon: 'hand-left-outline'  },
  { key: 'leadership',     label: 'Leadership',        icon: 'briefcase-outline'  },
  { key: 'youth_night',    label: 'Youth Night',       icon: 'moon-outline'       },
  { key: 'outreach',       label: 'Outreach',          icon: 'heart-outline'      },
];

const TYPE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  kingdom_summit: { label: 'KINGDOM SUMMIT', bg: C.darkCard,              text: C.accent },
  prayer_session: { label: 'PRAYER',         bg: 'rgba(18,13,46,0.08)',   text: C.dark   },
  leadership:     { label: 'GROWTH TRACK',   bg: '#EDE9FE',               text: '#5B21B6'},
  youth_night:    { label: 'COMMUNITY',      bg: '#DCFCE7',               text: '#166534'},
  outreach:       { label: 'OUTREACH',       bg: '#FEF9C3',               text: '#92400E'},
};

// ── Sub-tabs ──────────────────────────────────────────────────────────────────
function SubTabs({ active, onChange }: { active: string; onChange: (t: string) => void }) {
  const tabs = ['Directory', 'Create Event', 'Special Programs'];
  return (
    <View style={tb.bar}>
      {tabs.map((t) => (
        <TouchableOpacity key={t} style={tb.tab} onPress={() => onChange(t)} activeOpacity={0.8}>
          <Text style={[tb.label, active === t && tb.labelActive]}>{t}</Text>
          {active === t && <View style={tb.underline} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}
const tb = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  label: { fontSize: 11, fontWeight: '600', color: C.textGray },
  labelActive: { color: C.dark, fontWeight: '800' },
  underline: { position: 'absolute', bottom: 0, left: 4, right: 4, height: 2.5, backgroundColor: C.accent, borderRadius: 2 },
});

// ── Featured event card ───────────────────────────────────────────────────────
function FeaturedCard({ event }: { event: any }) {
  return (
    <View style={fe.card}>
      <View style={fe.badge}><Text style={fe.badgeText}>FEATURED PROGRAM</Text></View>
      <Text style={fe.title}>{event.name?.toUpperCase()}</Text>
      <View style={fe.metaRow}>
        <Ionicons name="calendar-outline" size={13} color={C.white} />
        <Text style={fe.meta}>{event.eventDate ?? event.day ?? '—'}</Text>
      </View>
      {event.time && (
        <View style={fe.metaRow}>
          <Ionicons name="time-outline" size={13} color={C.white} />
          <Text style={fe.meta}>{event.time}{event.endTime ? ` – ${event.endTime}` : ''}</Text>
        </View>
      )}
      {event.location && (
        <View style={fe.metaRow}>
          <Ionicons name="location-outline" size={13} color={C.white} />
          <Text style={fe.meta}>{event.location}</Text>
        </View>
      )}
      <TouchableOpacity style={fe.btn} activeOpacity={0.85}>
        <Text style={fe.btnText}>REGISTER NOW</Text>
      </TouchableOpacity>
    </View>
  );
}
const fe = StyleSheet.create({
  card: { backgroundColor: C.darkCard, borderRadius: 20, padding: 22, marginBottom: 16 },
  badge: {
    alignSelf: 'flex-start', backgroundColor: C.accent, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: C.dark, letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: '900', color: C.white, lineHeight: 34, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  meta: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  btn: {
    backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  btnText: { fontSize: 14, fontWeight: '800', color: C.dark, letterSpacing: 0.8 },
});

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event }: { event: any }) {
  const typeKey = event.eventType ?? 'kingdom_summit';
  const badge = TYPE_BADGE[typeKey] ?? TYPE_BADGE.kingdom_summit;

  return (
    <View style={ec.card}>
      <View style={[ec.badge, { backgroundColor: badge.bg }]}>
        <Text style={[ec.badgeText, { color: badge.text }]}>{badge.label}</Text>
      </View>
      <Text style={ec.title}>{event.name}</Text>
      <View style={ec.metaGrid}>
        <View style={ec.metaCol}>
          <Text style={ec.metaKey}>DATE</Text>
          <Text style={ec.metaVal}>{event.eventDate ?? event.day ?? '—'}</Text>
        </View>
        {event.time && (
          <View style={ec.metaCol}>
            <Text style={ec.metaKey}>TIME</Text>
            <Text style={ec.metaVal}>{event.time}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={ec.btn} activeOpacity={0.85}>
        <Text style={ec.btnText}>REGISTER</Text>
      </TouchableOpacity>
    </View>
  );
}
const ec = StyleSheet.create({
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 18, fontWeight: '800', color: C.textDark, marginBottom: 12, lineHeight: 24 },
  metaGrid: { flexDirection: 'row', gap: 24, marginBottom: 14 },
  metaCol: { gap: 2 },
  metaKey: { fontSize: 9, fontWeight: '800', color: C.textGray, letterSpacing: 0.8 },
  metaVal: { fontSize: 14, fontWeight: '700', color: C.textDark },
  btn: { backgroundColor: C.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { fontSize: 13, fontWeight: '800', color: C.dark, letterSpacing: 0.8 },
});

// ── Directory tab ─────────────────────────────────────────────────────────────
function DirectoryTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    api.get('/service-events').then((r) => setEvents(r.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []));

  const featured = events[0];
  const rest = events.slice(1);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!events.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
        <Ionicons name="calendar-outline" size={56} color={C.border} />
        <Text style={{ fontSize: 17, fontWeight: '800', color: C.textDark, textAlign: 'center' }}>No upcoming events</Text>
        <Text style={{ fontSize: 13, color: C.textGray, textAlign: 'center' }}>
          Events created by your church will appear here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {featured && <FeaturedCard event={featured} />}
      {rest.map((e) => <EventCard key={e.id} event={e} />)}
    </ScrollView>
  );
}

// ── Create Event form ─────────────────────────────────────────────────────────
function CreateEventTab() {
  const user = useAuthStore((s) => s.user);
  const [eventType, setEventType]     = useState('');
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate]               = useState('');
  const [time, setTime]               = useState('');
  const [locationMode, setLocationMode] = useState<'physical' | 'online'>('physical');
  const [location, setLocation]       = useState('');
  const [isPaid, setIsPaid]           = useState(false);
  const [fee, setFee]                 = useState('');
  const [capacity, setCapacity]       = useState('');
  const [saving, setSaving]           = useState(false);

  const handlePublish = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter an event title.'); return; }
    setSaving(true);
    try {
      await api.post('/service-events', {
        name: title.trim(),
        eventType,
        time,
        endTime: null,
        location: location.trim() || null,
        format: locationMode,
        kind: 'custom',
        eventDate: date.trim() || null,
      });
      Alert.alert('Published!', `"${title}" has been created.`);
      setTitle(''); setDescription(''); setDate(''); setTime(''); setLocation('');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not create event.');
    } finally { setSaving(false); }
  };

  const Section = ({ num, label }: { num: string; label: string }) => (
    <View style={cr.sectionHeader}>
      <View style={cr.sectionNum}><Text style={cr.sectionNumText}>{num}</Text></View>
      <Text style={cr.sectionLabel}>{label}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1 — Event Type */}
        <Section num="1" label="EVENT TYPE SELECTION" />
        <View style={cr.typeGrid}>
          {EVENT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[cr.typeCard, eventType === t.key && cr.typeCardActive]}
              onPress={() => setEventType(t.key)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={t.icon as any}
                size={22}
                color={eventType === t.key ? C.dark : C.white}
              />
              <Text style={[cr.typeLabel, eventType === t.key && cr.typeLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2 — Event Details */}
        <Section num="2" label="EVENT DETAILS" />
        <Text style={cr.fieldLabel}>EVENT TITLE</Text>
        <TextInput
          style={cr.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter a powerful title..."
          placeholderTextColor={C.textGray}
        />
        <Text style={cr.fieldLabel}>DESCRIPTION</Text>
        <TextInput
          style={[cr.input, { height: 88, textAlignVertical: 'top' }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the vision for this event..."
          placeholderTextColor={C.textGray}
          multiline
        />
        <Text style={cr.fieldLabel}>DATE</Text>
        <TextInput
          style={cr.input}
          value={date}
          onChangeText={setDate}
          placeholder="mm/dd/yyyy"
          placeholderTextColor={C.textGray}
          keyboardType="numeric"
        />
        <Text style={cr.fieldLabel}>TIME</Text>
        <TextInput
          style={cr.input}
          value={time}
          onChangeText={setTime}
          placeholder="e.g. 09:00 AM"
          placeholderTextColor={C.textGray}
        />

        {/* 3 — Event Flyer */}
        <Section num="3" label="EVENT FLYER" />
        <TouchableOpacity style={cr.uploadZone} activeOpacity={0.8}>
          <Ionicons name="image-outline" size={32} color={C.textGray} />
          <Text style={cr.uploadLabel}>UPLOAD FLYER</Text>
          <Text style={cr.uploadSub}>PNG or JPG up to 10MB</Text>
        </TouchableOpacity>

        {/* 4 — Promotional Video */}
        <Section num="4" label="PROMOTIONAL VIDEO" />
        <TouchableOpacity style={cr.uploadZone} activeOpacity={0.8}>
          <Ionicons name="videocam-outline" size={32} color={C.textGray} />
          <Text style={cr.uploadLabel}>UPLOAD VIDEO</Text>
          <Text style={cr.uploadSub}>MP4 up to 50MB</Text>
        </TouchableOpacity>

        {/* 5 — Location */}
        <Section num="5" label="LOCATION / PLATFORM" />
        <View style={cr.toggleRow}>
          {(['physical', 'online'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[cr.toggleBtn, locationMode === mode && cr.toggleBtnActive]}
              onPress={() => setLocationMode(mode)}
              activeOpacity={0.85}
            >
              <Text style={[cr.toggleText, locationMode === mode && cr.toggleTextActive]}>
                {mode === 'physical' ? 'PHYSICAL VENUE' : 'ONLINE MEETING'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={cr.locationInput}>
          <Ionicons name="location-outline" size={16} color={C.textGray} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: C.textDark }}
            value={location}
            onChangeText={setLocation}
            placeholder={locationMode === 'physical' ? 'Search address or enter venue' : 'Paste meeting link'}
            placeholderTextColor={C.textGray}
            autoCorrect={false}
          />
        </View>

        {/* 6 — Registration */}
        <Section num="6" label="REGISTRATION SETTINGS" />
        <View style={cr.switchRow}>
          <View>
            <Text style={cr.switchLabel}>PAID EVENT</Text>
            <Text style={cr.switchSub}>Toggle for fee</Text>
          </View>
          <Switch
            value={isPaid}
            onValueChange={setIsPaid}
            trackColor={{ false: C.border, true: C.accent }}
            thumbColor={C.white}
          />
        </View>
        {isPaid && (
          <>
            <Text style={cr.fieldLabel}>FEE AMOUNT (₦)</Text>
            <TextInput
              style={cr.input}
              value={fee}
              onChangeText={setFee}
              placeholder="0.00"
              placeholderTextColor={C.textGray}
              keyboardType="decimal-pad"
            />
          </>
        )}
        <Text style={cr.fieldLabel}>CAPACITY LIMIT</Text>
        <TextInput
          style={cr.input}
          value={capacity}
          onChangeText={setCapacity}
          placeholder="No limit"
          placeholderTextColor={C.textGray}
          keyboardType="number-pad"
        />
      </ScrollView>

      {/* CTA */}
      <View style={cr.cta}>
        <TouchableOpacity style={cr.draftBtn} activeOpacity={0.8}>
          <Text style={cr.draftText}>SAVE DRAFT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cr.publishBtn, saving && { opacity: 0.7 }]}
          onPress={handlePublish}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color={C.dark} /> : <Text style={cr.publishText}>PUBLISH EVENT</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const cr = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 8 },
  sectionNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionNumText: { fontSize: 12, fontWeight: '900', color: C.dark },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: C.textDark, letterSpacing: 0.3 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeCard: {
    width: '47%', backgroundColor: C.darkCard, borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 8, borderWidth: 2, borderColor: 'transparent',
  },
  typeCardActive: { backgroundColor: C.accent, borderColor: C.accent },
  typeLabel: { fontSize: 12, fontWeight: '700', color: C.white, textAlign: 'center', lineHeight: 16 },
  typeLabelActive: { color: C.dark },

  fieldLabel: { fontSize: 10, fontWeight: '800', color: C.textGray, letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.textDark, marginBottom: 14,
  },
  uploadZone: {
    borderWidth: 2, borderColor: C.border, borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 28,
    alignItems: 'center', gap: 6, marginBottom: 20,
  },
  uploadLabel: { fontSize: 12, fontWeight: '800', color: C.textGray, letterSpacing: 0.5 },
  uploadSub: { fontSize: 11, color: C.textGray },

  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
  },
  toggleBtnActive: { backgroundColor: C.dark, borderColor: C.dark },
  toggleText: { fontSize: 11, fontWeight: '700', color: C.textGray },
  toggleTextActive: { color: C.accent },

  locationInput: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
  },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 14,
  },
  switchLabel: { fontSize: 12, fontWeight: '800', color: C.textDark },
  switchSub: { fontSize: 11, color: C.textGray, marginTop: 2 },

  cta: {
    backgroundColor: C.white, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20,
    borderTopWidth: 1, borderTopColor: C.border, gap: 10,
  },
  draftBtn: {
    backgroundColor: C.bg, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: C.border,
  },
  draftText: { fontSize: 14, fontWeight: '800', color: C.textDark, letterSpacing: 0.8 },
  publishBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  publishText: { fontSize: 14, fontWeight: '800', color: C.dark, letterSpacing: 0.8 },
});

// ── Special Programs placeholder ──────────────────────────────────────────────
function SpecialProgramsTab() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 36 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.darkCard, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="star-outline" size={34} color={C.accent} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '900', color: C.textDark, textAlign: 'center' }}>Special Programs</Text>
      <Text style={{ fontSize: 13, color: C.textGray, textAlign: 'center', lineHeight: 20 }}>
        Annual conferences, kingdom summits, and special gatherings will be listed here.
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Directory');

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Upcoming Events</Text>
          <View style={{ width: 34 }} />
        </View>
        <Text style={s.headerSub}>
          Connect with our community through transformative experiences,
          spiritual workshops, and kingdom conferences.
        </Text>
      </SafeAreaView>

      <SubTabs active={activeTab} onChange={setActiveTab} />

      <View style={{ flex: 1, backgroundColor: activeTab === 'Create Event' ? C.bg : C.bg }}>
        {activeTab === 'Directory'       && <DirectoryTab />}
        {activeTab === 'Create Event'    && <CreateEventTab />}
        {activeTab === 'Special Programs'&& <SpecialProgramsTab />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  headerBtn: { padding: 4, width: 34 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17,
    paddingHorizontal: 20, paddingBottom: 14,
  },
});
