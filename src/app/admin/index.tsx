import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { C } from '../../constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  totalMembers: number | null;
  totalBranches: number | null;
  totalWorkers: number | null;
  totalFirstTimers: number | null;
  totalNewConverts: number | null;
  totalPastors: number | null;
  totalFollowUps: number | null;
  attendanceThisWeek: number | null;
  totalEvents: number | null;
  totalDepartments: number | null;
  monthlyGiving: number | null;
}

// ── Config ────────────────────────────────────────────────────────────────────

interface StatDef {
  key: keyof Stats;
  label: string;
  icon: string;
  color: string;
  seniorOnly?: boolean;
}

const STAT_DEFS: StatDef[] = [
  { key: 'totalMembers',       label: 'Total Members',    icon: 'people',           color: '#0EA5E9' },
  { key: 'totalBranches',      label: 'Branches',         icon: 'git-branch',       color: '#8B5CF6', seniorOnly: true },
  { key: 'totalWorkers',       label: 'Workers',          icon: 'construct',        color: '#F59E0B' },
  { key: 'totalFirstTimers',   label: 'First Timers',     icon: 'star',             color: '#10B981' },
  { key: 'totalNewConverts',   label: 'New Converts',     icon: 'heart',            color: '#EC4899' },
  { key: 'totalPastors',       label: 'Pastors',          icon: 'person-circle',    color: '#6366F1' },
  { key: 'totalFollowUps',     label: 'Follow-Ups',       icon: 'trending-up',      color: '#EF4444' },
  { key: 'attendanceThisWeek', label: 'Attendance (Wk)', icon: 'checkbox',         color: '#14B8A6' },
  { key: 'totalEvents',        label: 'Events',           icon: 'calendar',         color: '#F97316' },
  { key: 'monthlyGiving',      label: 'Monthly Giving',   icon: 'wallet',           color: '#22C55E' },
];

interface ModuleDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string | null;
  seniorOnly?: boolean;
}

