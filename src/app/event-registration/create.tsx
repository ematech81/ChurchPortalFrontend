import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Switch,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';
import DateTimeField from '../../components/DateTimeField';
import { CHOICE_TYPES, EventSummary, FIELD_TYPE_LABELS, FieldType } from '../../types/event-registration';

interface DraftField {
  key: string;          // local only
  id?: string;          // server id — kept when editing so earlier answers stay attached
  type: FieldType;
  label: string;
  required: boolean;
  optionsText: string;  // one option per line (or comma separated)
}

let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const blank = (type: FieldType, label = '', required = false): DraftField => ({ key: newKey(), type, label, required, optionsText: '' });

/** Sensible starting questions; full name and phone are always asked, so they are not listed. */
const starter = (): DraftField[] => [
  blank('short_text', 'Church / Branch', true),
  { ...blank('dropdown', 'Gender', true), optionsText: 'Male\nFemale' },
  blank('email', 'Email address'),
];

const parseOptions = (t: string) => [...new Set(t.split(/[\n,]/).map((o) => o.trim()).filter(Boolean))];

/** Create or edit an event and its registration form (pass ?id= to edit). */
export default function CreateEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [closesAt, setClosesAt] = useState<Date | null>(null);
  const [capacity, setCapacity] = useState('');
  const [uniquePhone, setUniquePhone] = useState(true);
  const [confirmation, setConfirmation] = useState('');
  const [fields, setFields] = useState<DraftField[]>(editing ? [] : starter());
  const [hasAnswers, setHasAnswers] = useState(false);
  const [showTypes, setShowTypes] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<EventSummary>(`/event-forms/${id}`)
      .then(({ data: ev }) => {
        setTitle(ev.title);
        setDescription(ev.description ?? '');
        setVenue(ev.venue ?? '');
        setStartsAt(ev.startsAt ? new Date(ev.startsAt) : null);
        setClosesAt(ev.registrationClosesAt ? new Date(ev.registrationClosesAt) : null);
        setCapacity(ev.capacity ? String(ev.capacity) : '');
        setUniquePhone(ev.uniquePhone);
        setConfirmation(ev.confirmationMessage ?? '');
        setHasAnswers(ev.registrationCount > 0);
        setFields(ev.fields.map((f) => ({
          key: newKey(), id: f.id, type: f.type, label: f.label, required: f.required, optionsText: (f.options ?? []).join('\n'),
        })));
      })
      .catch((e) => {
        Alert.alert('Could not load', e?.response?.data?.message ?? 'Please try again.');
        router.back();
      })
      .finally(() => setLoading(false));
  }, [id]);

  const update = (key: string, patch: Partial<DraftField>) =>
    setFields((fs) => fs.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  const move = (key: string, dir: -1 | 1) =>
    setFields((fs) => {
      const i = fs.findIndex((f) => f.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= fs.length) return fs;
      const copy = [...fs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const remove = (key: string) => setFields((fs) => fs.filter((f) => f.key !== key));

  const validate = (): string | null => {
    if (title.trim().length < 2) return 'Give the event a name.';
    if (capacity && (!/^\d+$/.test(capacity) || Number(capacity) < 1)) return 'Capacity must be a whole number, or leave it empty for no limit.';
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label.trim()) return `Question ${i + 1} needs some text.`;
      if (CHOICE_TYPES.includes(f.type) && parseOptions(f.optionsText).length < 1) return `"${f.label}" needs at least one option.`;
    }
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) { Alert.alert('Check the form', problem); return; }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        venue: venue.trim() || null,
        startsAt: startsAt ? startsAt.toISOString() : null,
        registrationClosesAt: closesAt ? closesAt.toISOString() : null,
        capacity: capacity ? Number(capacity) : null,
        uniquePhone,
        confirmationMessage: confirmation.trim() || null,
        fields: fields.map((f) => ({
          ...(f.id ? { id: f.id } : {}),
          type: f.type,
          label: f.label.trim(),
          required: f.required,
          ...(CHOICE_TYPES.includes(f.type) ? { options: parseOptions(f.optionsText) } : {}),
        })),
      };
      const res = editing ? await api.patch(`/event-forms/${id}`, body) : await api.post('/event-forms', body);
      router.replace({ pathname: '/event-registration/[id]', params: { id: res.data.id, created: editing ? undefined : '1' } } as any);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      Alert.alert('Could not save', Array.isArray(msg) ? msg.join('\n') : (msg ?? 'Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.accent} /></View>;
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}><Ionicons name="arrow-back" size={22} color={C.white} /></TouchableOpacity>
          <Text style={s.title}>{editing ? 'Edit Event' : 'New Event'}</Text>
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={C.dark} size="small" /> : <Text style={s.saveText}>{editing ? 'Save' : 'Create'}</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.cardTitle}>Event details</Text>
            <Text style={s.label}>Event name *</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Redeemed Crusade 2026" placeholderTextColor={C.textGray} maxLength={150} />
            <Text style={s.label}>Description</Text>
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="What is this event about?" placeholderTextColor={C.textGray} multiline maxLength={3000} />
            <Text style={s.label}>Venue</Text>
            <TextInput style={s.input} value={venue} onChangeText={setVenue} placeholder="Where will it hold?" placeholderTextColor={C.textGray} maxLength={250} />
            <DateTimeField label="Date & time of the event" value={startsAt} onChange={setStartsAt} placeholder="Tap to set" clearable />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Registration rules</Text>
            <DateTimeField label="Registration closes (optional)" value={closesAt} onChange={setClosesAt} placeholder="No deadline" clearable />
            <Text style={s.label}>Maximum people (optional)</Text>
            <TextInput style={s.input} value={capacity} onChangeText={(t) => setCapacity(t.replace(/[^0-9]/g, ''))} placeholder="No limit" placeholderTextColor={C.textGray} keyboardType="number-pad" maxLength={7} />
            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchTitle}>One registration per phone number</Text>
                <Text style={s.switchSub}>Stops the same person registering twice. Turn off if families share a phone.</Text>
              </View>
              <Switch value={uniquePhone} onValueChange={setUniquePhone} trackColor={{ true: C.accent }} thumbColor={C.white} />
            </View>
            <Text style={s.label}>"Thank you" message</Text>
            <TextInput style={[s.input, { minHeight: 64, textAlignVertical: 'top' }]} value={confirmation} onChangeText={setConfirmation} placeholder="Shown after someone registers, e.g. See you at the arena!" placeholderTextColor={C.textGray} multiline maxLength={1000} />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Registration form</Text>
            <View style={s.info}>
              <Ionicons name="information-circle-outline" size={16} color={C.textGray} />
              <Text style={s.infoText}>Full name and phone number are always asked. Add any other questions you need.</Text>
            </View>
            {hasAnswers && (
              <View style={[s.info, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="lock-closed-outline" size={16} color="#92400E" />
                <Text style={[s.infoText, { color: '#92400E' }]}>People have already registered, so existing questions can be renamed but not removed or changed to another type.</Text>
              </View>
            )}

            {fields.map((f, i) => {
              const locked = hasAnswers && !!f.id;
              return (
                <View key={f.key} style={s.field}>
                  <View style={s.fieldTop}>
                    <View style={s.typeTag}>
                      <Ionicons name={FIELD_TYPE_LABELS[f.type].icon as any} size={13} color={C.dark} />
                      <Text style={s.typeTagText}>{FIELD_TYPE_LABELS[f.type].label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity onPress={() => move(f.key, -1)} disabled={i === 0} style={[s.mini, i === 0 && { opacity: 0.3 }]}><Ionicons name="arrow-up" size={16} color={C.textDark} /></TouchableOpacity>
                      <TouchableOpacity onPress={() => move(f.key, 1)} disabled={i === fields.length - 1} style={[s.mini, i === fields.length - 1 && { opacity: 0.3 }]}><Ionicons name="arrow-down" size={16} color={C.textDark} /></TouchableOpacity>
                      {!locked && (
                        <TouchableOpacity onPress={() => remove(f.key)} style={s.mini}><Ionicons name="trash-outline" size={16} color={C.error} /></TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <TextInput style={s.input} value={f.label} onChangeText={(t) => update(f.key, { label: t })} placeholder="Question" placeholderTextColor={C.textGray} maxLength={200} />
                  {CHOICE_TYPES.includes(f.type) && (
                    <TextInput
                      style={[s.input, { minHeight: 80, textAlignVertical: 'top', marginTop: 8 }]}
                      value={f.optionsText}
                      onChangeText={(t) => update(f.key, { optionsText: t })}
                      placeholder={'One option per line\nMale\nFemale'}
                      placeholderTextColor={C.textGray}
                      multiline
                    />
                  )}
                  <View style={s.reqRow}>
                    <Text style={s.reqText}>Required</Text>
                    <Switch value={f.required} onValueChange={(v) => update(f.key, { required: v })} trackColor={{ true: C.accent }} thumbColor={C.white} />
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={s.addQ} onPress={() => setShowTypes(true)} activeOpacity={0.85}>
              <Ionicons name="add-circle" size={20} color={C.dark} />
              <Text style={s.addQText}>Add a question</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showTypes} transparent animationType="slide" onRequestClose={() => setShowTypes(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowTypes(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>What kind of question?</Text>
            {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
              <TouchableOpacity key={t} style={s.sheetRow} onPress={() => { setFields((fs) => [...fs, blank(t)]); setShowTypes(false); }} activeOpacity={0.8}>
                <Ionicons name={FIELD_TYPE_LABELS[t].icon as any} size={20} color={C.dark} />
                <Text style={s.sheetRowText}>{FIELD_TYPE_LABELS[t].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.dark },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: C.white },
  saveBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, minWidth: 74, alignItems: 'center' },
  saveText: { fontWeight: '800', color: C.dark },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '700', color: C.textDark, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  switchTitle: { fontSize: 14, fontWeight: '700', color: C.textDark },
  switchSub: { fontSize: 12, color: C.textGray, marginTop: 2 },
  info: { flexDirection: 'row', gap: 8, backgroundColor: C.bg, borderRadius: 10, padding: 10, marginTop: 10 },
  infoText: { flex: 1, fontSize: 12, color: C.textGray, lineHeight: 17 },
  field: { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 12, marginTop: 14 },
  fieldTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  typeTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accentFaint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  typeTagText: { fontSize: 11, fontWeight: '800', color: C.dark },
  mini: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  reqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  reqText: { fontSize: 13, fontWeight: '600', color: C.textDark },
  addQ: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 13, marginTop: 16 },
  addQText: { fontWeight: '800', color: C.dark },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: C.textDark, marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetRowText: { fontSize: 15, color: C.textDark, fontWeight: '600' },
});
