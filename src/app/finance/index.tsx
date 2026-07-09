import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

interface GivingRecord {
  id: string; fund: string; amount: number; currency: string;
  date: string; reference: string | null; notes: string | null; isAnonymous: boolean;
  member: { id: string; firstName: string; lastName: string } | null;
}

interface MonthlySummary {
  byFund: Array<{ fund: string; total: string; count: string }>;
  grandTotal: number;
}

const FUNDS = ['tithe', 'offering', 'building', 'missions', 'welfare', 'seed', 'pledge', 'other'];

const FUND_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  tithe:    { bg: '#DBEAFE', text: '#1E40AF', icon: 'heart' },
  offering: { bg: '#DCFCE7', text: '#166534', icon: 'gift' },
  building: { bg: '#FEF9C3', text: '#854D0E', icon: 'business' },
  missions: { bg: '#EDE9FE', text: '#5B21B6', icon: 'globe' },
  welfare:  { bg: '#FEF2F2', text: '#991B1B', icon: 'people' },
  seed:     { bg: '#CCFBF1', text: '#0F766E', icon: 'leaf' },
  pledge:   { bg: '#FFF7ED', text: '#C2410C', icon: 'document' },
  other:    { bg: C.bg,      text: C.textGray, icon: 'ellipsis-horizontal' },
};

