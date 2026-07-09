import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  StatusBar, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { C } from '../../constants/theme';
import WorkerNotifyModal, { WorkerResult, MessageTemplates } from '../../components/WorkerNotifyModal';

interface Worker {
  id: string; firstName: string; lastName: string; phone: string;
  departmentName: string | null; address: string | null;
}

interface Journey {
  id: string; assignedWorkerId: string | null; status: string;
}

const MAX_CASES = 5;

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

export default function AssignWorkerScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { memberId, memberName, memberStatus, memberPhone } =
    useLocalSearchParams<{ memberId: string; memberName: string; memberStatus: string; memberPhone: string }>();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Worker notify modal state
  const [showNotify, setShowNotify] = useState(false);
  const [notifyWorker, setNotifyWorker] = useState<WorkerResult | null>(null);
  const [notifyTemplates, setNotifyTemplates] = useState<MessageTemplates | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [wRes, jRes] = await Promise.all([
          api.get('/members', { params: { status: 'worker', limit: 100 } }),
          api.get('/follow-up/journeys'),
        ]);
        setWorkers(wRes.data ?? []);
        setJourneys(jRes.data ?? []);
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  const activeCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    journeys.forEach((j) => {
      if (j.status === 'active' && j.assignedWorkerId) {
        map[j.assignedWorkerId] = (map[j.assignedWorkerId] ?? 0) + 1;
      }
    });
    return map;
  }, [journeys]);

  const filtered = useMemo(() =>
    search.trim()
      ? workers.filter((w) =>
          `${w.firstName} ${w.lastName}`.toLowerCase().includes(search.toLowerCase()),
        )
      : workers,
    [workers, search],
  );

  const handleAssign = useCallback(async (worker: Worker) => {
    const count = activeCountMap[worker.id] ?? 0;
    if (count >= MAX_CASES) return;

    Alert.alert(
      'Assign Worker',
      `Assign ${worker.firstName} ${worker.lastName} to follow up with ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setAssigning(worker.id);
            try {
              const res = await api.post('/follow-up/journeys', {
                memberId,
                decisionType: memberStatus === 'new_convert' ? 'salvation' : 'follow-up',
                assignedWorkerId: worker.id,
              });

              // Show the notify modal with the worker data returned from the API
              const workerData = res.data?.worker;
              const templates  = res.data?.messageTemplates;

              if (workerData) {
                setNotifyWorker(workerData);
                setNotifyTemplates(templates ?? null);
                setShowNotify(true);
              } else {
                // Fallback: no code data returned (e.g. worker already had a code and this is a re-assignment)
                Alert.alert(
                  'Assigned!',
                  `${worker.firstName} will follow up with ${memberName}.`,
                  [{ text: 'OK', onPress: () => router.back() }],
                );
              }
            } catch (e: any) {
              const msg = e?.response?.data?.message ?? 'Could not assign worker.';
              Alert.alert('Notice', String(msg));
            } finally {
              setAssigning(null);
            }
          },
        },
      ],
    );
  }, [memberId, memberName, memberStatus, activeCountMap]);

  const handleNotifyDismiss = useCallback(() => {
    setShowNotify(false);
    router.back();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Worker Assignment</Text>
        </View>

        {/* Member hero card */}
        <View style={s.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroSub}>ASSIGNING FOR</Text>
            <Text style={s.heroName}>{memberName}</Text>
            {memberPhone ? (
              <View style={s.heroMeta}>
                <Ionicons name="call-outline" size={12} color={C.accent} />
                <Text style={s.heroMetaText}>{memberPhone}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarText}>
              {(memberName ?? '  ').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color={C.textGray} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search workers..."
              placeholderTextColor={C.textGray}
              returnKeyType="search"
            />
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={[s.centered, { backgroundColor: C.bg }]}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(w) => w.id}
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            filtered.length > 0 ? (
              <View style={s.sectionHeader}>
                <View style={s.sectionAccent} />
                <Text style={s.sectionTitle}>Recommended Workers</Text>
              </View>
            ) : null
          }
          renderItem={({ item: worker }) => {
            const activeCount = activeCountMap[worker.id] ?? 0;
            const isFull = activeCount >= MAX_CASES;
            const isAssigning = assigning === worker.id;

            return (
              <View style={[s.workerCard, isFull && s.workerCardFull]}>
                <View style={[s.workerAvatar, isFull ? s.workerAvatarFull : s.workerAvatarOk]}>
                  <Text style={s.workerAvatarText}>{initials(worker.firstName, worker.lastName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.workerName}>{worker.firstName} {worker.lastName}</Text>
                  {worker.address ? (
                    <View style={s.workerLocation}>
                      <Ionicons name="location-outline" size={11} color={C.textGray} />
                      <Text style={s.workerLocationText} numberOfLines={1}>{worker.address}</Text>
                    </View>
                  ) : null}
                  <View style={[s.caseBadge, isFull && s.caseBadgeFull]}>
                    <Ionicons name="people-outline" size={10} color={isFull ? C.error : '#166534'} />
                    <Text style={[s.caseBadgeText, isFull && { color: C.error }]}>
                      {activeCount}/{MAX_CASES} active
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.assignBtn, isFull && s.assignBtnFull]}
                  onPress={() => handleAssign(worker)}
                  disabled={isFull || !!assigning}
                  activeOpacity={0.8}
                >
                  {isAssigning
                    ? <ActivityIndicator size="small" color={C.dark} />
                    : <Text style={[s.assignBtnText, isFull && { color: C.textGray }]}>
                        {isFull ? 'FULL' : 'ASSIGN'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={C.border} />
              <Text style={s.emptyTitle}>
                {search ? 'No workers match your search' : 'No workers available'}
              </Text>
              <Text style={s.emptySub}>
                {search ? 'Try a different name.' : "Assign 'Worker' status to members first."}
              </Text>
            </View>
          }
        />
      )}

      {/* Worker notify modal — replaces the old Alert.alert success */}
      <WorkerNotifyModal
        visible={showNotify}
        worker={notifyWorker}
        memberName={memberName ?? ''}
        messageTemplates={notifyTemplates}
        onDismiss={handleNotifyDismiss}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.white },

  heroCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, gap: 12 },
  heroSub: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2, marginBottom: 4 },
  heroName: { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { fontSize: 12, color: C.accent, fontWeight: '600' },
  heroAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.darkCard, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: C.accent },
  heroAvatarText: { fontSize: 18, fontWeight: '800', color: C.accent },

  searchWrap: { paddingHorizontal: 16, paddingBottom: 0 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.white },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionAccent: { width: 4, height: 18, borderRadius: 2, backgroundColor: C.accent },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.textDark },

  workerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  workerCardFull: { opacity: 0.65 },
  workerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  workerAvatarOk: { borderColor: C.accent },
  workerAvatarFull: { borderColor: '#D1D5DB' },
  workerAvatarText: { fontSize: 16, fontWeight: '800', color: C.accent },
  workerName: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 4 },
  workerLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  workerLocationText: { fontSize: 11, color: C.textGray, flex: 1 },
  caseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  caseBadgeFull: { backgroundColor: '#FEF2F2' },
  caseBadgeText: { fontSize: 10, fontWeight: '700', color: '#166534' },

  assignBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, minWidth: 72, alignItems: 'center' },
  assignBtnFull: { backgroundColor: '#E5E7EB' },
  assignBtnText: { fontSize: 13, fontWeight: '800', color: C.dark },

  empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textDark },
  emptySub: { fontSize: 13, color: C.textGray, textAlign: 'center', paddingHorizontal: 32 },
});
