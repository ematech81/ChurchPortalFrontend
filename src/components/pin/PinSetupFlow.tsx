import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import PinPad from './PinPad';

const C = {
  dark: '#120D2E',
  darkCard: '#1E1650',
  accent: '#F5C518',
  accentFaint: 'rgba(245,197,24,0.15)',
  white: '#FFFFFF',
  gray: '#8888A0',
  error: '#FF4C4C',
  success: '#22C55E',
};

type Step = 'enter' | 'confirm' | 'success';

interface Props {
  onDone: () => void;
}

export default function PinSetupFlow({ onDone }: Props) {
  const setHasPin = useAuthStore((s) => s.setHasPin);
  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleEnter = useCallback((pin: string) => {
    setFirstPin(pin);
    setError(null);
    setResetKey((k) => k + 1);
    setStep('confirm');
  }, []);

  const handleConfirm = useCallback(async (pin: string) => {
    if (pin !== firstPin) {
      setError('PINs do not match. Try again.');
      setResetKey((k) => k + 1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/pin/create', { pin, confirmPin: pin });
      await setHasPin(true);
      setStep('success');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Failed to save PIN. Try again.';
      setError(Array.isArray(msg) ? msg[0] : msg);
      setResetKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }, [firstPin, setHasPin]);

  if (step === 'success') {
    return (
      <View style={s.wrap}>
        <View style={s.successIcon}>
          <Ionicons name="shield-checkmark" size={52} color={C.accent} />
        </View>
        <Text style={s.successTitle}>PIN Active</Text>
        <Text style={s.successBody}>
          Your Finance and Administration screens are now protected.
        </Text>
        <TouchableOpacity style={s.btn} onPress={onDone}>
          <Text style={s.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      {loading && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      )}

      {step === 'enter' ? (
        <PinPad
          title="Create a 4-digit PIN"
          subtitle="You'll enter this each time you open Finance or Administration."
          onComplete={handleEnter}
          resetKey={resetKey}
        />
      ) : (
        <PinPad
          title="Confirm your PIN"
          subtitle="Enter the same PIN again to confirm."
          onComplete={handleConfirm}
          error={error}
          resetKey={resetKey}
          disabled={loading}
        />
      )}

      <View style={s.stepDots}>
        <View style={[s.dot, step === 'enter' ? s.dotActive : s.dotDone]} />
        <View style={[s.dot, step === 'confirm' ? s.dotActive : step === 'success' ? s.dotDone : s.dotIdle]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,13,46,0.6)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  stepDots: { flexDirection: 'row', gap: 8, marginTop: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: C.accent },
  dotDone: { backgroundColor: C.success },
  dotIdle: { backgroundColor: '#2E2860' },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.accentFaint,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26, fontWeight: '800', color: C.white,
    marginBottom: 12, textAlign: 'center',
  },
  successBody: {
    fontSize: 15, color: C.gray, textAlign: 'center',
    lineHeight: 22, marginBottom: 36,
  },
  btn: {
    backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 48,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: C.dark },
});