function fmtAmount(amount: number, currency = 'NGN') {
  return `${currency} ${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RecordGivingModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [fund, setFund] = useState('tithe');
  const [amount, setAmount] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);
  const [memberResults, setMemberResults] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const searchMember = async (text: string) => {
    setMemberSearch(text);
    setSelectedMember(null);
    if (!text.trim()) { setMemberResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get('/members', { params: { search: text } });
      setMemberResults(res.data.slice(0, 5));
    } catch { } finally { setSearching(false); }
  };

  const reset = () => { setFund('tithe'); setAmount(''); setMemberSearch(''); setSelectedMember(null); setMemberResults([]); setReference(''); setNotes(''); };

  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount))) { Alert.alert('Required', 'Enter a valid amount.'); return; }
    setSaving(true);
    try {
      await api.post('/giving', {
        fund, amount: parseFloat(amount),
        memberId: selectedMember?.id ?? null,
        isAnonymous: !selectedMember,
        date: new Date().toISOString(),
        reference: reference || null,
        notes: notes || null,
      });
      reset(); onSaved();
    } catch { Alert.alert('Error', 'Failed to record giving.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Record Giving</Text>

          {/* Fund selector */}
          <Text style={s.fieldLabel}>Fund Type</Text>
          <View style={s.fundGrid}>
            {FUNDS.map((f) => {
              const fc = FUND_COLORS[f];
              return (
                <TouchableOpacity key={f} style={[s.fundChip, fund === f && { backgroundColor: C.dark, borderColor: C.dark }]} onPress={() => setFund(f)} activeOpacity={0.8}>
                  <Ionicons name={fc.icon as any} size={13} color={fund === f ? C.accent : fc.text} />
                  <Text style={[s.fundChipText, fund === f && { color: C.white }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount */}
          <Text style={s.fieldLabel}>Amount (NGN) *</Text>
          <TextInput style={s.fieldInput} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={C.textGray} keyboardType="decimal-pad" />

          {/* Member search */}
          <Text style={s.fieldLabel}>Member (optional)</Text>
          {selectedMember ? (
            <View style={s.selectedMember}>
              <Text style={s.selectedMemberName}>{selectedMember.name}</Text>
              <TouchableOpacity onPress={() => { setSelectedMember(null); setMemberSearch(''); }}>
                <Ionicons name="close-circle" size={20} color={C.textGray} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.memberSearchRow}>
                <Ionicons name="search" size={16} color={C.textGray} />
                <TextInput style={s.memberSearchInput} value={memberSearch} onChangeText={searchMember} placeholder="Search member name..." placeholderTextColor={C.textGray} />
                {searching && <ActivityIndicator size="small" color={C.accent} />}
              </View>
              {memberResults.map((m) => (
                <TouchableOpacity key={m.id} style={s.memberResult} onPress={() => { setSelectedMember({ id: m.id, name: `${m.firstName} ${m.lastName}` }); setMemberResults([]); setMemberSearch(''); }}>
                  <Text style={s.memberResultName}>{m.firstName} {m.lastName}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Reference & Notes */}
          <Text style={s.fieldLabel}>Reference / Receipt No.</Text>
          <TextInput style={s.fieldInput} value={reference} onChangeText={setReference} placeholder="Optional" placeholderTextColor={C.textGray} />

          <View style={s.modalActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { reset(); onClose(); }} activeOpacity={0.8}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color={C.dark} size="small" /> : <Text style={s.saveText}>Record Giving</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function FinanceScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<GivingRecord[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        api.get('/giving'),
        api.get('/giving/summary/month'),
      ]);
      setRecords(rRes.data);
      setSummary(sRes.data);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Finance & Giving</Text>
            <Text style={s.headerSub}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowModal(true)} style={s.addBtn}>
            <Ionicons name="add" size={22} color={C.dark} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={[s.centered, { backgroundColor: C.bg }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={C.accent} />}
          ListHeaderComponent={
            <View style={{ padding: 16 }}>
              {/* Monthly total card */}
              <View style={s.totalCard}>
                <Text style={s.totalLabel}>THIS MONTH'S TOTAL</Text>
                <Text style={s.totalAmount}>{fmtAmount(summary?.grandTotal ?? 0)}</Text>
                <View style={s.fundBreakdown}>
                  {summary?.byFund.slice(0, 4).map((f) => {
                    const fc = FUND_COLORS[f.fund] ?? FUND_COLORS.other;
                    return (
                      <View key={f.fund} style={[s.fundBadge, { backgroundColor: fc.bg }]}>
                        <Text style={[s.fundBadgeText, { color: fc.text }]}>{f.fund.toUpperCase()}</Text>
                        <Text style={[s.fundBadgeAmt, { color: fc.text }]}>{fmtAmount(parseFloat(f.total))}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <Text style={s.listLabel}>RECENT RECORDS</Text>
            </View>
          }
          renderItem={({ item: r }) => {
            const fc = FUND_COLORS[r.fund] ?? FUND_COLORS.other;
            return (
              <View style={s.recordRow}>
                <View style={[s.fundDot, { backgroundColor: fc.bg }]}>
                  <Ionicons name={fc.icon as any} size={16} color={fc.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.recordName}>
                    {r.isAnonymous ? 'Anonymous' : (r.member ? `${r.member.firstName} ${r.member.lastName}` : 'Unknown')}
                  </Text>
                  <Text style={s.recordMeta}>{r.fund.toUpperCase()} · {fmtDate(r.date)}</Text>
                </View>
                <Text style={s.recordAmount}>{fmtAmount(r.amount, r.currency)}</Text>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.bg, marginHorizontal: 16 }} />}
          ListEmptyComponent={<View style={[s.centered, { paddingVertical: 40 }]}><Ionicons name="wallet-outline" size={48} color={C.border} /><Text style={s.emptyTitle}>No giving records yet</Text><Text style={s.emptySub}>Tap + to record the first giving</Text></View>}
        />
      )}

      <RecordGivingModal visible={showModal} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchData(); }} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  addBtn: { marginLeft: 'auto', width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  totalCard: { backgroundColor: C.dark, borderRadius: 16, padding: 20, marginBottom: 16 },
  totalLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2, marginBottom: 6 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: C.white, marginBottom: 14 },
  fundBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fundBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  fundBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  fundBadgeAmt: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  listLabel: { fontSize: 11, fontWeight: '800', color: C.textGray, letterSpacing: 1.2, marginBottom: 4 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: C.white },
  fundDot: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recordName: { fontSize: 14, fontWeight: '700', color: C.textDark },
  recordMeta: { fontSize: 11, color: C.textGray, marginTop: 2 },
  recordAmount: { fontSize: 14, fontWeight: '800', color: C.textDark },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.textDark, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.textDark, marginBottom: 6, marginTop: 12 },
  fieldInput: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark },
  fundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fundChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  fundChipText: { fontSize: 12, fontWeight: '600', color: C.textDark },
  memberSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  memberSearchInput: { flex: 1, fontSize: 14, color: C.textDark },
  memberResult: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.bg },
  memberResultName: { fontSize: 14, color: C.textDark },
  selectedMember: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.accentFaint, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  selectedMemberName: { fontSize: 14, fontWeight: '700', color: C.textDark },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.border },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.textGray },
  saveBtn: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: C.accent },
  saveText: { fontSize: 14, fontWeight: '800', color: C.dark },
});
