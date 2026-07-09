import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  dark: '#120D2E', darkCard: '#1E1650', navy: '#1A2B5C',
  accent: '#F5C518', bg: '#F2F2F7', white: '#FFFFFF',
  textDark: '#120D2E', textGray: '#8888A0', border: '#E8E8EF',
};

const BROWSE_CARDS = [
  { label: 'Series',   sub: 'Thematic journeys through scripture.',     bg: C.darkCard, textColor: C.white, badgeColor: C.accent   },
  { label: 'Speakers', sub: 'Messages from our anointed leadership.',   bg: C.accent,   textColor: C.dark,  badgeColor: C.dark     },
  { label: 'Topics',   sub: 'Find guidance on specific life themes.',   bg: '#E8E8EF',  textColor: C.dark,  badgeColor: C.darkCard },
];

const RECENT_SERMONS = [
  {
    id: '1',
    badge: 'SERIES: FOUNDATIONS OF GRACE',
    title: 'Walking in Divine Purpose',
    speaker: 'Apostle John Mark',
    date: 'Oct 22, 2023',
    duration: '45 min',
  },
  {
    id: '2',
    badge: 'TOPIC: STEWARDSHIP',
    title: 'Redeeming the Time',
    speaker: 'Pastor Sarah Evans',
    date: 'Oct 15, 2023',
    duration: '38 min',
  },
  {
    id: '3',
    badge: 'SERIES: OVERCOMING',
    title: 'Strength in the Storm',
    speaker: 'Bishop David Cole',
    date: 'Oct 08, 2023',
    duration: '52 min',
  },
  {
    id: '4',
    badge: 'TOPIC: FAITH',
    title: 'The Authority of Faith',
    speaker: 'Senior Pastor Marcus Throne',
    date: 'Oct 01, 2023',
    duration: '61 min',
  },
];

// ── Browse card ───────────────────────────────────────────────────────────────
function BrowseCard({ item, onPress }: { item: typeof BROWSE_CARDS[0]; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[bc.card, { backgroundColor: item.bg }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[bc.badge, { backgroundColor: item.badgeColor }]}>
        <Text style={[bc.badgeText, { color: item.textColor === C.dark ? C.white : C.dark }]}>
          {item.label === 'Series' ? 'EXPLORE BY' : item.label === 'Speakers' ? 'BROWSE BY' : 'FILTER BY'}
        </Text>
      </View>
      <Text style={[bc.label, { color: item.textColor }]}>{item.label}</Text>
      <Text style={[bc.sub, { color: item.textColor === C.dark ? 'rgba(18,13,46,0.6)' : 'rgba(255,255,255,0.55)' }]}>
        {item.sub}
      </Text>
    </TouchableOpacity>
  );
}
const bc = StyleSheet.create({
  card: { borderRadius: 16, padding: 18, marginBottom: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  label: { fontSize: 26, fontWeight: '900', marginBottom: 6 },
  sub: { fontSize: 13, lineHeight: 18 },
});

// ── Sermon card ───────────────────────────────────────────────────────────────
function SermonCard({ sermon, onPress, onBookmark }: {
  sermon: typeof RECENT_SERMONS[0];
  onPress: () => void;
  onBookmark: () => void;
}) {
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <TouchableOpacity style={sc.card} onPress={onPress} activeOpacity={0.9}>
      {/* Thumbnail placeholder */}
      <View style={sc.thumb}>
        <View style={sc.playBtn}>
          <Ionicons name="play" size={22} color={C.dark} />
        </View>
        <Text style={sc.thumbLabel} numberOfLines={2}>{sermon.title}</Text>
      </View>

      <View style={sc.body}>
        <View style={sc.badgeWrap}>
          <Text style={sc.badge}>{sermon.badge}</Text>
        </View>
        <Text style={sc.title}>{sermon.title}</Text>

        <View style={sc.metaRow}>
          <Ionicons name="person-outline" size={12} color={C.textGray} />
          <Text style={sc.meta}>{sermon.speaker}</Text>
        </View>
        <View style={sc.metaRow}>
          <Ionicons name="calendar-outline" size={12} color={C.textGray} />
          <Text style={sc.meta}>{sermon.date}</Text>
          <View style={sc.dot} />
          <Ionicons name="time-outline" size={12} color={C.textGray} />
          <Text style={sc.meta}>{sermon.duration}</Text>
        </View>

        <View style={sc.actions}>
          <TouchableOpacity
            style={sc.iconBtn}
            onPress={() => { setBookmarked(!bookmarked); onBookmark(); }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={bookmarked ? C.accent : C.textGray}
            />
          </TouchableOpacity>
          <TouchableOpacity style={sc.iconBtn} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={18} color={C.textGray} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  thumb: {
    height: 140, backgroundColor: C.darkCard,
    alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbLabel: {
    position: 'absolute', bottom: 10, left: 12, right: 12,
    fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center',
  },
  body: { padding: 14 },
  badgeWrap: { marginBottom: 6 },
  badge: { fontSize: 9, fontWeight: '800', color: C.textGray, letterSpacing: 0.6 },
  title: { fontSize: 16, fontWeight: '800', color: C.textDark, marginBottom: 8, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  meta: { fontSize: 12, color: C.textGray },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.border, marginHorizontal: 2 },
  actions: { flexDirection: 'row', gap: 4, marginTop: 10 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SermonsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = RECENT_SERMONS.filter((s) =>
    !search.trim() ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.speaker.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Spiritual Hub: Sermons</Text>
          </View>
          <TouchableOpacity style={s.headerBtn}>
            <Ionicons name="search" size={20} color={C.white} />
          </TouchableOpacity>
        </View>
        <Text style={s.headerSub}>
          Explore the wisdom of the Kingdom through our curated library of teachings,
          series, and spiritual insights.
        </Text>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color={C.textGray} />
          <TextInput
            style={s.searchInput}
            placeholder="Search title, speaker, or topic..."
            placeholderTextColor={C.textGray}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={C.textGray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Browse by */}
        {!search && (
          <>
            {BROWSE_CARDS.map((item) => (
              <BrowseCard key={item.label} item={item} onPress={() => {}} />
            ))}
          </>
        )}

        {/* Recent Sermons */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{search ? 'SEARCH RESULTS' : 'RECENT SERMONS'}</Text>
          {!search && (
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={s.viewArchive}>View Archive  →</Text>
            </TouchableOpacity>
          )}
        </View>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={40} color={C.border} />
            <Text style={s.emptyText}>No sermons found</Text>
          </View>
        ) : (
          filtered.map((sermon) => (
            <SermonCard
              key={sermon.id}
              sermon={sermon}
              onPress={() => {}}
              onBookmark={() => {}}
            />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={C.dark} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17,
    paddingHorizontal: 20, paddingBottom: 14,
  },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.textDark, letterSpacing: 0.5 },
  viewArchive: { fontSize: 12, fontWeight: '700', color: C.accent },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 14, color: C.textGray },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
});
