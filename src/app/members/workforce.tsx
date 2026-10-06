import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

interface Group {
  id: string;
  name: string;
  categoryId: string;
  status: string;
  isDraft: boolean;
  memberCount?: number;
  leader?: { firstName: string; lastName: string } | null;
}
interface Category { id: string; name: string }

/** "Add to workforce": pick the department/group a member is joining. */
export default function WorkforceScreen() {
  const router = useRouter();
  const { memberId, name } = useLocalSearchParams<{ memberId: string; name?: string }>();

  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [g, c] = await Promise.all([
        api.get('/ministry-groups', { params: { flat: 'true' } }),
        api.get('/group-categories'),
      ]);
      setGroups(g.data ?? []);
      setCategories(c.data ?? []);
    } catch (e: any) {
      setLoadError(e?.response?.data?.message ?? 'Could not load departments. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .filter((g) => !g.isDraft && g.status !== 'inactive' && g.status !== 'draft')
      .filter((g) => !q || g.name.toLowerCase().includes(q) || (categoryName.get(g.categoryId) ?? '').toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, search, categoryName]);

  const join = (g: Group) => {
    const who = name || 'This member';
    Alert.alert(
      'Add to workforce',
      `Add ${who} to ${g.name}?\n\nThey will be marked as a Worker.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            setSavingId(g.id);
            try {
              await api.post(`/ministry-groups/${g.id}/workforce`, { memberId });
              Alert.alert('Added', `${who} is now part of ${g.name}.`, [{ text: 'OK', onPress: () => router.back() }]);
            } catch (e: any) {
              const msg = e?.response?.data?.message;
              Alert.alert('Could not add', Array.isArray(msg) ? msg[0] : (msg ?? 'Please try again.'));
            } finally {
              setSavingId(null);
            }
          },
        },
      ],
    );
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
            <Text style={s.headerTitle}>Add to Workforce</Text>
            <Text style={s.headerSub} numberOfLines={1}>{name ? `Choose a department for ${name}` : 'Choose a department'}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color={C.textGray} />
          <TextInput
            style={s.searchInput}
            placeholder="Search departments or groups..."
            placeholderTextColor={C.textGray}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={C.textGray} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={s.centered}><ActivityIndicator size="large" color={C.accent} /></View>
        ) : loadError ? (
          <View style={s.centered}>
            <Ionicons name="alert-circle-outline" size={44} color={C.error} />
            <Text style={s.emptyTitle}>{loadError}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={load}><Text style={s.retryText}>Try again</Text></TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(g) => g.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={s.centered}>
                <Ionicons name="business-outline" size={48} color={C.border} />
                <Text style={s.emptyTitle}>{search ? 'No match' : 'No departments yet'}</Text>
                <Text style={s.emptySub}>
                  {search ? 'Try a different name.' : 'Create a department first, then add members to it.'}
                </Text>
                {!search && (
                  <TouchableOpacity style={s.retryBtn} onPress={() => router.push('/ministry-groups/create' as any)}>
                    <Text style={s.retryText}>Create a department</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={s.row} activeOpacity={0.8} onPress={() => join(item)} disabled={!!savingId}>
                <View style={s.rowIcon}><Ionicons name="people" size={20} color={C.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName}>{item.name}</Text>
                  <Text style={s.rowSub}>
                    {categoryName.get(item.categoryId) ?? 'Group'} · {item.memberCount ?? 0} member{(item.memberCount ?? 0) === 1 ? '' : 's'}
                    {item.leader ? ` · ${item.leader.firstName} ${item.leader.lastName}` : ''}
                  </Text>
                </View>
                {savingId === item.id
                  ? <ActivityIndicator color={C.accent} />
                  : <Ionicons name="add-circle" size={26} color={C.dark} />}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white,
    margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: C.textDark },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8, flex: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark, textAlign: 'center' },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { fontWeight: '800', color: C.dark },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  rowIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: 15, fontWeight: '700', color: C.textDark },
  rowSub: { fontSize: 12, color: C.textGray, marginTop: 2 },
});
