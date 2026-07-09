import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  StatusBar, ScrollView, Alert, ActivityIndicator, Linking,
  FlatList,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

interface MessageLog {
  id: string; channel: string; recipientPhone: string; body: string;
  status: string; sentAt: string | null; createdAt: string;
}

const AUDIENCE_OPTIONS = [
  { key: 'all',         label: 'All Members',       icon: 'people',          filter: {} },
  { key: 'workers',     label: 'Workers Only',       icon: 'construct',       filter: { status: 'worker' } },
  { key: 'new_convert', label: 'New Converts',       icon: 'heart',           filter: { status: 'new_convert' } },
  { key: 'first_timer', label: 'First Timers',       icon: 'star',            filter: { status: 'first_timer' } },
  { key: 'ministers',   label: 'Ministers',          icon: 'ribbon',          filter: { status: 'minister' } },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  sent:     { bg: '#DCFCE7', text: '#166534' },
  queued:   { bg: '#FEF9C3', text: '#854D0E' },
  failed:   { bg: '#FEF2F2', text: '#991B1B' },
};

function fmtTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function CommunicationScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  const [audience, setAudience] = useState('all');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/messaging/logs');
      setLogs(res.data ?? []);
    } catch { setLogs([]); }
    finally { setLogsLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    if (tab === 'history') fetchLogs();
  }, [tab]));

  const handleSend = async () => {
    if (!message.trim()) { Alert.alert('Required', 'Please enter a message.'); return; }

    const ao = AUDIENCE_OPTIONS.find((o) => o.key === audience);

    Alert.alert(
      'Send Message',
      `Send via ${channel.toUpperCase()} to "${ao?.label}"?\n\nMessage: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: async () => {
          setSending(true);
          try {
            // Fetch recipients
            const params: any = { limit: 500, ...ao?.filter };
            const res = await api.get('/members', { params });
            const members: Array<{ phone: string; id: string }> = res.data;

            if (members.length === 0) { Alert.alert('No recipients', 'No members match this audience.'); return; }

            if (channel === 'whatsapp') {
              // For dev: open WhatsApp with the first recipient as demo
              // In production, Termii sends bulk
              const phone = members[0]?.phone?.replace(/\D/g, '');
              const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
              await Linking.openURL(url);
              Alert.alert('WhatsApp Opened', `Bulk sending to ${members.length} members would use Termii in production.`);
            } else {
              // Try backend SMS endpoint
              await api.post('/messaging/send-bulk', {
                memberIds: members.map((m) => m.id),
                channel,
                body: message,
              });
              Alert.alert('Sent', `Message sent to ${members.length} members.`);
            }
            setMessage('');
          } catch {
            Alert.alert('Info', 'SMS gateway requires Termii credentials. Configure in .env to enable bulk sending.');
          } finally { setSending(false); }
        }},
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
          <View>
            <Text style={s.headerTitle}>Communication</Text>
            <Text style={s.headerSub}>WhatsApp · SMS · Broadcast</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {(['compose', 'history'] as const).map((t) => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => { setTab(t); if (t === 'history') fetchLogs(); }} activeOpacity={0.8}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === 'compose' ? 'Compose' : 'Message History'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {tab === 'compose' ? (
        <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Channel */}
          <Text style={s.sectionLabel}>Channel</Text>
          <View style={s.channelRow}>
            {(['whatsapp', 'sms'] as const).map((ch) => (
              <TouchableOpacity key={ch} style={[s.channelChip, channel === ch && s.channelChipActive]} onPress={() => setChannel(ch)} activeOpacity={0.8}>
                <Ionicons name={ch === 'whatsapp' ? 'logo-whatsapp' : 'chatbubble-ellipses'} size={16} color={channel === ch ? C.white : C.textGray} />
                <Text style={[s.channelChipText, channel === ch && { color: C.white }]}>{ch === 'whatsapp' ? 'WhatsApp' : 'SMS'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Audience */}
          <Text style={s.sectionLabel}>Audience</Text>
          <View style={s.audienceGrid}>
            {AUDIENCE_OPTIONS.map((ao) => (
              <TouchableOpacity key={ao.key} style={[s.audienceChip, audience === ao.key && s.audienceChipActive]} onPress={() => setAudience(ao.key)} activeOpacity={0.8}>
                <Ionicons name={ao.icon as any} size={14} color={audience === ao.key ? C.dark : C.textGray} />
                <Text style={[s.audienceChipText, audience === ao.key && { color: C.dark }]}>{ao.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <Text style={s.sectionLabel}>Message</Text>
          <TextInput
            style={s.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message here..."
            placeholderTextColor={C.textGray}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{message.length} characters</Text>

          {/* Quick templates */}
          <Text style={s.sectionLabel}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {[
              'Dear {name}, God bless you for worshipping with us today! 🙏',
              'Reminder: Service holds this Sunday at 8am. See you there! 🎉',
              'You are loved. The church prays for you and your family. 💛',
              "Don't forget foundation class this Wednesday at 6pm. God bless!",
            ].map((t, i) => (
              <TouchableOpacity key={i} style={s.template} onPress={() => setMessage(t)} activeOpacity={0.8}>
                <Text style={s.templateText} numberOfLines={2}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Send button */}
          <TouchableOpacity style={[s.sendBtn, sending && { opacity: 0.7 }]} onPress={handleSend} disabled={sending} activeOpacity={0.85}>
            {sending ? <ActivityIndicator color={C.dark} /> : (
              <>
                <Ionicons name={channel === 'whatsapp' ? 'logo-whatsapp' : 'send'} size={20} color={C.dark} />
                <Text style={s.sendBtnText}>Send {channel === 'whatsapp' ? 'via WhatsApp' : 'SMS'}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        logsLoading ? (
          <View style={[s.centered, { backgroundColor: C.bg }]}><ActivityIndicator color={C.accent} /></View>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(l) => l.id}
            style={{ flex: 1, backgroundColor: C.bg }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            renderItem={({ item: log }) => {
              const sc = STATUS_COLORS[log.status] ?? { bg: C.bg, text: C.textGray };
              return (
                <View style={s.logRow}>
                  <Ionicons name={log.channel === 'whatsapp' ? 'logo-whatsapp' : 'chatbubble-ellipses'} size={20} color={log.channel === 'whatsapp' ? '#25D366' : C.dark} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.logPhone}>{log.recipientPhone}</Text>
                    <Text style={s.logBody} numberOfLines={2}>{log.body}</Text>
                    <Text style={s.logTime}>{fmtTime(log.sentAt ?? log.createdAt)}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusBadgeText, { color: sc.text }]}>{log.status.toUpperCase()}</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={<View style={[s.centered, { paddingVertical: 60 }]}><Ionicons name="chatbubbles-outline" size={48} color={C.border} /><Text style={s.emptyTitle}>No messages sent yet</Text></View>}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.bg }} />}
          />
        )
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 0, gap: 6 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  tabActive: { backgroundColor: C.accent },
  tabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: C.dark },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: C.textDark, letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  channelRow: { flexDirection: 'row', gap: 10 },
  channelChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  channelChipActive: { backgroundColor: C.dark, borderColor: C.dark },
  channelChipText: { fontSize: 14, fontWeight: '700', color: C.textGray },
  audienceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  audienceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  audienceChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  audienceChipText: { fontSize: 12, fontWeight: '600', color: C.textGray },
  messageInput: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: C.textDark, minHeight: 130 },
  charCount: { fontSize: 11, color: C.textGray, textAlign: 'right', marginTop: 4, marginBottom: 4 },
  template: { backgroundColor: C.white, borderRadius: 12, padding: 12, marginRight: 10, width: 200, borderWidth: 1.5, borderColor: C.border },
  templateText: { fontSize: 12, color: C.textDark, lineHeight: 18 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 17, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  sendBtnText: { fontSize: 15, fontWeight: '800', color: C.dark },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white },
  logPhone: { fontSize: 13, fontWeight: '700', color: C.textDark },
  logBody: { fontSize: 12, color: C.textGray, marginTop: 2, marginBottom: 2 },
  logTime: { fontSize: 10, color: C.textGray },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  emptyTitle: { fontSize: 15, color: C.textGray },
});
