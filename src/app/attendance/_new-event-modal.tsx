import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

const SERVICE_TYPES = [
  { value: 'sunday',  label: 'Sunday Service',   icon: 'sunny' },
  { value: 'midweek', label: 'Midweek Service',   icon: 'moon' },
  { value: 'cell',    label: 'Cell Meeting',       icon: 'people' },
  { value: 'special', label: 'Special Programme', icon: 'star' },
  { value: 'crusade', label: 'Crusade / Outreach', icon: 'megaphone' },
];

export default function NewEventModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('sunday');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setTitle(''); setType('sunday'); setDate(new Date()); setNotes(''); };

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a service title.'); return; }
    setSaving(true);
    try {
      await api.post('/attendance/events', { title: title.trim(), type, date: date.toISOString(), notes: notes || undefined });
      reset();
      onCreated();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      Alert.alert('Error', Array.isArray(msg) ? msg[0] : (msg ?? 'Failed to create service.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (selected) setDate(selected);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>New Service Event</Text>

          {/* Title */}
          <Text style={s.label}>Service Title *</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Sunday Morning Service" placeholderTextColor={C.textGray} />

          {/* Type */}
          <Text style={s.label}>Service Type</Text>
          <View style={s.typeRow}>
            {SERVICE_TYPES.map((t) => (
              <TouchableOpacity key={t.value} style={[s.typeChip, type === t.value && s.typeChipActive]} onPress={() => setType(t.value)} activeOpacity={0.8}>
                <Ionicons name={t.icon as any} size={14} color={type === t.value ? C.dark : C.textGray} />
                <Text style={[s.typeChipText, type === t.value && s.typeChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date */}
          <Text style={s.label}>Date</Text>
          <TouchableOpacity style={s.datePicker} onPress={() => setShowDate(true)} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={18} color={C.textGray} />
            <Text style={s.dateText}>
              {date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          {showDate && (
            <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />
          )}

          {/* Notes */}
          <Text style={s.label}>Notes (optional)</Text>
          <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Preacher, theme, special announcements..." placeholderTextColor={C.textGray} multiline />

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { reset(); onClose(); }} activeOpacity={0.8}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.createBtn, saving && { opacity: 0.7 }]} onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color={C.dark} size="small" /> : <Text style={s.createText}>Create Service</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: C.textDark, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: C.textDark, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  typeChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  typeChipText: { fontSize: 12, fontWeight: '600', color: C.textGray },
  typeChipTextActive: { color: C.dark, fontWeight: '800' },
  datePicker: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  dateText: { fontSize: 14, color: C.textDark },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.border },
  cancelText: { fontSize: 15, fontWeight: '700', color: C.textGray },
  createBtn: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: C.accent },
  createText: { fontSize: 15, fontWeight: '800', color: C.dark },
});
