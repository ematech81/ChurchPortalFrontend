import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, StatusBar,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { saveAndShare } from '../../utils/save-and-share';
import { C } from '../../constants/theme';

const STATUS_OPTIONS = [
  { key: 'all', label: 'Everyone' },
  { key: 'worker', label: 'Workers' },
  { key: 'first_timer', label: 'First timers' },
  { key: 'new_convert', label: 'New converts' },
  { key: 'member', label: 'Members' },
  { key: 'visitor', label: 'Visitors' },
  { key: 'backslidden', label: 'Backslidden' },
  { key: 'minister', label: 'Ministers' },
  { key: 'pastor', label: 'Pastors' },
];

const DETAIL_OPTIONS = [
  { key: 'numbers', label: 'Numbers only', sub: 'One column of phone numbers' },
  { key: 'name_number', label: 'Names and numbers', sub: 'Name + phone' },
  { key: 'full', label: 'Full details', sub: 'Email, department, branch, address…' },
] as const;

const FORMAT_OPTIONS = [
  { key: 'xlsx', label: 'Excel', ext: '.xlsx', icon: 'grid' },
  { key: 'csv', label: 'CSV', ext: '.csv', icon: 'document-text' },
  { key: 'vcf', label: 'Contacts', ext: '.vcf', icon: 'people-circle' },
  { key: 'txt', label: 'Text', ext: '.txt', icon: 'reorder-three' },
] as const;

interface Group { id: string; name: string; isDraft?: boolean; status?: string }
interface Branch { id: string; name: string }

