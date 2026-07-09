import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { C } from '../../../constants/theme';

interface AnyPastor {
  id: string; firstName: string; lastName: string;
  email: string | null; phone: string | null; churchId: string | null;
  role?: string; status?: string; departmentName?: string | null;
  pastoralPosition?: string | null; customFields?: Record<string, any>;
  _source: 'user' | 'member';
}

interface Branch {
  id: string; name: string; city: string | null;
  memberCount: number; workerCount: number;
}

const ROLE_LABELS: Record<string, string> = {
  senior_pastor: 'LEAD PASTOR', SENIOR_PASTOR: 'LEAD PASTOR',
  branch_pastor: 'BRANCH PASTOR', BRANCH_PASTOR: 'BRANCH PASTOR',
  minister: 'MINISTER', pastor: 'PASTOR',
};

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function PastorCard({ pastor, branch, onPress }: {
  pastor: AnyPastor; branch: Branch | null; onPress: () => void;
}) {
  const role = pastor._source === 'user'
    ? (ROLE_LABELS[pastor.role ?? ''] ?? 'BRANCH PASTOR')
    : (ROLE_LABELS[pastor.status ?? ''] ?? 'MINISTER');

  const pp = pastor.customFields?.pastorProfile as Record<string, any> | undefined;
  const years = pp?.yearsInMinistry;
  const hasBranch = !!branch;

  return (
    <TouchableOpacity style={p.card} onPress={onPress} activeOpacity={0.88}>
      <View style={p.cardTop}>
        {/* Avatar */}
        <View style={p.avatarRing}>
          <View style={p.avatar}>
            <Text style={p.avatarText}>{initials(pastor.firstName, pastor.lastName)}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={p.roleRow}>
            <View style={p.roleBadge}>
              <Text style={p.roleBadgeText}>{role}</Text>
            </View>
            {/* Status dot */}
            <View style={[p.statusDot, hasBranch ? p.statusDotActive : p.statusDotIdle]} />
          </View>

          <Text style={p.name}>{pastor.firstName} {pastor.lastName}</Text>

          {pastor.phone ? (
            <View style={p.metaRow}>
              <Ionicons name="call-outline" size={12} color={C.textGray} />
              <Text style={p.metaText}>{pastor.phone}</Text>
            </View>
          ) : null}

          {branch ? (
            <View style={p.metaRow}>
              <Ionicons name="location-outline" size={12} color={C.textGray} />
              <Text style={p.metaText} numberOfLines={1}>
                {branch.name}{branch.city ? `, ${branch.city}` : ''}
              </Text>
            </View>
          ) : (
            <View style={p.metaRow}>
              <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
              <Text style={[p.metaText, { color: '#92400E' }]}>No branch assigned</Text>
            </View>
          )}

          {(pastor.departmentName || years) ? (
            <View style={p.metaRow}>
              <Ionicons name="ribbon-outline" size={12} color={C.textGray} />
              <Text style={p.metaText}>
                {[pastor.departmentName, years ? `${years} yrs` : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color={C.border} style={{ marginTop: 4 }} />
      </View>

      {/* Bottom stat bar */}
      <View style={p.statBar}>
        <View style={p.statItem}>
          <Text style={p.statNum}>{(branch?.memberCount ?? 0).toLocaleString()}</Text>
          <Text style={p.statLbl}>Members</Text>
        </View>
        <View style={p.statDivider} />
        <View style={p.statItem}>
          <Text style={p.statNum}>{(branch?.workerCount ?? 0).toLocaleString()}</Text>
          <Text style={p.statLbl}>Workers</Text>
        </View>
        <View style={p.statDivider} />
        <View style={p.statItem}>
          <View style={[p.sourcePill, pastor._source === 'user' && p.sourcePillUser]}>
            <Text style={[p.sourcePillText, pastor._source === 'user' && p.sourcePillTextUser]}>
              {pastor._source === 'user' ? 'ADMIN' : 'DIRECTORY'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PastorsScreen() {
  const router = useRouter();
  const [userPastors, setUserPastors] = useState<AnyPastor[]>([]);
  const [memberPastors, setMemberPastors] = useState<AnyPastor[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // 'pastoral' is the unified filter that matches by status OR churchRole
      const [uRes, bRes, mRes] = await Promise.all([
        api.get('/churches/pastors'),
        api.get('/churches/branches'),
        api.get('/members', { params: { status: 'pastor', limit: 500 } }),
      ]);
      setUserPastors((uRes.data ?? []).map((u: any) => ({ ...u, _source: 'user' })));
      setBranches(bRes.data ?? []);
      setMemberPastors((mRes.data ?? []).map((m: any) => ({ ...m, _source: 'member' })));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const allPastors = useMemo(() => {
    const userEmails = new Set(userPastors.map((u) => (u.email ?? '').toLowerCase()));
    const members = memberPastors.filter(
      (p) => !p.email || !userEmails.has((p.email as string).toLowerCase()),
    );
    return [...userPastors, ...members];
  }, [userPastors, memberPastors]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allPastors;
    const q = search.toLowerCase();
    return allPastors.filter((p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (branchMap.get(p.churchId ?? '')?.name ?? '').toLowerCase().includes(q),
    );
  }, [allPastors, search, branchMap]);

  const navigateTo = (pastor: AnyPastor) => {
    router.push({
      pathname: '/admin/pastors/[id]',
      params: {
        id: pastor.id,
        source: pastor._source,
        pastorName: `${pastor.firstName} ${pastor.lastName}`,
        pastorEmail: pastor.email ?? '',
        pastorPhone: pastor.phone ?? '',
        pastorRole: pastor._source === 'user' ? (pastor.role ?? '') : (pastor.status ?? ''),
        churchId: pastor.churchId ?? '',
        branchName: branchMap.get(pastor.churchId ?? '')?.name ?? '',
        branchCity: branchMap.get(pastor.churchId ?? '')?.city ?? '',
        memberCount: String(branchMap.get(pastor.churchId ?? '')?.memberCount ?? 0),
        workerCount: String(branchMap.get(pastor.churchId ?? '')?.workerCount ?? 0),
      },
    } as any);
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
            <Text style={s.headerTitle}>Clergy Directory</Text>
            <Text style={s.headerSub}>
              {allPastors.length} pastor{allPastors.length !== 1 ? 's' : ''} registered
            </Text>
          </View>
        </View>

        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or branch..."
              placeholderTextColor="rgba(255,255,255,0.35)"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={[s.centered, { backgroundColor: C.bg }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => `${p._source}-${p.id}`}
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.accent} />}
          renderItem={({ item }) => (
            <PastorCard
              pastor={item}
              branch={branchMap.get(item.churchId ?? '') ?? null}
              onPress={() => navigateTo(item)}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="person-circle-outline" size={52} color={C.border} />
              <Text style={s.emptyTitle}>No pastors found</Text>
              <Text style={s.emptySub}>
                Tap the + button to register a pastor, or register members with "Pastor" status.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push('/admin/pastors/add' as any)}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={28} color={C.dark} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 14, color: C.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center', paddingHorizontal: 20 },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8 },
});

const p = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 14 },
  avatarRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, borderColor: C.accent, padding: 2.5, alignItems: 'center', justifyContent: 'center' },
  avatar: { flex: 1, borderRadius: 26, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800', color: C.accent },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  roleBadge: { backgroundColor: C.dark, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 9, fontWeight: '800', color: C.accent, letterSpacing: 0.8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotActive: { backgroundColor: '#10B981' },
  statusDotIdle: { backgroundColor: '#F59E0B' },
  name: { fontSize: 16, fontWeight: '800', color: C.textDark, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  metaText: { fontSize: 12, color: C.textGray, flex: 1 },
  statBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.dark, paddingHorizontal: 16, paddingVertical: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },
  statNum: { fontSize: 16, fontWeight: '800', color: C.accent },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 1, fontWeight: '600' },
  sourcePill: { backgroundColor: 'rgba(245,197,24,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  sourcePillUser: { backgroundColor: 'rgba(99,102,241,0.2)' },
  sourcePillText: { fontSize: 8, fontWeight: '800', color: C.accent, letterSpacing: 0.5 },
  sourcePillTextUser: { color: '#A5B4FC' },
});
