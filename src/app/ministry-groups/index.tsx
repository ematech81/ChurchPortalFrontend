import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

const C = {
  dark: '#120D2E', darkCard: '#1E1650', accent: '#F5C518',
  accentFaint: 'rgba(245,197,24,0.15)', bg: '#F2F2F7',
  white: '#FFFFFF', textDark: '#120D2E', textGray: '#8888A0',
  border: '#E8E8EF', error: '#FF4C4C',
};

// ── Icon map (keyed by category iconKey from backend) ─────────────────────────
const ICON_MAP: Record<string, string> = {
  home: 'home', business: 'business', heart: 'heart',
  hammer: 'hammer', people: 'people', music: 'musical-notes',
  star: 'star', leaf: 'leaf', globe: 'globe-outline',
};

function categoryIcon(iconKey: string | null): string {
  return ICON_MAP[iconKey ?? ''] ?? 'layers-outline';
}

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active:     { bg: 'rgba(245,197,24,0.15)', text: C.accent,  label: 'ACTIVE' },
  core:       { bg: C.dark,                  text: C.white,   label: 'CORE' },
  recruiting: { bg: '#EDE9FE',               text: '#5B21B6', label: 'RECRUITING' },
  inactive:   { bg: C.bg,                    text: C.textGray, label: 'INACTIVE' },
  draft:      { bg: '#FEF9C3',               text: '#92400E', label: 'DRAFT' },
};

function StatusPill({ status }: { status: string }) {
  const st = STATUS_STYLES[status] ?? STATUS_STYLES.inactive;
  return (
    <View style={[pill.wrap, { backgroundColor: st.bg }]}>
      <Text style={[pill.text, { color: st.text }]}>{st.label}</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  wrap: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
});

