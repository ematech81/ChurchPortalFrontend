import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/auth.store';

const C = {
  dark: '#120D2E', darkCard: '#1E1650', navy: '#1A2B5C',
  accent: '#F5C518', bg: '#F2F2F7', white: '#FFFFFF',
  textDark: '#120D2E', textGray: '#8888A0', border: '#E8E8EF',
};

// ── Sub-tab bar ───────────────────────────────────────────────────────────────
function SubTabs({ active, onChange }: { active: string; onChange: (t: string) => void }) {
  const tabs = ['Hub Overview', 'Sermons', 'Events'];
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
  underline: { position: 'absolute', bottom: 0, left: 6, right: 6, height: 2.5, backgroundColor: C.accent, borderRadius: 2 },
});

// ── Featured Sermon card ──────────────────────────────────────────────────────
function FeaturedSermonCard({ onWatch, onLibrary }: { onWatch: () => void; onLibrary: () => void }) {
  return (
    <View style={fc.card}>
      {/* Background overlay */}
      <View style={fc.overlay} />

      <View style={fc.badge}>
        <Text style={fc.badgeText}>FEATURED SERMON</Text>
      </View>
      <Text style={fc.title}>The Authority{'\n'}of Faith</Text>
      <Text style={fc.desc}>
        Explore the depths of spiritual leadership and the unwavering strength found in
        modern devotion. A transformative message from Senior Pastor Marcus Throne.
      </Text>
      <View style={fc.actions}>
        <TouchableOpacity style={fc.watchBtn} onPress={onWatch} activeOpacity={0.85}>
          <Ionicons name="play-circle-outline" size={18} color={C.dark} />
          <Text style={fc.watchText}>WATCH NOW</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fc.libraryBtn} onPress={onLibrary} activeOpacity={0.85}>
          <Text style={fc.libraryText}>BROWSE LIBRARY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const fc = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 20, overflow: 'hidden',
    backgroundColor: C.darkCard, padding: 22,
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,13,46,0.85)' },
  badge: {
    alignSelf: 'flex-start', backgroundColor: C.accent, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: C.dark, letterSpacing: 1 },
  title: { fontSize: 30, fontWeight: '900', color: C.white, lineHeight: 36, marginBottom: 12 },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  watchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.accent, borderRadius: 12, paddingVertical: 13,
  },
  watchText: { fontSize: 13, fontWeight: '800', color: C.dark, letterSpacing: 0.5 },
  libraryBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  libraryText: { fontSize: 13, fontWeight: '700', color: C.white, letterSpacing: 0.5 },
});

// ── Upcoming Events mini-row ───────────────────────────────────────────────────
const UPCOMING = [
  { date: '24\nOCT', title: 'Leadership Summit', time: '09:00 AM · Cathedral Hall' },
  { date: '18\nOCT', title: 'Youth Impact Night', time: '06:00 PM · Main Hall' },
  { date: '05\nDEC', title: 'Mission City Drive', time: 'All Day · Community' },
];

