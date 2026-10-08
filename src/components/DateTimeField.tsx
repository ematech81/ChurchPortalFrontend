import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/theme';

interface Props {
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
  placeholder?: string;
  minimumDate?: Date;
  /** Show a clear (×) button so an optional date can be removed again. */
  clearable?: boolean;
}

const fmt = (d: Date) =>
  `${d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

/** Date + time picker. Android shows the date dialog then the time dialog; iOS shows one compact control. */
export default function DateTimeField({ label, value, onChange, placeholder = 'Tap to set', minimumDate, clearable }: Props) {
  const [step, setStep] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  const open = () => {
    const base = value ?? new Date();
    setDraft(base);
    if (Platform.OS === 'ios') onChange(base); // iOS control edits the value live
    else setStep('date');
  };

  const onAndroid = (e: DateTimePickerEvent, selected?: Date) => {
    if (e.type === 'dismissed' || !selected) { setStep(null); return; }
    if (step === 'date') {
      const d = new Date(draft);
      d.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setDraft(d);
      setStep('time');
    } else {
      const d = new Date(draft);
      d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setStep(null);
      onChange(d);
    }
  };

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        {Platform.OS === 'ios' && value ? (
          <DateTimePicker
            value={value}
            mode="datetime"
            display="compact"
            minimumDate={minimumDate}
            onChange={(_e, d) => d && onChange(d)}
          />
        ) : (
          <TouchableOpacity style={s.field} onPress={open} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={18} color={C.textGray} />
            <Text style={[s.text, !value && { color: C.textGray }]}>{value ? fmt(value) : placeholder}</Text>
          </TouchableOpacity>
        )}
        {clearable && value && (
          <TouchableOpacity onPress={() => onChange(null)} style={s.clear} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={C.textGray} />
          </TouchableOpacity>
        )}
      </View>

      {Platform.OS === 'android' && step && (
        <DateTimePicker value={draft} mode={step} minimumDate={step === 'date' ? minimumDate : undefined} onChange={onAndroid} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 12 },
  label: { fontSize: 12, fontWeight: '700', color: C.textDark, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  text: { fontSize: 14, color: C.textDark, flexShrink: 1 },
  clear: { padding: 2 },
});
