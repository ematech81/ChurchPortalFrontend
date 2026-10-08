import { View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/theme';

/** "Is a Youth" switch for member forms. Age can't be relied on (many people give no birth year). */
export function YouthToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.card}>
      <View style={s.icon}><Ionicons name="sparkles-outline" size={20} color={C.dark} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Is a Youth</Text>
        <Text style={s.hint}>Adds this person to the Youth page. They stay in the members list.</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.border, true: C.accent }}
        thumbColor={C.white}
        accessibilityLabel="Is a Youth"
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 16,
    padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.border,
  },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accentFaint, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: C.textDark },
  hint: { fontSize: 12, color: C.textGray, marginTop: 2 },
});
