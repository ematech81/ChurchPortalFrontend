import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { C } from '../../constants/theme';

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={16} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function MenuRow({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={s.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.menuIcon, danger && s.menuIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? C.error : C.textDark} />
      </View>
      <Text style={[s.menuLabel, danger && s.menuLabelDanger]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={danger ? C.error : C.textGray} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

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

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await api.post('/auth/logout').catch(() => {}); // best-effort server logout
            } finally {
              await logout();
              router.replace('/(auth)/login');
            }
            setLoggingOut(false);
          },
        },
      ],
    );
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Kingdom Portal</Text>
          <View style={s.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Avatar + Name Card */}
        <View style={s.heroCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.heroName}>
            {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
          </Text>
          <View style={s.rolePill}>
            <Ionicons name="shield-checkmark" size={12} color={C.dark} />
            <Text style={s.rolePillText}>
              {roleLabel[user?.role ?? ''] ?? user?.role ?? 'Unknown Role'}
            </Text>
          </View>
          {user?.churchId && (
            <View style={s.churchPill}>
              <Ionicons name="business-outline" size={12} color={C.textGray} />
              <Text style={s.churchPillText}>Church profile set up</Text>
            </View>
          )}
        </View>

        {/* Account Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ACCOUNT DETAILS</Text>
          <View style={s.card}>
            <InfoRow icon="mail-outline" label="Email" value={user?.email ?? ''} />
            <View style={s.divider} />
            <InfoRow icon="call-outline" label="Phone" value={user?.phone ?? 'Not provided'} />
            <View style={s.divider} />
            <InfoRow icon="finger-print-outline" label="User ID" value={user?.id ? user.id.slice(0, 8) + '...' : ''} />
          </View>
        </View>

        {/* Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>SETTINGS</Text>
          <View style={s.card}>
            <MenuRow icon="person-outline" label="Edit Profile" onPress={() => {}} />
            <View style={s.divider} />
            <MenuRow icon="lock-closed-outline" label="Change Password" onPress={() => {}} />
            <View style={s.divider} />
            <MenuRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
          </View>
        </View>

        {/* Support */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>SUPPORT</Text>
          <View style={s.card}>
            <MenuRow icon="help-circle-outline" label="Help & FAQs" onPress={() => {}} />
            <View style={s.divider} />
            <MenuRow icon="headset-outline" label="Contact Support" onPress={() => {}} />
          </View>
        </View>

        {/* Logout */}
        <View style={s.section}>
          <View style={s.card}>
            <TouchableOpacity
              style={s.logoutBtn}
              onPress={handleLogout}
              disabled={loggingOut}
              activeOpacity={0.8}
            >
              {loggingOut ? (
                <ActivityIndicator color={C.error} />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color={C.error} />
                  <Text style={s.logoutText}>Sign Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.version}>Kingdom Portal v0.1 · Dev Build</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.accent, letterSpacing: 1 },
  headerRight: { width: 30 },
  heroCard: { backgroundColor: C.dark, paddingVertical: 32, alignItems: 'center', paddingHorizontal: 24, marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { fontSize: 28, fontWeight: '900', color: C.dark },
  heroName: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 10 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 8 },
  rolePillText: { fontSize: 12, fontWeight: '800', color: C.dark },
  churchPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  churchPillText: { fontSize: 12, color: C.textGray },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: C.textGray, letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  infoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: C.textGray, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: C.textDark },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  menuIconDanger: { backgroundColor: '#FEF2F2' },
  menuLabel: { flex: 1, fontSize: 15, color: C.textDark, fontWeight: '500' },
  menuLabelDanger: { color: C.error },
  divider: { height: 1, backgroundColor: C.bg, marginHorizontal: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18 },
  logoutText: { fontSize: 16, fontWeight: '700', color: C.error },
  version: { textAlign: 'center', fontSize: 11, color: C.textGray, marginTop: 28 },
});
