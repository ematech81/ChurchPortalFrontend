import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, Animated, Pressable, Dimensions,
} from 'react-native';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { getPinSetupSkipped } from '../../utils/pin-session';
import PinSetupModal from '../../components/pin/PinSetupModal';

const { width: SCREEN_W } = Dimensions.get('window');
const SIDEBAR_W = Math.min(SCREEN_W * 0.78, 320);

const C = {
  dark: '#120D2E',
  darkCard: '#1E1650',
  accent: '#F5C518',
  accentFaint: 'rgba(245,197,24,0.15)',
  bg: '#F2F2F7',
  white: '#FFFFFF',
  textDark: '#120D2E',
  textGray: '#8888A0',
};

const isPastorRole = (role: string) =>
  role === 'senior_pastor' || role === 'branch_pastor';

const ALL_CLUSTERS = [
  { icon: 'people',      title: 'People & Membership', sub: 'Directory, Families, Stats',   route: '/members',       pastorOnly: false },
  { icon: 'trending-up', title: 'Follow-up Engine',    sub: 'Converts, Workers, Tasks',      route: '/follow-up',     pastorOnly: false },
  { icon: 'checkbox',    title: 'Attendance',           sub: 'Check-in, Trends, Reports',     route: '/attendance',    pastorOnly: false },
  { icon: 'home',        title: 'Ministry Groups',      sub: 'Cell Groups, Volunteers, Rota', route: '/ministry-groups', pastorOnly: false },
  { icon: 'wallet',      title: 'Finance',              sub: 'Tithes, Giving, Statements',    route: '/finance',       pastorOnly: true  },
  { icon: 'book',        title: 'Spiritual Hub',        sub: 'Sermons, Prayer, Events',       route: '/spiritual-hub', pastorOnly: false },
  { icon: 'chatbubbles', title: 'Communication',        sub: 'WhatsApp, SMS, Inbox',          route: '/communication', pastorOnly: false },
  { icon: 'settings',    title: 'Administration',       sub: 'Dashboard, Branches, Roles',    route: '/admin',         pastorOnly: true  },
];

// Grid clusters keep the original two-line title format
const GRID_CLUSTERS = [
  { icon: 'people',      title: 'People &\nMembership', sub: 'Directory, Families, Stats',   route: '/members',       pastorOnly: false },
  { icon: 'trending-up', title: 'Follow-up\nEngine',    sub: 'Converts, Workers, Tasks',      route: '/follow-up',     pastorOnly: false },
  { icon: 'checkbox',    title: 'Attendance',            sub: 'Check-in, Trends, Reports',     route: '/attendance',    pastorOnly: false },
  { icon: 'home',        title: 'Ministry\nGroups',      sub: 'Cell Groups, Volunteers, Rota', route: '/ministry-groups', pastorOnly: false },
  { icon: 'wallet',      title: 'Finance',               sub: 'Tithes, Giving, Statements',    route: '/finance',       pastorOnly: true  },
  { icon: 'book',        title: 'Spiritual\nHub',        sub: 'Sermons, Prayer, Events',       route: '/spiritual-hub', pastorOnly: false },
  { icon: 'chatbubbles', title: 'Communication',         sub: 'WhatsApp, SMS, Inbox',          route: '/communication', pastorOnly: false },
  { icon: 'settings',    title: 'Administration',        sub: 'Dashboard, Branches, Roles',    route: '/admin',         pastorOnly: true  },
];