// ── Group Card ────────────────────────────────────────────────────────────────
function GroupCard({ group, onPress }: { group: any; onPress: () => void }) {
  const leader = group.leader;
  const leaderInitials = leader
    ? `${leader.firstName?.[0] ?? ''}${leader.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <View style={g.card}>
      {/* Status badge top-left */}
      <StatusPill status={group.status} />

      {/* Group name — large, bold, white */}
      <Text style={g.name} numberOfLines={2}>{group.name}</Text>

      {/* Leader block */}
      {leader && (
        <View style={g.leaderBlock}>
          <View style={g.leaderAvatar}>
            <Text style={g.leaderAvatarText}>{leaderInitials}</Text>
          </View>
          <View>
            <Text style={g.leaderRole}>{group.leaderRoleTitle ?? 'LEADER'}</Text>
            <Text style={g.leaderName}>{leader.firstName} {leader.lastName}</Text>
          </View>
        </View>
      )}

      {/* Meta row */}
      <View style={g.metaRow}>
        <View style={g.metaItem}>
          <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.5)" />
          <Text style={g.metaText}>{group.memberCount ?? 0} Members</Text>
        </View>
        {(group.cadence || group.meetingDay) && (
          <View style={g.metaItem}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={g.metaText}>{group.cadence ?? group.meetingDay}</Text>
          </View>
        )}
      </View>

      {/* CTA row */}
      <View style={g.btnRow}>
        <TouchableOpacity style={g.viewBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={g.viewBtnText}>VIEW DETAILS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={g.iconBtn} onPress={onPress} activeOpacity={0.85}>
          <Ionicons name="chevron-forward" size={18} color={C.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const g = StyleSheet.create({
  card: {
    backgroundColor: C.darkCard, borderRadius: 20, padding: 20, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
  },
  name: {
    fontSize: 22, fontWeight: '900', color: C.white,
    lineHeight: 28, marginTop: 10, marginBottom: 14,
  },
  leaderBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    padding: 10, marginBottom: 14,
  },
  leaderAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  leaderAvatarText: { fontSize: 11, fontWeight: '900', color: C.dark },
  leaderRole: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.45)', letterSpacing: 0.8 },
  leaderName: { fontSize: 13, fontWeight: '700', color: C.white },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 18 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10 },
  viewBtn: {
    flex: 1, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 13,
    alignItems: 'center',
  },
  viewBtnText: { fontSize: 13, fontWeight: '800', color: C.dark, letterSpacing: 0.8 },
  iconBtn: {
    width: 46, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ category, count }: { category: any; count: number }) {
  return (
    <View style={sh.row}>
      <View style={sh.accent} />
      <View style={sh.iconWrap}>
        <Ionicons name={categoryIcon(category.iconKey) as any} size={14} color={C.accent} />
      </View>
      <Text style={sh.name}>{category.name}</Text>
      <Text style={sh.count}>{count} {count === 1 ? 'GROUP' : 'GROUPS'}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 20 },
  accent: { width: 3, height: 18, borderRadius: 2, backgroundColor: C.accent },
  iconWrap: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: C.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: C.textDark },
  count: { fontSize: 10, fontWeight: '700', color: C.textGray, letterSpacing: 0.8 },
});

// ── Sub-tab bar ───────────────────────────────────────────────────────────────
function SubTabs({ active, onChange }: { active: string; onChange: (t: string) => void }) {
  const tabs = ['Directory', 'Create Group', 'Analytics'];
  return (
    <View style={st.bar}>
      {tabs.map((t) => (
        <TouchableOpacity key={t} style={st.tab} onPress={() => onChange(t)} activeOpacity={0.8}>
          <Text style={[st.label, active === t && st.labelActive]}>{t}</Text>
          {active === t && <View style={st.underline} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  label: { fontSize: 12, fontWeight: '600', color: C.textGray },
  labelActive: { color: C.dark, fontWeight: '800' },
  underline: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2.5, backgroundColor: C.accent, borderRadius: 2 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MinistryGroupsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isPastor = ['senior_pastor', 'branch_pastor'].includes((user?.role ?? '').toLowerCase());

  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Directory');

  const load = useCallback(async (q = '') => {
    try {
      const params: any = {};
      if (q.trim()) params.search = q.trim();
      const res = await api.get('/ministry-groups', { params });
      setSections(res.data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSearch = (text: string) => {
    setSearch(text);
    load(text);
  };

  const onRefresh = () => { setRefreshing(true); load(search); };

  const handleTabChange = (tab: string) => {
    if (tab === 'Create Group') {
      router.push('/ministry-groups/create' as any);
    } else if (tab === 'Analytics') {
      router.push('/ministry-groups/analytics' as any);
    } else {
      setActiveTab(tab);
    }
  };

  const isEmpty = !loading && sections.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Ministry Groups</Text>
          {isPastor && (
            <TouchableOpacity
              style={s.headerBtn}
              onPress={() => router.push('/ministry-groups/create' as any)}
            >
              <Ionicons name="add-circle-outline" size={24} color={C.accent} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Sub-tabs */}
      <SubTabs active={activeTab} onChange={handleTabChange} />

      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Search + filter */}
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color={C.textGray} />
            <TextInput
              style={s.searchInput}
              placeholder="Search ministry groups..."
              placeholderTextColor={C.textGray}
              value={search}
              onChangeText={onSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => onSearch('')}>
                <Ionicons name="close-circle" size={16} color={C.textGray} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        ) : isEmpty ? (
          <View style={s.centered}>
            <Ionicons name="people-circle-outline" size={64} color={C.border} />
            <Text style={s.emptyTitle}>No ministry groups yet</Text>
            <Text style={s.emptySub}>
              Create your first group to start organising your ministry.
            </Text>
            {isPastor && (
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => router.push('/ministry-groups/create' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={C.dark} />
                <Text style={s.emptyBtnText}>Create Group</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
            }
          >
            {sections.map((section: any) => (
              <View key={section.category.id}>
                <SectionHeader category={section.category} count={section.groups.length} />
                {section.groups.map((group: any) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onPress={() =>
                      router.push({
                        pathname: '/ministry-groups/[id]',
                        params: { id: group.id },
                      } as any)
                    }
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* FAB for pastors */}
      {isPastor && !isEmpty && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/ministry-groups/create' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={C.dark} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerBtn: { padding: 4, width: 34 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },

  searchRow: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.textDark, textAlign: 'center' },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '800', color: C.dark },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 29, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
});
