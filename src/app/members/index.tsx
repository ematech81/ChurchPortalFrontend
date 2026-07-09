import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
  ScrollView, Modal, Linking, Alert,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { C } from '../../constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  memberId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: string;
  churchRole: string | null;
  photoUrl: string | null;
  membershipCategory: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'member',      label: 'Member' },
  { key: 'worker',      label: 'Worker' },
  { key: 'pastor',      label: 'Pastor' },
  { key: 'minister',    label: 'Minister' },
  { key: 'first_timer', label: 'First Timers' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  member:      { bg: '#DCFCE7', text: '#166534' },
  worker:      { bg: '#EDE9FE', text: '#5B21B6' },
  visitor:     { bg: '#FEF9C3', text: '#854D0E' },
  first_timer: { bg: '#DBEAFE', text: '#1E40AF' },
  minister:    { bg: '#FEF2F2', text: '#991B1B' },
  pastor:      { bg: '#120D2E', text: '#F5C518' },
  new_convert: { bg: '#CCFBF1', text: '#0F766E' },
};

function statusColor(status: string) {
  return STATUS_COLORS[status.toLowerCase()] ?? { bg: C.bg, text: C.textGray };
}

function initials(member: Member) {
  return `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
}

// ── Quick Message Modal ───────────────────────────────────────────────────────

const QUICK_TEMPLATES = [
  'God bless you for worshipping with us today! 🙏',
  'Reminder: Service holds this Sunday at 8am. See you there! 🎉',
  'You are loved. The church prays for you and your family. 💛',
  "Don't forget foundation class this Wednesday at 6pm. God bless!",
  'We missed you at service. We are praying for you! 🙏',
];

type Channel = 'whatsapp' | 'sms' | 'email';

function QuickMessageModal({ visible, member, onClose }: {
  visible: boolean;
  member: Member | null;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !member) return;
    setSending(true);
    try {
      if (channel === 'whatsapp' && member.phone) {
        const phone = member.phone.replace(/\D/g, '');
        await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
        onClose();
        setMessage('');
      } else if (channel === 'sms' && member.phone) {
        await Linking.openURL(`sms:${member.phone}?body=${encodeURIComponent(message)}`);
        onClose();
        setMessage('');
      } else if (channel === 'email' && member.email) {
        const subject = 'Message from Kingdom Portal';
        await Linking.openURL(`mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`);
        onClose();
        setMessage('');
      } else {
        Alert.alert('Missing Contact', channel === 'email' ? 'This member has no email address.' : 'This member has no phone number.');
      }
    } catch {
      Alert.alert('Error', 'Could not open messaging app.');
    } finally { setSending(false); }
  };

  if (!member) return null;

  const CHANNELS: { key: Channel; icon: string; label: string; color: string; available: boolean }[] = [
    { key: 'whatsapp', icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366', available: !!member.phone },
    { key: 'sms',      icon: 'chatbubble',    label: 'SMS',      color: '#0EA5E9', available: !!member.phone },
    { key: 'email',    icon: 'mail',          label: 'Email',    color: '#6366F1', available: !!member.email },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={q.overlay} activeOpacity={1} onPress={onClose}>
        <View style={q.sheet}>
          <View style={q.handle} />

          {/* Recipient */}
          <View style={q.recipient}>
            <View style={q.recipientAvatar}>
              <Text style={q.recipientAvatarText}>
                {`${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={q.recipientName}>{member.firstName} {member.lastName}</Text>
              <Text style={q.recipientSub}>{member.phone ?? member.email ?? 'No contact info'}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={24} color={C.border} />
            </TouchableOpacity>
          </View>

          {/* Channel selector */}
          <Text style={q.label}>Send via</Text>
          <View style={q.channelRow}>
            {CHANNELS.map((ch) => (
              <TouchableOpacity
                key={ch.key}
                style={[q.channelBtn, channel === ch.key && { borderColor: ch.color, backgroundColor: `${ch.color}12` }, !ch.available && q.channelBtnDisabled]}
                onPress={() => ch.available && setChannel(ch.key)}
                activeOpacity={ch.available ? 0.8 : 1}
              >
                <Ionicons name={ch.icon as any} size={20} color={ch.available ? (channel === ch.key ? ch.color : C.textGray) : C.border} />
                <Text style={[q.channelText, channel === ch.key && { color: ch.color, fontWeight: '800' }, !ch.available && { color: C.border }]}>
                  {ch.label}
                </Text>
                {!ch.available && <Text style={q.channelNA}>N/A</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Message input */}
          <Text style={q.label}>Message</Text>
          <TextInput
            style={q.msgInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            placeholderTextColor={C.textGray}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={q.charCount}>{message.length} characters</Text>

          {/* Quick templates */}
          <Text style={q.label}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {QUICK_TEMPLATES.map((t, i) => (
              <TouchableOpacity key={i} style={q.template} onPress={() => setMessage(t)} activeOpacity={0.8}>
                <Text style={q.templateText} numberOfLines={2}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Send */}
          <TouchableOpacity
            style={[q.sendBtn, (!message.trim() || sending) && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
            activeOpacity={0.85}
          >
            {sending
              ? <ActivityIndicator color={C.dark} />
              : <>
                  <Ionicons name={channel === 'whatsapp' ? 'logo-whatsapp' : channel === 'sms' ? 'chatbubble' : 'mail'} size={18} color={C.dark} />
                  <Text style={q.sendBtnText}>
                    Send via {channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'SMS' : 'Email'}
                  </Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Member Card ───────────────────────────────────────────────────────────────

function MemberCard({ member, onPress, onMessage }: {
  member: Member; onPress: () => void; onMessage: () => void;
}) {
  const col = statusColor(member.status);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials(member)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardName}>{member.firstName} {member.lastName}</Text>
        {member.memberId && (
          <Text style={s.cardId}>{member.memberId}</Text>
        )}
        <View style={[s.statusBadge, { backgroundColor: col.bg }]}>
          <Text style={[s.statusText, { color: col.text }]}>
            {member.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={s.msgBtn} onPress={onMessage} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses" size={18} color={C.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MembersScreen() {
  const router = useRouter();
  const viewerRole = (useAuthStore((s) => s.user)?.role ?? '').toLowerCase();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [messagingMember, setMessagingMember] = useState<Member | null>(null);

  const fetchMembers = useCallback(async (q = search, filter = activeFilter) => {
    try {
      const params: Record<string, string> = {};
      if (q) params.search = q;
      if (filter !== 'all') params.status = filter;
      const res = await api.get('/members', { params });
      setMembers(res.data);
    } catch {
      // keep existing list on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, activeFilter]);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/members/count');
      setTotal(typeof res.data === 'number' ? res.data : res.data?.count ?? 0);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
      fetchCount();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onSearch = (text: string) => {
    setSearch(text);
    fetchMembers(text, activeFilter);
  };

  const onFilter = (key: string) => {
    setActiveFilter(key);
    fetchMembers(search, key);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMembers();
    fetchCount();
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
            <Text style={s.headerTitle}>People & Membership</Text>
            <Text style={s.headerSub}>{total} total members</Text>
          </View>
          <TouchableOpacity style={s.headerIconBtn}>
            <Ionicons name="options-outline" size={22} color={C.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color={C.textGray} />
          <TextInput
            style={s.searchInput}
            placeholder="Search members or phone..."
            placeholderTextColor={C.textGray}
            value={search}
            onChangeText={onSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearch('')}>
              <Ionicons name="close-circle" size={18} color={C.textGray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={{ flexGrow: 0 }}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, activeFilter === f.key && s.chipActive]}
              onPress={() => onFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, activeFilter === f.key && s.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        ) : members.length === 0 ? (
          <View style={s.centered}>
            <Ionicons name="people-outline" size={52} color={C.border} />
            <Text style={s.emptyTitle}>No members found</Text>
            <Text style={s.emptySub}>
              {search ? 'Try a different search term' : 'Tap + to register your first member'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
            renderItem={({ item }) => (
              <MemberCard
                member={item}
                onPress={() => router.push({ pathname: '/members/[id]', params: { id: item.id } } as any)}
                onMessage={() => setMessagingMember(item)}
              />
            )}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/members/add' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={30} color={C.dark} />
        </TouchableOpacity>
      </View>

      <QuickMessageModal
        visible={!!messagingMember}
        member={messagingMember}
        onClose={() => setMessagingMember(null)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  headerIconBtn: { padding: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, marginHorizontal: 16, marginTop: 16, marginBottom: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 4, paddingRight: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, alignSelf: 'flex-start' },
  chipActive: { backgroundColor: C.dark, borderColor: C.dark },
  chipText: { fontSize: 13, fontWeight: '600', color: C.textGray },
  chipTextActive: { color: C.white },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10, gap: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: C.accent },
  cardName: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 2 },
  cardId: { fontSize: 11, color: C.textGray, marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  msgBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center', paddingHorizontal: 32 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
});

const q = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  recipient: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg, borderRadius: 14, padding: 14, marginBottom: 16 },
  recipientAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  recipientAvatarText: { fontSize: 16, fontWeight: '800', color: C.accent },
  recipientName: { fontSize: 15, fontWeight: '800', color: C.textDark },
  recipientSub: { fontSize: 12, color: C.textGray, marginTop: 2 },
  label: { fontSize: 11, fontWeight: '800', color: C.textDark, letterSpacing: 0.5, marginBottom: 8 },
  channelRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  channelBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: C.border },
  channelBtnDisabled: { opacity: 0.4 },
  channelText: { fontSize: 11, fontWeight: '700', color: C.textGray },
  channelNA: { fontSize: 9, color: C.border, fontWeight: '700' },
  msgInput: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark, minHeight: 100 },
  charCount: { fontSize: 10, color: C.textGray, textAlign: 'right', marginTop: 4, marginBottom: 10 },
  template: { backgroundColor: C.bg, borderRadius: 10, padding: 10, marginRight: 8, width: 180, borderWidth: 1, borderColor: C.border },
  templateText: { fontSize: 11, color: C.textDark, lineHeight: 17 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  sendBtnText: { fontSize: 14, fontWeight: '800', color: C.dark },
});