const MODULE_DEFS: ModuleDef[] = [
  { id: 'branches',      title: 'Branch Management', description: 'Create and manage ministry branches',    icon: 'git-branch',       color: '#8B5CF6', route: '/admin/branches',  seniorOnly: true },
  { id: 'pastors',       title: 'Pastor Management', description: 'Assign pastors to branches',             icon: 'person-circle',    color: '#6366F1', route: '/admin/pastors',   seniorOnly: true },
  { id: 'roles',         title: 'Role Assignment',   description: 'Set access roles and permissions',       icon: 'key',              color: '#EC4899', route: null,               seniorOnly: true },
  { id: 'members',       title: 'Member Management', description: 'Full ministry directory',                icon: 'people',           color: '#0EA5E9', route: '/members'                           },
  { id: 'departments',   title: 'Departments',        description: 'Ministry units and serving teams',      icon: 'business',         color: '#14B8A6', route: null                                 },
  { id: 'workers',       title: 'Workers',            description: 'Track and manage active workers',       icon: 'construct',        color: '#F59E0B', route: null                                 },
  { id: 'attendance',    title: 'Attendance',         description: 'Service check-in and reports',          icon: 'checkbox',         color: '#10B981', route: '/attendance'                        },
  { id: 'events',        title: 'Events & Programs',  description: 'Church calendar and programs',          icon: 'calendar',         color: '#F97316', route: null                                 },
  { id: 'followup',      title: 'Follow-Up',          description: 'Pastoral follow-up and tasks',          icon: 'trending-up',      color: '#EF4444', route: '/follow-up'                         },
  { id: 'finance',       title: 'Finance & Giving',   description: 'Tithes, offerings, statements',         icon: 'wallet',           color: '#22C55E', route: '/finance'                           },
  { id: 'communication', title: 'Communication',      description: 'WhatsApp, SMS and announcements',       icon: 'chatbubbles',      color: '#3B82F6', route: '/communication'                     },
  { id: 'reports',       title: 'Reports & Analytics',description: 'Ministry insights and trends',          icon: 'bar-chart',        color: '#8B5CF6', route: '/admin/reports'                     },
  { id: 'services',      title: 'Service Schedule',   description: 'Programs and order of service',         icon: 'time',             color: '#64748B', route: null                                 },
  { id: 'settings',      title: 'Settings',           description: 'Ministry configuration',                icon: 'settings',         color: '#374151', route: null,               seniorOnly: true },
  { id: 'audit',         title: 'Audit Logs',         description: 'Activity and security records',         icon: 'shield-checkmark', color: '#1E293B', route: null,               seniorOnly: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getRoleLabel(role: string) {
  const map: Record<string, string> = {
    senior_pastor: 'Senior Pastor',
    branch_pastor: 'Branch Pastor',
    admin_pastor: 'Admin Pastor',
    department_head: 'Department Head',
    finance_officer: 'Finance Officer',
  };
  return map[role.toLowerCase()] ?? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ def, value }: { def: StatDef; value: number | null }) {
  return (
    <View style={[s.statCard, { borderLeftColor: def.color }]}>
      <View style={[s.statIconCircle, { backgroundColor: `${def.color}18` }]}>
        <Ionicons name={def.icon as any} size={18} color={def.color} />
      </View>
      <Text style={s.statValue}>{fmt(value)}</Text>
      <Text style={s.statLabel}>{def.label}</Text>
    </View>
  );
}

function ModuleCard({ mod, onPress }: { mod: ModuleDef; onPress: () => void }) {
  const isBuilt = mod.route !== null;
  return (
    <TouchableOpacity
      style={[s.moduleCard, !isBuilt && s.moduleCardDim]}
      onPress={onPress}
      activeOpacity={isBuilt ? 0.75 : 0.9}
    >
      <View style={[s.moduleIconWrap, { backgroundColor: `${mod.color}18` }]}>
        <Ionicons name={mod.icon as any} size={22} color={isBuilt ? mod.color : C.textGray} />
      </View>
      <Text style={[s.moduleTitle, !isBuilt && { color: C.textGray }]} numberOfLines={1}>
        {mod.title}
      </Text>
      <Text style={s.moduleDesc} numberOfLines={2}>{mod.description}</Text>
      <View style={s.moduleFooter}>
        {!isBuilt && (
          <View style={s.comingSoonBadge}>
            <Text style={s.comingSoonText}>Soon</Text>
          </View>
        )}
        <Ionicons
          name="chevron-forward"
          size={14}
          color={isBuilt ? mod.color : C.border}
          style={{ marginLeft: 'auto' }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  // Show senior-only modules to anyone who isn't explicitly a branch pastor.
  // Checking for !== 'branch_pastor' is more resilient than checking === 'senior_pastor'
  // in case the stored user object has a case difference or is slightly stale.
  const isSenior = (user?.role ?? '').toLowerCase() !== 'branch_pastor';

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchStats(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const handleModule = (mod: ModuleDef) => {
    if (mod.route) {
      router.push(mod.route as any);
    } else {
      // future modules — no-op for now
    }
  };

  const visibleStats = STAT_DEFS.filter((d) => !d.seniorOnly || isSenior);
  const visibleModules = MODULE_DEFS.filter((m) => !m.seniorOnly || isSenior);

  // Pair stats into rows of 2
  const statRows: StatDef[][] = [];
  for (let i = 0; i < visibleStats.length; i += 2) {
    statRows.push(visibleStats.slice(i, i + 2));
  }

  // Pair modules into rows of 2
  const moduleRows: ModuleDef[][] = [];
  for (let i = 0; i < visibleModules.length; i += 2) {
    moduleRows.push(visibleModules.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Admin Dashboard</Text>
          <TouchableOpacity style={s.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={C.white} />
            <View style={s.bellDot} />
          </TouchableOpacity>
        </View>

        {/* ── Hero greeting ───────────────────────────────────────────── */}
        <View style={s.hero}>
          <View>
            <Text style={s.greeting}>{getGreeting()}, {user?.firstName} 👋</Text>
            <Text style={s.heroSub}>Here's what's happening in your ministry</Text>
          </View>
          <View style={s.roleBadge}>
            <Ionicons
              name={isSenior ? 'shield-checkmark' : 'git-branch-outline'}
              size={11}
              color={C.accent}
            />
            <Text style={s.roleBadgeText}>{getRoleLabel(user?.role ?? '')}</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <ScrollView
        style={s.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* Stats section */}
        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Ministry Overview</Text>
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={C.accent} />
            <Text style={s.loadingText}>Loading stats...</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {statRows.map((row, ri) => (
              <View key={ri} style={s.gridRow}>
                {row.map((def) => (
                  <StatCard key={def.key} def={def} value={stats?.[def.key] ?? null} />
                ))}
                {row.length === 1 && <View style={s.statCard} />}
              </View>
            ))}
          </View>
        )}

        {/* Modules section */}
        <View style={[s.sectionHeader, { marginTop: 8 }]}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Management Modules</Text>
        </View>
        <Text style={s.sectionSub}>
          {isSenior ? 'Full ministry access' : 'Branch-scoped access'} · {visibleModules.length} modules
        </Text>

        <View style={s.grid}>
          {moduleRows.map((row, ri) => (
            <View key={ri} style={s.gridRow}>
              {row.map((mod) => (
                <ModuleCard key={mod.id} mod={mod} onPress={() => handleModule(mod)} />
              ))}
              {row.length === 1 && <View style={[s.moduleCard, { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 }]} />}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.accent, letterSpacing: 0.5 },
  bellBtn: { padding: 4, position: 'relative' },
  bellDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.error,
    borderWidth: 1.5, borderColor: C.dark,
  },

  // Hero
  hero: {
    paddingHorizontal: 20, paddingBottom: 22, gap: 10,
  },
  greeting: { fontSize: 20, fontWeight: '800', color: C.white },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(245,197,24,0.25)',
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: C.accent, letterSpacing: 0.5 },

  // Body
  body: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, marginBottom: 12 },
  sectionAccent: { width: 4, height: 18, borderRadius: 2, backgroundColor: C.accent },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.textDark },
  sectionSub: { fontSize: 12, color: C.textGray, marginHorizontal: 16, marginTop: -8, marginBottom: 12 },

  // Grid layout
  grid: { paddingHorizontal: 12 },
  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },

  // Stat cards
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 14,
    padding: 14, borderLeftWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIconCircle: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: C.textDark, marginBottom: 2 },
  statLabel: { fontSize: 11, color: C.textGray, fontWeight: '600', letterSpacing: 0.3 },

  // Module cards
  moduleCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 16,
    padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  moduleCardDim: { backgroundColor: '#FAFAFA' },
  moduleIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  moduleTitle: { fontSize: 13, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  moduleDesc: { fontSize: 11, color: C.textGray, lineHeight: 16, flex: 1, marginBottom: 10 },
  moduleFooter: { flexDirection: 'row', alignItems: 'center' },
  comingSoonBadge: {
    backgroundColor: C.bg, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  comingSoonText: { fontSize: 9, fontWeight: '700', color: C.textGray, letterSpacing: 0.5 },

  // Loading
  loadingBox: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  loadingText: { fontSize: 13, color: C.textGray },
});
