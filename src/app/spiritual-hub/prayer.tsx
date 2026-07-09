import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Modal,
  StyleSheet, StatusBar, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  dark: '#120D2E', darkCard: '#1E1650', accent: '#F5C518',
  bg: '#F2F2F7', white: '#FFFFFF', textDark: '#120D2E',
  textGray: '#8888A0', border: '#E8E8EF', error: '#FF4C4C',
  urgent: '#F59E0B',
};

// ── Static prayer wall data ───────────────────────────────────────────────────
const PRAYER_REQUESTS: PrayerItem[] = [
  {
    id: '1', name: 'Sarah M.', branch: 'BRANCH NORTHOAK',
    title: 'Healing for Surgery',
    body: 'Asking for strength and peace as I undergo a major procedure this Friday. Praying for the surgical team and a quick recovery.',
    prayingCount: 42, urgent: false,
  },
  {
    id: '2', name: 'David L.', branch: 'CENTRAL HUB',
    title: 'Family Reconciliation',
    body: 'Praying for soft hearts and a breakthrough in a long-standing family dispute. We need the wisdom of Solomon and the grace of Christ.',
    prayingCount: 128, urgent: false,
  },
  {
    id: '3', name: 'Global Intercession', branch: 'URGENT CALL',
    title: 'Missionary Protection',
    body: 'Pray for our team currently on the field in Southeast Asia. Safety from severe weather and open doors for the message.',
    prayingCount: 562, urgent: true,
  },
  {
    id: '4', name: 'Linda K.', branch: 'BRANCH SOUTHVIEW',
    title: 'Mental Clarity',
    body: 'Searching for peace in a season of heavy transition. Praying for clarity of mind and strength to make the right decisions.',
    prayingCount: 89, urgent: false,
  },
];

type PrayerItem = {
  id: string; name: string; branch: string;
  title: string; body: string; prayingCount: number; urgent: boolean;
};