function EventsMiniScroll({ onViewAll }: { onViewAll: () => void }) {
  return (
    <View style={ev.wrap}>
      <View style={ev.header}>
        <View>
          <Text style={ev.title}>UPCOMING EVENTS</Text>
          <Text style={ev.sub}>Gather together in purpose and community</Text>
        </View>
        <TouchableOpacity style={ev.viewAll} onPress={onViewAll} activeOpacity={0.8}>
          <Text style={ev.viewAllText}>View All</Text>
          <Ionicons name="arrow-forward" size={14} color={C.accent} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 2 }}>
        {UPCOMING.map((e, i) => (
          <View key={i} style={ev.card}>
            <View style={ev.dateBadge}>
              <Text style={ev.dateText}>{e.date}</Text>
            </View>
            <Text style={ev.evTitle} numberOfLines={2}>{e.title}</Text>
            <Text style={ev.evTime} numberOfLines={1}>{e.time}</Text>
            <View style={ev.regBtn}>
              <Text style={ev.regBtnText}>REGISTER</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const ev = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 22 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 13, fontWeight: '800', color: C.textDark, letterSpacing: 0.5 },
  sub: { fontSize: 11, color: C.textGray, marginTop: 2 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  viewAllText: { fontSize: 12, fontWeight: '700', color: C.accent },
  card: {
    width: 160, backgroundColor: C.white, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  dateBadge: {
    backgroundColor: C.darkCard, borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 10,
  },
  dateText: { fontSize: 13, fontWeight: '900', color: C.accent, textAlign: 'center', lineHeight: 16 },
  evTitle: { fontSize: 13, fontWeight: '800', color: C.textDark, marginBottom: 4, lineHeight: 18 },
  evTime: { fontSize: 10, color: C.textGray, marginBottom: 10 },
  regBtn: { backgroundColor: C.accent, borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  regBtnText: { fontSize: 10, fontWeight: '800', color: C.dark, letterSpacing: 0.5 },
});

// ── Prayer Request card ───────────────────────────────────────────────────────
function PrayerCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={pr.card} onPress={onPress} activeOpacity={0.9}>
      <View style={pr.icon}>
        <Ionicons name="hand-left-outline" size={26} color={C.dark} />
      </View>
      <Text style={pr.title}>Prayer Request</Text>
      <Text style={pr.desc}>
        We believe in the power of prayer. Our stewards are ready to stand with you
        in faith. Submit your request today.
      </Text>
      <View style={pr.checks}>
        {['Confidential Support', '24/7 Global Intercession'].map((t) => (
          <View key={t} style={pr.checkRow}>
            <Ionicons name="checkmark-circle" size={16} color={C.dark} />
            <Text style={pr.checkText}>{t}</Text>
          </View>
        ))}
      </View>
      <View style={pr.btn}>
        <Text style={pr.btnText}>SUBMIT REQUEST</Text>
      </View>
    </TouchableOpacity>
  );
}
const pr = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginTop: 18, backgroundColor: C.accent,
    borderRadius: 20, padding: 22,
  },
  icon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(18,13,46,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '900', color: C.dark, marginBottom: 8 },
  desc: { fontSize: 13, color: 'rgba(18,13,46,0.7)', lineHeight: 19, marginBottom: 14 },
  checks: { gap: 8, marginBottom: 18 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkText: { fontSize: 13, fontWeight: '600', color: C.dark },
  btn: {
    backgroundColor: C.dark, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  btnText: { fontSize: 13, fontWeight: '800', color: C.white, letterSpacing: 1 },
});

// ── Growth tracks ─────────────────────────────────────────────────────────────
const TRACKS = [
  { icon: 'school-outline', label: 'Foundations 101', sub: 'Enrollment Open' },
  { icon: 'people-outline', label: 'Leader Network', sub: 'Monthly Meetups' },
];

function GrowthTracks() {
  return (
    <View style={gt.wrap}>
      <Text style={gt.heading}>Your Path to{'\n'}Kingdom Growth</Text>
      <Text style={gt.sub}>
        Access specialised tracks designed to develop your spiritual gifts and
        leadership capacity.
      </Text>
      {TRACKS.map((t) => (
        <TouchableOpacity key={t.label} style={gt.track} activeOpacity={0.8}>
          <View style={gt.trackIcon}>
            <Ionicons name={t.icon as any} size={20} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={gt.trackLabel}>{t.label}</Text>
            <Text style={gt.trackSub}>{t.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textGray} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
const gt = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 22 },
  heading: { fontSize: 24, fontWeight: '900', color: C.textDark, lineHeight: 30, marginBottom: 8 },
  sub: { fontSize: 13, color: C.textGray, lineHeight: 19, marginBottom: 16 },
  track: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  trackIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: C.darkCard,
    alignItems: 'center', justifyContent: 'center',
  },
  trackLabel: { fontSize: 14, fontWeight: '700', color: C.textDark },
  trackSub: { fontSize: 12, color: C.textGray, marginTop: 2 },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SpiritualHubScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '?';

  const handleTabChange = (tab: string) => {
    if (tab === 'Sermons') router.push('/spiritual-hub/sermons' as any);
    else if (tab === 'Events') router.push('/spiritual-hub/events' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>KINGDOM PORTAL</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SubTabs active="Hub Overview" onChange={handleTabChange} />

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <FeaturedSermonCard
          onWatch={() => router.push('/spiritual-hub/sermons' as any)}
          onLibrary={() => router.push('/spiritual-hub/sermons' as any)}
        />
        <EventsMiniScroll onViewAll={() => router.push('/spiritual-hub/events' as any)} />
        <PrayerCard onPress={() => router.push('/spiritual-hub/prayer' as any)} />

        <GrowthTracks />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.accent, letterSpacing: 0.5 },
  avatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '800', color: C.dark },
});