const ACTIVITY = [
  { icon: 'play-circle',   title: 'Sermon: Faith for the New Year', sub: 'Accessed 2 hours ago',    iconBg: C.accent,   iconColor: C.dark  },
  { icon: 'person-circle', title: 'Member: John Doe',               sub: 'Profile edited yesterday', iconBg: C.darkCard, iconColor: C.white },
  { icon: 'document-text', title: 'Report: Monthly Cell Growth',    sub: 'Generated 3 days ago',    iconBg: C.accent,   iconColor: C.dark  },
] as const;

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ visible, onClose, clusters, onNavigate, user }: {
  visible: boolean;
  onClose: () => void;
  clusters: typeof ALL_CLUSTERS;
  onNavigate: (route: string | null) => void;
  user: { firstName: string; lastName: string; role: string } | null;
}) {
  const insets = useSafeAreaInsets();
  const slideX = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideX, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, { toValue: -SIDEBAR_W, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && (slideX as any)._value === -SIDEBAR_W) return null;

  const roleLabel: Record<string, string> = {
    senior_pastor: 'Senior Pastor',
    branch_pastor: 'Branch Pastor',
    admin_pastor: 'Admin Pastor',
    department_head: 'Department Head',
    cell_leader: 'Cell Leader',
    follow_up_worker: 'Follow-Up Worker',
    usher: 'Usher',
    finance_officer: 'Finance Officer',
    member: 'Member',
  };

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '??';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Dimmed overlay */}
      <Animated.View style={[sb.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View style={[sb.drawer, { width: SIDEBAR_W, transform: [{ translateX: slideX }], paddingTop: insets.top }]}>
        {/* Header */}
        <View style={sb.drawerHeader}>
          <View style={sb.drawerAvatar}>
            <Text style={sb.drawerAvatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sb.drawerName} numberOfLines={1}>
              {user ? `${user.firstName} ${user.lastName}` : 'Kingdom Portal'}
            </Text>
            <Text style={sb.drawerRole}>
              {roleLabel[user?.role ?? ''] ?? user?.role ?? ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={sb.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <View style={sb.divider} />

        {/* Nav links */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={sb.navSection}>MODULES</Text>
          {clusters.map((c) => {
            const disabled = !c.route;
            return (
              <TouchableOpacity
                key={c.title}
                style={[sb.navRow, disabled && sb.navRowDisabled]}
                onPress={() => { if (c.route) { onClose(); onNavigate(c.route); } }}
                activeOpacity={disabled ? 1 : 0.75}
              >
                <View style={[sb.navIcon, disabled && sb.navIconDisabled]}>
                  <Ionicons name={c.icon as any} size={18} color={disabled ? 'rgba(255,255,255,0.3)' : C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[sb.navTitle, disabled && sb.navTitleDisabled]}>{c.title}</Text>
                  <Text style={sb.navSub}>{c.sub}</Text>
                </View>
                {!disabled && (
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
                )}
                {disabled && (
                  <View style={sb.comingSoonBadge}>
                    <Text style={sb.comingSoonText}>Soon</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? '').toLowerCase();
  const userIsPastor = isPastorRole(role);

  const clusters = ALL_CLUSTERS.filter((c) => !c.pastorOnly || userIsPastor);
  const gridClusters = GRID_CLUSTERS.filter((c) => !c.pastorOnly || userIsPastor);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const bannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load active assignment count for workers
    api.get('/follow-up/worker/portal')
      .then((res) => {
        const active = res.data?.stats?.active ?? 0;
        setAssignmentCount(active);
        if (active > 0) {
          Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start();
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (userIsPastor && user?.hasPin === false && !getPinSetupSkipped()) {
      const timer = setTimeout(() => setShowPinModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [userIsPastor, user?.hasPin]);

  const handleNavigate = useCallback((route: string | null) => {
    if (route) router.push(route as any);
  }, [router]);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          {/* Menu — opens sidebar */}
          <TouchableOpacity style={s.headerBtn} onPress={() => setSidebarOpen(true)} activeOpacity={0.7}>
            <Ionicons name="menu" size={26} color={C.white} />
          </TouchableOpacity>

          <Text style={s.headerTitle}>Kingdom Portal</Text>

          {/* Avatar — opens profile */}
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)} activeOpacity={0.7}>
            <View style={s.avatar}>
              <Text style={s.avatarInitials}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Search */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={18} color={C.textGray} />
            <Text style={s.searchText}>Search for people, groups, or tool</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={s.statIconRing}>
              <Ionicons name="people" size={22} color={C.accent} />
            </View>
            <View>
              <Text style={s.statLabel}>TOTAL MEMBERS</Text>
              <Text style={s.statValue}>1,284</Text>
            </View>
          </View>
          <View style={s.statCard}>
            <View style={s.statIconRing}>
              <Ionicons name="person-add" size={22} color={C.accent} />
            </View>
            <View>
              <Text style={s.statLabel}>NEW</Text>
              <Text style={s.statValue}>12</Text>
            </View>
          </View>
        </View>

        {/* Assignment banner (shown to workers with active assignments) */}
        {assignmentCount > 0 && (
          <Animated.View style={[
            s.bannerWrap,
            { opacity: bannerAnim, transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }] }
          ]}>
            <TouchableOpacity
              style={s.banner}
              onPress={() => router.push('/worker-portal' as any)}
              activeOpacity={0.88}
            >
              <View style={s.bannerIcon}>
                <Ionicons name="clipboard" size={20} color={C.dark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>
                  {assignmentCount === 1 ? 'You have an assignment' : `You have ${assignmentCount} assignments`}
                </Text>
                <Text style={s.bannerSub}>Tap to open your Worker Portal</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.dark} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Functional Clusters */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Functional Clusters</Text>
          <View style={s.grid}>
            {gridClusters.map((cluster) => (
              <TouchableOpacity
                key={cluster.title}
                style={s.clusterCard}
                activeOpacity={0.75}
                onPress={() => cluster.route && router.push(cluster.route as any)}
              >
                <View style={s.clusterIcon}>
                  <Ionicons name={cluster.icon as any} size={24} color={C.white} />
                </View>
                <Text style={s.clusterTitle}>{cluster.title}</Text>
                <Text style={s.clusterSub}>{cluster.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Recent Activity</Text>
          {ACTIVITY.map((item) => (
            <TouchableOpacity key={item.title} style={s.activityRow} activeOpacity={0.75}>
              <View style={[s.activityIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.activityTitle}>{item.title}</Text>
                <Text style={s.activitySub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textGray} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Sidebar */}
      <Sidebar
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        clusters={clusters}
        onNavigate={handleNavigate}
        user={user}
      />

      <PinSetupModal
        visible={showPinModal}
        onDismiss={() => setShowPinModal(false)}
      />
    </View>
  );
}

// ── Home screen styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.accent, letterSpacing: 0.3 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontSize: 13, fontWeight: '800', color: C.dark },

  searchWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchText: { fontSize: 14, color: C.textGray },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  statCard: {
    flex: 1, backgroundColor: C.darkCard, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  statIconRing: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentFaint,
    alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { fontSize: 9, color: '#8888AA', fontWeight: '600', letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: '800', color: C.white, marginTop: 2 },

  bannerWrap: { paddingHorizontal: 16, paddingTop: 14 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.accent, borderRadius: 16, padding: 14,
    shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  bannerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(18,13,46,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: C.dark, marginBottom: 2 },
  bannerSub: { fontSize: 12, color: 'rgba(18,13,46,0.6)' },
  section: { paddingHorizontal: 16, paddingTop: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.textDark, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  clusterCard: {
    width: '47%', backgroundColor: C.white, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  clusterIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.darkCard,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  clusterTitle: { fontSize: 14, fontWeight: '700', color: C.textDark, lineHeight: 20, marginBottom: 4 },
  clusterSub: { fontSize: 11, color: C.textGray, lineHeight: 16 },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, gap: 12,
  },
  activityIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontSize: 13, fontWeight: '600', color: C.textDark },
  activitySub: { fontSize: 11, color: C.textGray, marginTop: 2 },
});

// ── Sidebar styles ────────────────────────────────────────────────────────────

const sb = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    backgroundColor: C.dark,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 20,
  },
  drawerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  drawerAvatarText: { fontSize: 16, fontWeight: '800', color: C.dark },
  drawerName: { fontSize: 15, fontWeight: '800', color: C.white },
  drawerRole: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  closeBtn: { padding: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 20, marginBottom: 8 },

  navSection: {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5, paddingHorizontal: 20, paddingVertical: 12,
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  navRowDisabled: { opacity: 0.45 },
  navIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  navIconDisabled: { backgroundColor: 'rgba(255,255,255,0.04)' },
  navTitle: { fontSize: 14, fontWeight: '700', color: C.white, marginBottom: 2 },
  navTitleDisabled: { color: 'rgba(255,255,255,0.4)' },
  navSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  comingSoonBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  comingSoonText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 },
});
