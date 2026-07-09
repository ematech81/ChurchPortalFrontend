import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { setPinSetupSkipped } from '../../utils/pin-session';

const C = {
  dark: '#120D2E',
  darkCard: '#1E1650',
  accent: '#F5C518',
  accentFaint: 'rgba(245,197,24,0.15)',
  white: '#FFFFFF',
  gray: '#8888A0',
};

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export default function PinSetupModal({ visible, onDismiss }: Props) {
  const router = useRouter();

  const handleCreate = () => {
    onDismiss();
    // Navigate to Finance — PinGate will show setup flow because hasPin === false
    router.push('/finance' as any);
  };

  const handleLater = () => {
    setPinSetupSkipped();
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconRing}>
            <Ionicons name="shield-checkmark" size={40} color={C.accent} />
          </View>

          <Text style={s.headline}>Secure your sensitive screens</Text>
          <Text style={s.body}>
            Set a 4-digit PIN to protect Finance and Administration. You'll enter it each time you access these sections.
          </Text>

          <TouchableOpacity style={s.primaryBtn} onPress={handleCreate}>
            <Ionicons name="lock-closed" size={18} color={C.dark} style={{ marginRight: 8 }} />
            <Text style={s.primaryBtnText}>Create Security PIN</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={handleLater}>
            <Text style={s.secondaryBtnText}>Remind me later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: C.darkCard, borderRadius: 24,
    padding: 32, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  iconRing: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: C.accentFaint,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: 22, fontWeight: '800', color: C.white,
    textAlign: 'center', marginBottom: 12,
  },
  body: {
    fontSize: 14, color: C.gray, textAlign: 'center',
    lineHeight: 22, marginBottom: 32,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 28,
    width: '100%', justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: C.dark },
  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { fontSize: 14, color: C.gray, fontWeight: '600' },
});