export default function ExportMembersScreen() {
  const router = useRouter();
  const role = (useAuthStore((st) => st.user?.role) ?? '').toLowerCase();
  const isSenior = role === 'senior_pastor' || role === 'super_admin';

  const [statuses, setStatuses] = useState<string[]>(['all']);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [branchId, setBranchId] = useState<string>('all'); // 'own' | 'all' | <branch id> (senior only)
  const [branches, setBranches] = useState<Branch[]>([]);
  const [detail, setDetail] = useState<'numbers' | 'name_number' | 'full'>('name_number');
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'vcf' | 'txt'>('xlsx');

  const [count, setCount] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showGroups, setShowGroups] = useState(false);

  const filters = useMemo(
    () => ({
      statuses,
      flaggedOnly: flaggedOnly || undefined,
      groupId: group?.id,
      branchId: isSenior && branchId !== 'own' ? branchId : undefined,
    }),
    [statuses, flaggedOnly, group, branchId, isSenior],
  );

  useEffect(() => {
    if (!isSenior) return;
    api.get('/churches/branches').then((r) => setBranches(r.data ?? [])).catch(() => {});
  }, [isSenior]);

  // live "how many people?" preview
  const seq = useRef(0);
  useEffect(() => {
    const mine = ++seq.current;
    setCount(null);
    const t = setTimeout(async () => {
      try {
        const r = await api.post('/members/export/count', filters);
        if (seq.current === mine) setCount(r.data.count);
      } catch {
        if (seq.current === mine) setCount(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  const toggleStatus = (key: string) => {
    setStatuses((prev) => {
      if (key === 'all') return ['all'];
      const next = prev.filter((s) => s !== 'all');
      const has = next.includes(key);
      const out = has ? next.filter((s) => s !== key) : [...next, key];
      return out.length ? out : ['all'];
    });
  };

  const namesOnlyFormat = format === 'vcf' || format === 'txt';

  const doExport = async () => {
    setExporting(true);
    try {
      const res = await api.post('/members/export', { ...filters, detail, format });
      const { count: n, skipped, ...file } = res.data;
      await saveAndShare(file);
      if (skipped > 0) {
        Alert.alert('Exported', `${n} people exported. ${skipped} were left out because their phone number looks invalid.`);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      Alert.alert('Could not export', Array.isArray(msg) ? msg[0] : (msg ?? e?.message ?? 'Please try again.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={22} color={C.white} /></TouchableOpacity>
          <View>
            <Text style={s.title}>Export Members</Text>
            <Text style={s.sub}>Download phone numbers and details</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <Text style={s.section}>Who should be included?</Text>
        <View style={s.chips}>
          {STATUS_OPTIONS.map((o) => {
            const on = statuses.includes(o.key);
            return (
              <TouchableOpacity key={o.key} style={[s.chip, on && s.chipOn]} onPress={() => toggleStatus(o.key)} activeOpacity={0.8}>
                {on && <Ionicons name="checkmark" size={14} color={C.dark} />}
                <Text style={[s.chipText, on && s.chipTextOn]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={s.switchRow} onPress={() => setFlaggedOnly((v) => !v)} activeOpacity={0.8}>
          <Ionicons name={flaggedOnly ? 'checkbox' : 'square-outline'} size={22} color={flaggedOnly ? C.dark : C.textGray} />
          <Text style={s.switchText}>Only people flagged for follow-up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.pickRow} onPress={() => setShowGroups(true)} activeOpacity={0.8}>
          <Ionicons name="business-outline" size={20} color={C.textGray} />
          <Text style={[s.pickText, !group && { color: C.textGray }]}>{group ? group.name : 'Any department or group'}</Text>
          {group ? (
            <TouchableOpacity onPress={() => setGroup(null)} hitSlop={8}><Ionicons name="close-circle" size={20} color={C.textGray} /></TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={C.textGray} />
          )}
        </TouchableOpacity>

        {isSenior && (
          <>
            <Text style={s.section}>Which branch?</Text>
            <View style={s.chips}>
              {[{ id: 'all', name: 'All branches' }, { id: 'own', name: 'Headquarters only' }, ...branches].map((b) => (
                <TouchableOpacity key={b.id} style={[s.chip, branchId === b.id && s.chipOn]} onPress={() => setBranchId(b.id)} activeOpacity={0.8}>
                  <Text style={[s.chipText, branchId === b.id && s.chipTextOn]}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={s.section}>What to export</Text>
        {DETAIL_OPTIONS.map((o) => {
          const disabled = namesOnlyFormat && o.key === 'full';
          const on = detail === o.key && !disabled;
          return (
            <TouchableOpacity key={o.key} style={[s.radio, on && s.radioOn, disabled && { opacity: 0.4 }]} disabled={disabled} onPress={() => setDetail(o.key)} activeOpacity={0.8}>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? C.dark : C.textGray} />
              <View style={{ flex: 1 }}>
                <Text style={s.radioTitle}>{o.label}</Text>
                <Text style={s.radioSub}>{o.sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={s.section}>File type</Text>
        <View style={s.formatRow}>
          {FORMAT_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.key}
              style={[s.format, format === o.key && s.formatOn]}
              onPress={() => {
                setFormat(o.key);
                if ((o.key === 'vcf' || o.key === 'txt') && detail === 'full') setDetail('name_number');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name={o.icon as any} size={22} color={format === o.key ? C.dark : C.textGray} />
              <Text style={[s.formatLabel, format === o.key && { color: C.dark }]}>{o.label}</Text>
              <Text style={s.formatExt}>{o.ext}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {format === 'vcf' && <Text style={s.hint}>Contacts files import straight into your phone book — handy for building WhatsApp broadcast lists.</Text>}
        {namesOnlyFormat && <Text style={s.hint}>Contacts and text files use names and phone numbers only.</Text>}
        <Text style={s.hint}>Numbers are written in international format (+234…). Every export is recorded.</Text>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.exportBtn, (exporting || count === 0) && { opacity: 0.5 }]}
          disabled={exporting || count === 0}
          onPress={doExport}
          activeOpacity={0.85}
        >
          {exporting ? <ActivityIndicator color={C.dark} /> : (
            <>
              <Ionicons name="download-outline" size={20} color={C.dark} />
              <Text style={s.exportText}>
                {count === null ? 'Export' : count === 0 ? 'No one matches' : `Export ${count} ${count === 1 ? 'person' : 'people'}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <GroupPicker visible={showGroups} onClose={() => setShowGroups(false)} onPick={(g) => { setGroup(g); setShowGroups(false); }} />
    </View>
  );
}

function GroupPicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (g: Group) => void }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api.get('/ministry-groups', { params: { flat: 'true' } })
      .then((r) => setGroups((r.data ?? []).filter((g: Group) => !g.isDraft && g.status !== 'draft')))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const shown = groups.filter((g) => g.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <Text style={s.sheetTitle}>Choose a department or group</Text>
          <TextInput style={s.search} placeholder="Search..." placeholderTextColor={C.textGray} value={search} onChangeText={setSearch} autoCorrect={false} />
          {loading ? <ActivityIndicator color={C.accent} style={{ margin: 24 }} /> : (
            <FlatList
              data={shown}
              keyExtractor={(g) => g.id}
              style={{ maxHeight: 340 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={s.empty}>{groups.length ? 'No match' : 'No departments or groups yet'}</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.groupRow} onPress={() => onPick(item)} activeOpacity={0.8}>
                  <Text style={s.groupName}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={C.textGray} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  back: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: C.white },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  section: { fontSize: 13, fontWeight: '800', color: C.textDark, marginTop: 22, marginBottom: 10, letterSpacing: 0.3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: C.textGray },
  chipTextOn: { color: C.dark, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  switchText: { fontSize: 14, color: C.textDark, fontWeight: '600' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginTop: 16 },
  pickText: { flex: 1, fontSize: 14, color: C.textDark },
  radio: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  radioOn: { borderColor: C.dark },
  radioTitle: { fontSize: 14, fontWeight: '700', color: C.textDark },
  radioSub: { fontSize: 12, color: C.textGray, marginTop: 2 },
  formatRow: { flexDirection: 'row', gap: 8 },
  format: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 12 },
  formatOn: { borderColor: C.accent, backgroundColor: C.accentFaint },
  formatLabel: { fontSize: 12, fontWeight: '800', color: C.textGray },
  formatExt: { fontSize: 11, color: C.textGray },
  hint: { fontSize: 12, color: C.textGray, marginTop: 10, lineHeight: 17 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16 },
  exportText: { fontSize: 16, fontWeight: '800', color: C.dark },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: C.textDark, marginBottom: 12 },
  search: { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.textDark, marginBottom: 8 },
  groupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  groupName: { fontSize: 15, color: C.textDark, fontWeight: '600' },
  empty: { textAlign: 'center', color: C.textGray, padding: 24 },
});
