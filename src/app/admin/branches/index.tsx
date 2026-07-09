import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Alert, Modal,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { C } from '../../../constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Branch {
  id: string; name: string; address: string | null; city: string | null;
  phone: string | null; memberCount: number; workerCount?: number;
  pastor: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
}

interface Pastor {
  id: string; firstName: string; lastName: string; email: string; churchId: string | null;
}

type Tab = 'directory' | 'analytics' | 'add';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2);
}

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

// ── Branch Card (Directory tab) ───────────────────────────────────────────────

function BranchCard({
  branch, isTop, onPress, onManage, onDelete,
}: {
  branch: Branch; isTop: boolean; onPress: () => void; onManage: () => void; onDelete: () => void;
}) {
  const hasPastor = !!branch.pastor;
  const pastorName = hasPastor
    ? `${branch.pastor!.firstName} ${branch.pastor!.lastName}`
    : 'Unassigned';

  return (
    <TouchableOpacity style={d.card} onPress={onPress} activeOpacity={0.88}>
      {/* Type badge */}
      <View style={[d.typeBadge, isTop && d.typeBadgeTop]}>
        <Text style={[d.typeBadgeText, isTop && d.typeBadgeTextTop]}>
          {isTop ? 'MAIN CHURCH' : 'BRANCH'}
        </Text>
      </View>

      {/* Branch name — large, bold, white */}
      <Text style={d.branchName} numberOfLines={2}>{branch.name}</Text>

      {/* Location */}
      {(branch.city || branch.address) && (
        <View style={d.locationRow}>
          <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.5)" />
          <Text style={d.locationText} numberOfLines={1}>
            {[branch.address, branch.city].filter(Boolean).join(', ')}
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={d.divider} />

      {/* Pastor + Members */}
      <View style={d.statsRow}>
        <View style={d.statBlock}>
          <Text style={d.statLabel}>LEAD PASTOR</Text>
          <View style={d.pastorRow}>
            <View style={[d.pastorAvatar, !hasPastor && d.pastorAvatarEmpty]}>
              {hasPastor
                ? <Text style={d.pastorAvatarText}>{initials(pastorName)}</Text>
                : <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.4)" />}
            </View>
            <Text style={[d.pastorName, !hasPastor && d.pastorNameEmpty]} numberOfLines={2}>
              {pastorName}
            </Text>
          </View>
        </View>

        <View style={d.statDivider} />

        <View style={d.statBlock}>
          <Text style={d.statLabel}>MEMBERS</Text>
          <View style={d.memberRow}>
            <Ionicons name="people" size={16} color={C.accent} />
            <Text style={d.memberCount}>{branch.memberCount.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* CTA buttons */}
      <View style={d.btnRow}>
        <TouchableOpacity style={d.manageBtn} onPress={onManage} activeOpacity={0.85}>
          <Text style={d.manageBtnText}>MANAGE BRANCH</Text>
        </TouchableOpacity>
        <TouchableOpacity style={d.deleteBtn} onPress={onDelete} activeOpacity={0.75}>
          <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ visible, branch, onClose, onSave }: {
  visible: boolean; branch: Branch | null;
  onClose: () => void;
  onSave: (data: { name: string; address?: string; city?: string; phone?: string }) => Promise<void>;
}) {
  const [name, setName] = useState(branch?.name ?? '');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [city, setCity] = useState(branch?.city ?? '');
  const [phone, setPhone] = useState(branch?.phone ?? '');
  const [saving, setSaving] = useState(false);

  // Sync when branch changes
  useMemo(() => {
    setName(branch?.name ?? '');
    setAddress(branch?.address ?? '');
    setCity(branch?.city ?? '');
    setPhone(branch?.phone ?? '');
  }, [branch?.id]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Branch name is required.'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), address: address || undefined, city: city || undefined, phone: phone || undefined });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to save branch.');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
        <View style={m.sheet}>
          <View style={m.handle} />
          <Text style={m.title}>Edit Branch</Text>

          {[
            { label: 'Branch Name *', value: name, set: setName, ph: 'e.g. Lagos Island Branch' },
            { label: 'City', value: city, set: setCity, ph: 'e.g. Lagos' },
            { label: 'Address', value: address, set: setAddress, ph: 'Street address' },
            { label: 'Phone', value: phone, set: setPhone, ph: '+234 800 000 0000', kb: 'phone-pad' },
          ].map((f) => (
            <View key={f.label} style={{ marginBottom: 14 }}>
              <Text style={m.label}>{f.label}</Text>
              <TextInput
                style={m.input} value={f.value} onChangeText={f.set}
                placeholder={f.ph} placeholderTextColor={C.textGray}
                keyboardType={(f as any).kb ?? 'default'}
              />
            </View>
          ))}

          <View style={m.actions}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[m.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={C.dark} size="small" /> : <Text style={m.saveText}>Update</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Pastor Picker Modal ───────────────────────────────────────────────────────

function PastorPickerModal({ visible, pastors, onSelect, onClose }: {
  visible: boolean; pastors: Pastor[];
  onSelect: (p: Pastor | null) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
        <View style={m.sheet}>
          <View style={m.handle} />
          <Text style={m.title}>Select Lead Pastor</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={m.pastorRow} onPress={() => { onSelect(null); onClose(); }}>
              <View style={[m.pastorAvatar, { backgroundColor: C.border }]}>
                <Ionicons name="person-outline" size={16} color={C.textGray} />
              </View>
              <Text style={[m.pastorName, { color: C.textGray }]}>No pastor (assign later)</Text>
            </TouchableOpacity>
            {pastors.map((p) => (
              <TouchableOpacity key={p.id} style={m.pastorRow} onPress={() => { onSelect(p); onClose(); }}>
                <View style={m.pastorAvatar}>
                  <Text style={m.pastorAvatarText}>{initials(`${p.firstName} ${p.lastName}`)}</Text>
                </View>
                <View>
                  <Text style={m.pastorName}>{p.firstName} {p.lastName}</Text>
                  <Text style={m.pastorEmail}>{p.email}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {pastors.length === 0 && (
              <Text style={{ textAlign: 'center', color: C.textGray, padding: 20 }}>
                No pastors available. They must log in via phone OTP first.
              </Text>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Add Branch Tab ────────────────────────────────────────────────────────────

function AddBranchTab({ pastors, onCreated }: { pastors: Pastor[]; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPastor, setSelectedPastor] = useState<Pastor | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState('');

  const reset = () => { setName(''); setAddress(''); setPhone(''); setSelectedPastor(null); };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Branch name is required.'); return; }
    setSaving(true);
    try {
      const res = await api.post('/churches/branch', {
        name: name.trim(),
        address: address || undefined,
        phone: phone || undefined,
      });
      if (selectedPastor && res.data?.id) {
        await api.patch(`/churches/pastors/${selectedPastor.id}/assign`, { branchId: res.data.id });
      }
      Alert.alert('Branch Created', `"${name}" has been added to your ministry network.`, [
        { text: 'OK', onPress: () => { reset(); onCreated(); } },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'Failed to create branch.');
    } finally { setSaving(false); }
  };

  const fi = (f: string) => [a.input, focused === f && a.inputFocused];

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={a.heading}>New Branch{'\n'}Registration</Text>
      <Text style={a.subheading}>
        Expand the kingdom by establishing a new focal point of ministry and community service.
      </Text>

      {/* Branch Name */}
      <Text style={a.label}>Branch Name</Text>
      <TextInput
        style={fi('name') as any}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Grace Cathedral South"
        placeholderTextColor={C.textGray}
        onFocus={() => setFocused('name')}
        onBlur={() => setFocused('')}
      />

      {/* Lead Pastor */}
      <Text style={a.label}>Lead Pastor</Text>
      <TouchableOpacity
        style={[a.pickerBtn, focused === 'pastor' && a.inputFocused]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <Text style={selectedPastor ? a.pickerValue : a.pickerPlaceholder}>
          {selectedPastor ? `${selectedPastor.firstName} ${selectedPastor.lastName}` : 'Select an ordained leader'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.textGray} />
      </TouchableOpacity>

      {/* Physical Address */}
      <Text style={a.label}>Physical Address</Text>
      <TextInput
        style={[fi('address') as any, { minHeight: 90, textAlignVertical: 'top' }]}
        value={address}
        onChangeText={setAddress}
        placeholder="Enter full street address, city, and zip code"
        placeholderTextColor={C.textGray}
        multiline
        onFocus={() => setFocused('address')}
        onBlur={() => setFocused('')}
      />

      {/* Map placeholder */}
      <View style={a.mapPlaceholder}>
        <View style={a.mapPin}>
          <Ionicons name="location" size={28} color={C.dark} />
        </View>
        <Text style={a.mapText}>Map preview unavailable</Text>
      </View>

      {/* Phone */}
      <Text style={a.label}>Primary Phone</Text>
      <View style={[a.phoneWrap, focused === 'phone' && a.inputFocused]}>
        <Ionicons name="call-outline" size={16} color={C.textGray} />
        <TextInput
          style={a.phoneInput}
          value={phone}
          onChangeText={setPhone}
          placeholder="+234 (800) 000-0000"
          placeholderTextColor={C.textGray}
          keyboardType="phone-pad"
          onFocus={() => setFocused('phone')}
          onBlur={() => setFocused('')}
        />
      </View>

      {/* Create button */}
      <TouchableOpacity
        style={[a.createBtn, saving && { opacity: 0.7 }]}
        onPress={handleCreate}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color={C.dark} />
          : <Text style={a.createBtnText}>CREATE BRANCH</Text>
        }
      </TouchableOpacity>
      <Text style={a.disclaimer}>
        Action will create a new ministry node in the global database.
      </Text>

      <PastorPickerModal
        visible={showPicker}
        pastors={pastors}
        onSelect={setSelectedPastor}
        onClose={() => setShowPicker(false)}
      />
    </ScrollView>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ branches, router }: { branches: Branch[]; router: any }) {
  const totalMembers = branches.reduce((s, b) => s + b.memberCount, 0);
  const sorted = [...branches].sort((a, b) => b.memberCount - a.memberCount);
  const topId = sorted[0]?.id;

  const getPerformanceLabel = (branch: Branch, rank: number) => {
    if (rank === 0) return { label: 'TOP PERFORMER', color: C.dark, bg: C.accent };
    const pct = totalMembers > 0 ? (branch.memberCount / totalMembers) * 100 : 0;
    if (pct >= 20) return { label: 'STABLE', color: C.textGray, bg: 'transparent' };
    return { label: `${pct.toFixed(1)}% SHARE`, color: '#10B981', bg: 'transparent' };
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Heading */}
      <Text style={an.heading}>Global Reach</Text>
      <Text style={an.subheading}>Real-time ministry impact across all regions.</Text>

      {/* Stat cards */}
      <View style={an.statRow}>
        <View style={an.statCardDark}>
          <Ionicons name="git-network" size={22} color={C.accent} style={{ marginBottom: 10 }} />
          <Text style={an.statNumDark}>{branches.length}</Text>
          <Text style={an.statLblDark}>Total Branches</Text>
        </View>
        <View style={an.statCardAccent}>
          <Ionicons name="people" size={22} color={C.dark} style={{ marginBottom: 10 }} />
          <Text style={an.statNumAccent}>{fmt(totalMembers)}</Text>
          <Text style={an.statLblAccent}>Active Members</Text>
        </View>
      </View>

      {/* Branch Distribution Bars (growth trend proxy) */}
      {branches.length > 0 && (
        <View style={an.trendCard}>
          <View style={an.trendHeader}>
            <Text style={an.trendTitle}>Branch Distribution</Text>
            <View style={an.trendBadge}>
              <Ionicons name="trending-up" size={12} color="#10B981" />
              <Text style={an.trendBadgeText}>{branches.length} branches</Text>
            </View>
          </View>
          <View style={an.bars}>
            {sorted.slice(0, 6).map((b, i) => {
              const pct = totalMembers > 0 ? (b.memberCount / sorted[0].memberCount) : 0;
              return (
                <View key={b.id} style={an.barCol}>
                  <View style={an.barTrack}>
                    <View style={[an.barFill, { height: `${Math.max(pct * 100, 8)}%`, backgroundColor: i === 0 ? C.accent : C.dark }]} />
                  </View>
                  <Text style={an.barLabel} numberOfLines={1}>{b.name.split(' ')[0]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Branch Attendance */}
      <View style={an.attendHeader}>
        <Text style={an.attendTitle}>Branch Attendance</Text>
        <TouchableOpacity onPress={() => router.push('/admin/reports' as any)}>
          <Text style={an.attendViewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={an.attendList}>
        {sorted.map((branch, rank) => {
          const perf = getPerformanceLabel(branch, rank);
          return (
            <View key={branch.id} style={[an.attendRow, rank < sorted.length - 1 && an.attendRowBorder]}>
              <View style={an.attendAvatar}>
                <Text style={an.attendAvatarText}>{initials(branch.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={an.attendName} numberOfLines={1}>{branch.name}</Text>
                <Text style={an.attendCity}>{branch.city ?? 'No location set'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={an.attendCount}>{branch.memberCount.toLocaleString()}</Text>
                {perf.label !== 'STABLE' || rank === 0 ? (
                  <View style={[an.perfBadge, { backgroundColor: perf.bg || 'transparent' }]}>
                    <Text style={[an.perfText, { color: perf.color }]}>{perf.label}</Text>
                  </View>
                ) : (
                  <Text style={an.perfStable}>{perf.label}</Text>
                )}
              </View>
            </View>
          );
        })}

        {branches.length === 0 && (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Ionicons name="bar-chart-outline" size={40} color={C.border} />
            <Text style={{ color: C.textGray, marginTop: 8 }}>No branch data yet</Text>
          </View>
        )}
      </View>

      {/* Generate Report */}
      <TouchableOpacity
        style={an.reportBtn}
        onPress={() => router.push('/admin/reports' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="download-outline" size={18} color={C.dark} />
        <Text style={an.reportBtnText}>GENERATE FULL REPORT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function BranchesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('directory');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Branch | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterPastor, setFilterPastor] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [filterSort, setFilterSort] = useState<'name' | 'members' | 'date'>('name');
  const activeFilterCount = [filterCity, filterPastor !== 'all' ? '1' : ''].filter(Boolean).length;

  const fetchAll = useCallback(async () => {
    try {
      const [bRes, pRes] = await Promise.all([
        api.get('/churches/branches'),
        api.get('/churches/pastors'),
      ]);
      setBranches(bRes.data ?? []);
      setPastors(pRes.data ?? []);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const topId = useMemo(
    () => branches.reduce((top, b) => b.memberCount > (top?.memberCount ?? -1) ? b : top, branches[0])?.id,
    [branches],
  );

  const filtered = useMemo(() => {
    let list = [...branches];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        (b.city ?? '').toLowerCase().includes(q) ||
        (b.pastor ? `${b.pastor.firstName} ${b.pastor.lastName}`.toLowerCase().includes(q) : false),
      );
    }
    if (filterCity.trim()) {
      const c = filterCity.toLowerCase();
      list = list.filter((b) => (b.city ?? '').toLowerCase().includes(c));
    }
    if (filterPastor === 'assigned')   list = list.filter((b) => !!b.pastor);
    if (filterPastor === 'unassigned') list = list.filter((b) => !b.pastor);
    list.sort((a, b) => {
      if (filterSort === 'members') return b.memberCount - a.memberCount;
      if (filterSort === 'date')    return 0; // createdAt not returned, keep order
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [branches, search, filterCity, filterPastor, filterSort]);

  const handleEdit = async (branch: Branch, data: any) => {
    await api.patch(`/churches/branch/${branch.id}`, data);
    await fetchAll();
  };

  const handleDelete = (branch: Branch) => {
    Alert.alert('Delete Branch', `Remove "${branch.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/churches/branch/${branch.id}`);
          setBranches((p) => p.filter((b) => b.id !== branch.id));
        } catch (err: any) {
          Alert.alert('Cannot Delete', err.response?.data?.message ?? 'Failed to delete branch.');
        }
      }},
    ]);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'directory', label: 'Directory' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'add', label: 'Add Branch' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Branch Management</Text>
        </View>

        {/* Tab bar */}
        <View style={s.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={s.tabItem}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
              {tab === t.key && <View style={s.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* Content */}
      {loading ? (
        <View style={[s.centered, { backgroundColor: C.bg }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : tab === 'directory' ? (
        <>
          {/* Search bar */}
          <View style={s.searchWrap}>
            <View style={s.searchBar}>
              <Ionicons name="search" size={16} color={C.textGray} />
              <TextInput
                style={s.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search branches..."
                placeholderTextColor={C.textGray}
              />
            </View>
            <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilter(true)} activeOpacity={0.8}>
              <Ionicons name="options" size={20} color={C.white} />
              {activeFilterCount > 0 && (
                <View style={s.filterBadge}><Text style={s.filterBadgeText}>{activeFilterCount}</Text></View>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(b) => b.id}
            style={{ flex: 1, backgroundColor: C.bg }}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={C.accent} />}
            renderItem={({ item }) => (
              <BranchCard
                branch={item}
                isTop={item.id === topId}
                onPress={() => router.push({
                  pathname: '/admin/branches/[id]',
                  params: {
                    id: item.id,
                    branchName: item.name,
                    branchCity: item.city ?? '',
                    branchAddress: item.address ?? '',
                    branchPhone: item.phone ?? '',
                    memberCount: String(item.memberCount),
                    workerCount: String(item.workerCount ?? 0),
                    pastorName: item.pastor
                      ? `${item.pastor.firstName} ${item.pastor.lastName}` : '',
                    pastorEmail: item.pastor?.email ?? '',
                    pastorPhone: item.pastor?.phone ?? '',
                  },
                } as any)}
                onManage={() => { setEditing(item); setShowEdit(true); }}
                onDelete={() => handleDelete(item)}
              />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons name="git-branch-outline" size={52} color={C.border} />
                <Text style={s.emptyTitle}>No branches yet</Text>
                <Text style={s.emptySub}>Switch to "Add Branch" to create your first branch</Text>
              </View>
            }
          />

          {/* FAB */}
          <TouchableOpacity
            style={s.fab}
            onPress={() => setTab('add')}
            activeOpacity={0.85}
          >
            <Ionicons name="location" size={18} color={C.dark} />
            <View style={s.fabPlus}>
              <Ionicons name="add" size={12} color={C.dark} />
            </View>
          </TouchableOpacity>
        </>
      ) : tab === 'analytics' ? (
        <AnalyticsTab branches={branches} router={router} />
      ) : (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <AddBranchTab
            pastors={pastors}
            onCreated={() => { fetchAll(); setTab('directory'); }}
          />
        </View>
      )}

      <EditModal
        visible={showEdit}
        branch={editing}
        onClose={() => setShowEdit(false)}
        onSave={(data) => handleEdit(editing!, data)}
      />

      {/* ── Filter Modal ── */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <TouchableOpacity style={fm.overlay} activeOpacity={1} onPress={() => setShowFilter(false)}>
          <View style={fm.sheet}>
            <View style={fm.handle} />
            <View style={fm.sheetHeader}>
              <Text style={fm.sheetTitle}>Filter Branches</Text>
              <TouchableOpacity onPress={() => { setFilterCity(''); setFilterPastor('all'); setFilterSort('name'); }}>
                <Text style={fm.clearText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Location filter */}
            <Text style={fm.label}>Filter by City / Location</Text>
            <View style={fm.inputWrap}>
              <Ionicons name="location-outline" size={16} color={C.textGray} />
              <TextInput
                style={fm.input}
                value={filterCity}
                onChangeText={setFilterCity}
                placeholder="e.g. Lagos, Abuja..."
                placeholderTextColor={C.textGray}
              />
              {filterCity ? (
                <TouchableOpacity onPress={() => setFilterCity('')}>
                  <Ionicons name="close-circle" size={16} color={C.textGray} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Pastor assignment filter */}
            <Text style={fm.label}>Assigned Pastor</Text>
            <View style={fm.chipRow}>
              {([['all', 'All Branches'], ['assigned', 'Has Pastor'], ['unassigned', 'No Pastor']] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[fm.chip, filterPastor === key && fm.chipActive]}
                  onPress={() => setFilterPastor(key)}
                  activeOpacity={0.8}
                >
                  <Text style={[fm.chipText, filterPastor === key && fm.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort */}
            <Text style={fm.label}>Sort By</Text>
            <View style={fm.chipRow}>
              {([['name', 'Branch Name'], ['members', 'Most Members'], ['date', 'Date Added']] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[fm.chip, filterSort === key && fm.chipActive]}
                  onPress={() => setFilterSort(key)}
                  activeOpacity={0.8}
                >
                  <Text style={[fm.chipText, filterSort === key && fm.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={fm.applyBtn} onPress={() => setShowFilter(false)} activeOpacity={0.85}>
              <Text style={fm.applyBtnText}>
                Apply Filters {filtered.length > 0 ? `· ${filtered.length} results` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tabItem: { marginRight: 24, paddingBottom: 12, alignItems: 'center' },
  tabLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  tabLabelActive: { color: C.accent, fontWeight: '800' },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, borderRadius: 2, backgroundColor: C.accent },
  searchWrap: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.bg },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark },
  filterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterBadge: { position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 8, fontWeight: '800', color: C.dark },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center', paddingHorizontal: 20 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  fabPlus: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
});

// Branch card styles
const d = StyleSheet.create({
  card: {
    backgroundColor: C.darkCard, borderRadius: 20, padding: 20, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  typeBadgeTop: { backgroundColor: C.accent },
  typeBadgeText: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 },
  typeBadgeTextTop: { color: C.dark },
  branchName: {
    fontSize: 22, fontWeight: '900', color: C.white,
    lineHeight: 28, marginBottom: 10,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 16 },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  statBlock: { flex: 1 },
  statLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, marginBottom: 8 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 16, height: 48 },
  pastorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pastorAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(245,197,24,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  pastorAvatarEmpty: { backgroundColor: 'rgba(255,255,255,0.06)' },
  pastorAvatarText: { fontSize: 11, fontWeight: '800', color: C.accent },
  pastorName: { fontSize: 13, fontWeight: '700', color: C.white, flex: 1 },
  pastorNameEmpty: { color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  memberCount: { fontSize: 22, fontWeight: '900', color: C.white },
  btnRow: { flexDirection: 'row', gap: 10 },
  manageBtn: {
    flex: 1, backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  manageBtnText: { fontSize: 13, fontWeight: '800', color: C.dark, letterSpacing: 0.8 },
  deleteBtn: {
    width: 46, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
});

// Modal styles
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: C.textDark, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: C.textDark, marginBottom: 6 },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.textDark },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.border },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.textGray },
  saveBtn: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: C.accent },
  saveText: { fontSize: 14, fontWeight: '800', color: C.dark },
  pastorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  pastorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  pastorAvatarText: { fontSize: 13, fontWeight: '800', color: C.accent },
  pastorName: { fontSize: 14, fontWeight: '700', color: C.textDark },
  pastorEmail: { fontSize: 11, color: C.textGray, marginTop: 2 },
});

// Add Branch tab styles
const a = StyleSheet.create({
  heading: { fontSize: 28, fontWeight: '800', color: C.textDark, lineHeight: 36, marginBottom: 10 },
  subheading: { fontSize: 14, color: C.textGray, lineHeight: 22, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: C.textDark, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: C.textDark },
  inputFocused: { borderColor: C.accent },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 15 },
  pickerValue: { fontSize: 14, color: C.textDark, fontWeight: '600' },
  pickerPlaceholder: { fontSize: 14, color: C.textGray },
  mapPlaceholder: { height: 140, backgroundColor: '#E5E7EB', borderRadius: 14, marginTop: 8, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapPin: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  mapText: { fontSize: 12, color: C.textGray },
  phoneWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  phoneInput: { flex: 1, fontSize: 14, color: C.textDark },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, marginTop: 28, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  createBtnText: { fontSize: 15, fontWeight: '800', color: C.dark, letterSpacing: 0.6 },
  disclaimer: { fontSize: 11, color: C.textGray, textAlign: 'center', fontStyle: 'italic', marginTop: 10 },
});

// Analytics tab styles
const an = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  subheading: { fontSize: 13, color: C.textGray, marginBottom: 20 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCardDark: { flex: 1, backgroundColor: C.dark, borderRadius: 18, padding: 18 },
  statCardAccent: { flex: 1, backgroundColor: C.accent, borderRadius: 18, padding: 18 },
  statNumDark: { fontSize: 32, fontWeight: '800', color: C.white, marginBottom: 4 },
  statLblDark: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  statNumAccent: { fontSize: 32, fontWeight: '800', color: C.dark, marginBottom: 4 },
  statLblAccent: { fontSize: 11, color: 'rgba(18,13,46,0.6)', fontWeight: '600' },
  trendCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  trendTitle: { fontSize: 15, fontWeight: '800', color: C.textDark },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendBadgeText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', gap: 6 },
  barTrack: { flex: 1, width: '100%', backgroundColor: C.bg, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: C.textGray, textAlign: 'center', fontWeight: '600' },
  attendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  attendTitle: { fontSize: 17, fontWeight: '800', color: C.textDark },
  attendViewAll: { fontSize: 13, fontWeight: '700', color: C.accent },
  attendList: { backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  attendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  attendRowBorder: { borderBottomWidth: 1, borderBottomColor: C.bg },
  attendAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  attendAvatarText: { fontSize: 14, fontWeight: '800', color: C.accent },
  attendName: { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 2 },
  attendCity: { fontSize: 11, color: C.textGray },
  attendCount: { fontSize: 16, fontWeight: '800', color: C.textDark, textAlign: 'right' },
  perfBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
  perfText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  perfStable: { fontSize: 10, color: C.textGray, fontWeight: '600', marginTop: 3 },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  reportBtnText: { fontSize: 14, fontWeight: '800', color: C.dark, letterSpacing: 0.6 },
});

// Filter modal styles
const fm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.textDark },
  clearText: { fontSize: 14, fontWeight: '700', color: C.error },
  label: { fontSize: 12, fontWeight: '800', color: C.textDark, letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  input: { flex: 1, fontSize: 14, color: C.textDark },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  chipActive: { backgroundColor: C.dark, borderColor: C.dark },
  chipText: { fontSize: 13, fontWeight: '600', color: C.textGray },
  chipTextActive: { color: C.accent },
  applyBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  applyBtnText: { fontSize: 15, fontWeight: '800', color: C.dark },
});
