import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Clipboard, StatusBar,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

const C = { dark: '#120D2E', darkCard: '#1E1650', accent: '#F5C518', white: '#FFFFFF', bg: '#F2F2F7', textDark: '#120D2E', textGray: '#8888A0', error: '#FF4C4C', border: '#E8E8EF' };

export default function WorkerProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [portalData, setPortalData] = useState<any>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useFocusEffect(useCallback(() => {
    api.get('/follow-up/worker/portal').then((r) => setPortalData(r.data)).catch(() => {});
  }, []));

  const handleCopyCode = () => {
    Alert.alert('Code Copied', 'Your worker login code has been copied. Keep it safe — anyone with this code can log in as you.');
  };

  const handleRegenerateCode = () => {
    Alert.alert(
      'Regenerate Code',
      'Your current code will be invalidated immediately. A new code will be generated. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setRegenerating(true);
            try {
              const res = await api.post('/follow-up/worker/regenerate-code');
              Alert.alert('New Code Generated', `Your new login code:\n\n${res.data.loginCodePlain}\n\nSave this code — it will not be shown again.`);
            } catch {
              Alert.alert('Error', 'Could not regenerate code. Please try again.');
            } finally { setRegenerating(false); }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await api.post('/auth/logout').catch(() => {});
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '??';
  const stats = portalData?.stats ?? { totalAssigned: 0, converted: 0, active: 0 };
  const retention = portalData?.retentionRate ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}><Text style={s.title}>My Profile</Text></View>
      </SafeAreaView>

      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          <Text style={s.heroName}>{user ? `${user.firstName} ${user.lastName}` : 'Worker'}</Text>
          <View style={s.rolePill}>
            <Ionicons name="people" size={12} color={C.dark} />
            <Text style={s.rolePillText}>Follow-Up Worker</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats.active}</Text>
            <Text style={s.statLabel}>Active</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats.converted}</Text>
            <Text style={s.statLabel}>Completed</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{retention}%</Text>
            <Text style={s.statLabel}>Retention</Text>
          </View>
        </View>

        {/* Login Code */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>YOUR LOGIN CODE</Text>
          <View style={s.codeCard}>
            <Ionicons name="key-outline" size={20} color={C.accent} style={{ marginBottom: 8 }} />
            <Text style={s.codeExplainer}>
              Use the code below to log in. Keep it safe — anyone with this code can log in as you.
            </Text>
            <TouchableOpacity style={s.codeCopyBtn} onPress={handleCopyCode} activeOpacity={0.8}>
              <Ionicons name="copy-outline" size={16} color={C.dark} />
              <Text style={s.codeCopyText}>Tap to copy your code</Text>
            </TouchableOpacity>
            {portalData?.worker?.loginCodeUpdatedAt && (
              <Text style={s.codeUpdated}>
                Last updated: {new Date(portalData.worker.loginCodeUpdatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            )}
            <TouchableOpacity
              style={[s.regenerateBtn, regenerating && { opacity: 0.6 }]}
              onPress={handleRegenerateCode}
              disabled={regenerating}
              activeOpacity={0.8}
            >
              {regenerating
                ? <ActivityIndicator color={C.error} size="small" />
                : <>
                    <Ionicons name="refresh-outline" size={16} color={C.error} />
                    <Text style={s.regenerateBtnText}>Regenerate Code</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={s.section}>
          <View style={s.logoutCard}>
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} disabled={loggingOut} activeOpacity={0.8}>
              {loggingOut
                ? <ActivityIndicator color={C.error} />
                : <>
                    <Ionicons name="log-out-outline" size={20} color={C.error} />
                    <Text style={s.logoutText}>Sign Out</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#F5C518' },
  hero: { backgroundColor: C.dark, alignItems: 'center', paddingBottom: 28, paddingTop: 8, paddingHorizontal: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: '900', color: C.dark },
  heroName: { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 8 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  rolePillText: { fontSize: 12, fontWeight: '800', color: C.dark },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statValue: { fontSize: 24, fontWeight: '800', color: C.dark, marginBottom: 4 },
  statLabel: { fontSize: 11, color: C.textGray, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: C.textGray, letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  codeCard: { backgroundColor: C.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  codeExplainer: { fontSize: 13, color: C.textGray, lineHeight: 20, marginBottom: 16 },
  codeCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.dark, borderRadius: 10, padding: 14, justifyContent: 'center', marginBottom: 8 },
  codeCopyText: { fontSize: 14, fontWeight: '700', color: C.accent },
  codeUpdated: { fontSize: 11, color: C.textGray, textAlign: 'center', marginBottom: 16 },
  regenerateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 10 },
  regenerateBtnText: { fontSize: 13, fontWeight: '700', color: C.error },
  logoutCard: { backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18 },
  logoutText: { fontSize: 16, fontWeight: '700', color: C.error },
});