// ── Prayer request card ───────────────────────────────────────────────────────
function PrayerCard({ item, onPray }: { item: PrayerItem; onPray: (id: string) => void }) {
  const [praying, setPraying] = useState(false);
  const initials = item.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const handlePray = () => {
    if (praying) return;
    setPraying(true);
    onPray(item.id);
  };

  return (
    <View style={[pc.card, item.urgent && pc.urgentCard]}>
      {item.urgent && (
        <View style={pc.urgentBadge}>
          <Text style={pc.urgentText}>URGENT CALL</Text>
        </View>
      )}
      <View style={pc.topRow}>
        <View style={[pc.avatar, item.urgent && pc.urgentAvatar]}>
          <Text style={[pc.avatarText, item.urgent && { color: C.dark }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pc.name}>{item.name}</Text>
          <Text style={[pc.branch, item.urgent && pc.urgentBranch]}>{item.branch}</Text>
        </View>
      </View>
      <Text style={[pc.title, item.urgent && pc.urgentTitle]}>{item.title}</Text>
      <Text style={[pc.body, item.urgent && pc.urgentBody]}>"{item.body}"</Text>
      <View style={pc.bottomRow}>
        <View style={pc.countRow}>
          <Ionicons name="people-outline" size={14} color={item.urgent ? C.dark : C.textGray} />
          <Text style={[pc.count, item.urgent && { color: C.dark }]}>{item.prayingCount}</Text>
        </View>
        <TouchableOpacity
          style={[pc.prayBtn, praying && pc.prayingBtn, item.urgent && pc.urgentPrayBtn]}
          onPress={handlePray}
          activeOpacity={0.85}
        >
          <Text style={[pc.prayText, (praying || item.urgent) && pc.prayTextDark]}>
            {praying ? 'PRAYING ✓' : "I'M PRAYING"}
          </Text>
          {!praying && (
            <Ionicons name="hand-left-outline" size={14} color={praying || item.urgent ? C.dark : C.white} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  urgentCard: { backgroundColor: C.accent, borderWidth: 0 },
  urgentBadge: {
    alignSelf: 'flex-start', backgroundColor: C.dark, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10,
  },
  urgentText: { fontSize: 8, fontWeight: '800', color: C.accent, letterSpacing: 0.8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.darkCard,
    alignItems: 'center', justifyContent: 'center',
  },
  urgentAvatar: { backgroundColor: C.dark },
  avatarText: { fontSize: 12, fontWeight: '800', color: C.accent },
  name: { fontSize: 14, fontWeight: '800', color: C.textDark },
  branch: { fontSize: 10, color: C.textGray, fontWeight: '700', letterSpacing: 0.5, marginTop: 1 },
  urgentTitle: { color: C.dark },
  urgentBranch: { color: 'rgba(18,13,46,0.6)' },
  urgentBody: { color: 'rgba(18,13,46,0.75)' },
  title: { fontSize: 16, fontWeight: '800', color: C.textDark, marginBottom: 6 },
  body: { fontSize: 13, color: C.textGray, lineHeight: 19, fontStyle: 'italic', marginBottom: 12 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  count: { fontSize: 12, color: C.textGray, fontWeight: '700' },
  prayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.darkCard, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  prayingBtn: { backgroundColor: 'rgba(18,13,46,0.2)' },
  urgentPrayBtn: { backgroundColor: C.dark },
  prayText: { fontSize: 11, fontWeight: '800', color: C.white, letterSpacing: 0.5 },
  prayTextDark: { color: C.white },
});

// ── Submit Prayer Modal ───────────────────────────────────────────────────────
function SubmitModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [prayerText, setPrayerText] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!prayerText.trim()) { Alert.alert('Required', 'Please enter your prayer request.'); return; }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900)); // Simulate API
    setSubmitting(false);
    setPrayerText(''); setName('');
    onClose();
    Alert.alert('Request Submitted', 'Your prayer request has been received. Our prayer team will intercede for you.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={sm.overlay}>
          <View style={sm.sheet}>
            <View style={sm.handle} />
            <View style={sm.header}>
              <Text style={sm.headerTitle}>Submit Prayer Request</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={C.textGray} />
              </TouchableOpacity>
            </View>
            <Text style={sm.sub}>
              Your request is confidential. Our prayer stewards will stand with you in faith.
            </Text>

            <Text style={sm.label}>YOUR NAME (optional)</Text>
            <TextInput
              style={sm.input}
              value={name}
              onChangeText={setName}
              placeholder="Leave blank to remain anonymous"
              placeholderTextColor={C.textGray}
            />

            <Text style={sm.label}>PRAYER REQUEST *</Text>
            <TextInput
              style={[sm.input, { height: 120, textAlignVertical: 'top' }]}
              value={prayerText}
              onChangeText={setPrayerText}
              placeholder="Share what's on your heart..."
              placeholderTextColor={C.textGray}
              multiline
              autoFocus
            />

            <TouchableOpacity
              style={[sm.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color={C.dark} />
                : <Text style={sm.submitText}>SUBMIT REQUEST</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.textDark },
  sub: { fontSize: 12, color: C.textGray, lineHeight: 18, marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '800', color: C.textGray, letterSpacing: 0.8, marginBottom: 6 },
  input: {
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.textDark, marginBottom: 16,
  },
  submitBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitText: { fontSize: 14, fontWeight: '800', color: C.dark, letterSpacing: 0.8 },
});

// ── My Requests card ──────────────────────────────────────────────────────────
const MY_REQUESTS = [
  { title: 'Healing for Family', sub: '2 DAYS AGO', status: 'active', pct: 0.7 },
  { title: 'New Career Door',    sub: '1MO AGO',    status: 'complete', pct: 1   },
];

function MyRequestsCard() {
  return (
    <View style={mq.card}>
      <View style={mq.header}>
        <Text style={mq.title}>MY REQUESTS</Text>
        <View style={mq.badge}><Text style={mq.badgeText}>{MY_REQUESTS.filter(r => r.status === 'active').length} ACTIVE</Text></View>
      </View>
      {MY_REQUESTS.map((r, i) => (
        <View key={i} style={mq.row}>
          <View style={{ flex: 1 }}>
            <View style={mq.rowTop}>
              <Text style={mq.rowTitle}>{r.title}</Text>
              <Text style={mq.rowSub}>{r.sub}</Text>
            </View>
            <View style={mq.track}>
              <View style={[mq.fill, { width: `${r.pct * 100}%` as any, backgroundColor: r.status === 'complete' ? '#22C55E' : C.accent }]} />
            </View>
            <View style={mq.statusRow}>
              <Ionicons name={r.status === 'complete' ? 'checkmark-circle' : 'ellipse'} size={12} color={r.status === 'complete' ? '#22C55E' : C.accent} />
              <Text style={[mq.statusText, r.status === 'complete' && { color: '#22C55E' }]}>
                {r.status === 'complete' ? 'Answered Praise' : 'ACTIVE'}
              </Text>
            </View>
          </View>
        </View>
      ))}
      <TouchableOpacity style={mq.viewAll} activeOpacity={0.8}>
        <Text style={mq.viewAllText}>VIEW ALL HISTORY</Text>
      </TouchableOpacity>
    </View>
  );
}

const mq = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 12, fontWeight: '800', color: C.textDark, letterSpacing: 0.5 },
  badge: { backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', color: C.dark, letterSpacing: 0.5 },
  row: { marginBottom: 14 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: C.textDark, flex: 1 },
  rowSub: { fontSize: 10, color: C.textGray },
  track: { height: 4, backgroundColor: C.bg, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  fill: { height: 4, borderRadius: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 10, fontWeight: '700', color: C.accent, letterSpacing: 0.5 },
  viewAll: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, alignItems: 'center' },
  viewAllText: { fontSize: 11, fontWeight: '800', color: C.accent, letterSpacing: 0.5 },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PrayerScreen() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(4);

  const handlePray = (id: string) => {
    setPrayedIds((prev) => new Set([...prev, id]));
  };

  const filtered = PRAYER_REQUESTS.filter((p) =>
    !search.trim() ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.body.toLowerCase().includes(search.toLowerCase()),
  );

  const visible = filtered.slice(0, visibleCount);

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Hero */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <View style={s.hero}>
          <Text style={s.heroTitle}>Lifting Voices{'\n'}Together</Text>
          <Text style={s.heroSub}>
            Join our community in faithful intercession. Submit your requests and stand
            in agreement with brothers and sisters across the kingdom.
          </Text>
          <TouchableOpacity style={s.heroBtn} onPress={() => setShowModal(true)} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={18} color={C.dark} />
            <Text style={s.heroBtnText}>SUBMIT PRAYER REQUEST</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* My Requests */}
        <MyRequestsCard />

        {/* Global Impact */}
        <View style={s.impactCard}>
          <Text style={s.impactNum}>12.4k</Text>
          <Ionicons name="trending-up" size={24} color={C.accent} />
          <Text style={s.impactLabel}>Prayers Answered This Month</Text>
        </View>

        {/* Prayer Wall header */}
        <View style={s.wallHeader}>
          <Text style={s.wallTitle}>The Prayer Wall</Text>
          <View style={s.wallActions}>
            <TouchableOpacity style={s.wallIconBtn}>
              <Ionicons name="filter-outline" size={18} color={C.textDark} />
            </TouchableOpacity>
            <TouchableOpacity style={s.wallIconBtn}>
              <Ionicons name="search-outline" size={18} color={C.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        {search !== '' && (
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color={C.textGray} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search prayer requests..."
              placeholderTextColor={C.textGray}
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={C.textGray} />
            </TouchableOpacity>
          </View>
        )}

        {/* Prayer cards */}
        {visible.map((item) => (
          <PrayerCard key={item.id} item={item} onPray={handlePray} />
        ))}

        {/* Load more */}
        {visibleCount < filtered.length && (
          <TouchableOpacity
            style={s.loadMoreBtn}
            onPress={() => setVisibleCount((v) => v + 4)}
            activeOpacity={0.85}
          >
            <Text style={s.loadMoreText}>LOAD MORE REQUESTS  →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <SubmitModal visible={showModal} onClose={() => setShowModal(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  headerBtn: { padding: 4 },
  hero: { paddingHorizontal: 20, paddingBottom: 28, gap: 12 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: C.white, lineHeight: 36 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19 },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14,
    alignSelf: 'flex-start',
  },
  heroBtnText: { fontSize: 13, fontWeight: '800', color: C.dark, letterSpacing: 0.5 },

  impactCard: {
    backgroundColor: C.accent, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
  },
  impactNum: { fontSize: 28, fontWeight: '900', color: C.dark, flex: 1 },
  impactLabel: { fontSize: 12, fontWeight: '700', color: C.dark },

  wallHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  wallTitle: { fontSize: 20, fontWeight: '900', color: C.textDark },
  wallActions: { flexDirection: 'row', gap: 8 },
  wallIconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark },

  loadMoreBtn: { alignItems: 'center', paddingVertical: 16 },
  loadMoreText: { fontSize: 12, fontWeight: '800', color: C.accent, letterSpacing: 0.5 },
});
