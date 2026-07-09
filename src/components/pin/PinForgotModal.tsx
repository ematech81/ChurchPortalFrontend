import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import PinPad from './PinPad';

const C = {
  dark: '#120D2E',
  darkCard: '#1E1650',
  accent: '#F5C518',
  white: '#FFFFFF',
  gray: '#8888A0',
  error: '#FF4C4C',
  border: '#2E2860',
};

type Step = 'credential' | 'otp_sent' | 'new_pin' | 'confirm_pin' | 'success';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PinForgotModal({ visible, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const setHasPin = useAuthStore((s) => s.setHasPin);
  const isBranchPastor = user?.role === 'branch_pastor';

  const [step, setStep] = useState<Step>('credential');
  const [credential, setCredential] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const reset = useCallback(() => {
    setStep('credential');
    setCredential('');
    setNewPin('');
    setError(null);
    setLoading(false);
    setResetKey((k) => k + 1);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSendOtp = useCallback(async () => {
    if (!user?.phone) {
      setError('No phone number on your account.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/resend-pastor-otp', { phone: user.phone });
      setStep('otp_sent');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleCredentialNext = useCallback(() => {
    if (!credential.trim()) {
      setError(isBranchPastor ? 'Enter the OTP code.' : 'Enter your password.');
      return;
    }
    setError(null);
    setStep('new_pin');
  }, [credential, isBranchPastor]);

  const handleNewPin = useCallback((pin: string) => {
    setNewPin(pin);
    setResetKey((k) => k + 1);
    setStep('confirm_pin');
  }, []);

  const handleConfirmPin = useCallback(async (pin: string) => {
    if (pin !== newPin) {
      setError('PINs do not match.');
      setResetKey((k) => k + 1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/pin/reset', {
        credential: credential.trim(),
        newPin: pin,
        confirmPin: pin,
      });
      await setHasPin(true);
      setStep('success');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Reset failed. Try again.';
      setError(Array.isArray(msg) ? msg[0] : msg);
      setResetKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }, [newPin, credential, setHasPin]);

  const renderContent = () => {
    if (step === 'success') {
      return (
        <View style={s.center}>
          <View style={s.successRing}>
            <Ionicons name="shield-checkmark" size={48} color={C.accent} />
          </View>
          <Text style={s.successTitle}>PIN Updated</Text>
          <Text style={s.successSub}>Your new PIN is active.</Text>
          <TouchableOpacity style={s.doneBtn} onPress={handleClose}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'new_pin') {
      return (
        <PinPad
          title="New PIN"
          subtitle="Enter your new 4-digit PIN."
          onComplete={handleNewPin}
          resetKey={resetKey}
        />
      );
    }

    if (step === 'confirm_pin') {
      return (
        <PinPad
          title="Confirm PIN"
          subtitle="Re-enter your new PIN to confirm."
          onComplete={handleConfirmPin}
          error={error}
          resetKey={resetKey}
          disabled={loading}
        />
      );
    }

    // credential / otp_sent
    return (
      <View style={s.center}>
        <Ionicons name="lock-open-outline" size={40} color={C.accent} style={{ marginBottom: 16 }} />
        <Text style={s.credTitle}>
          {isBranchPastor ? 'Verify with OTP' : 'Verify with Password'}
        </Text>
        <Text style={s.credSub}>
          {isBranchPastor
            ? step === 'otp_sent'
              ? `Enter the OTP sent to ${user?.phone}.`
              : 'We\'ll send a verification code to your registered phone number.'
            : 'Enter your account password to reset your PIN.'}
        </Text>

        {isBranchPastor && step === 'credential' ? (
          <TouchableOpacity
            style={[s.doneBtn, loading && { opacity: 0.6 }]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={C.dark} />
              : <Text style={s.doneBtnText}>Send OTP</Text>}
          </TouchableOpacity>
        ) : (
          <>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={credential}
                onChangeText={setCredential}
                placeholder={isBranchPastor ? 'Enter OTP code' : 'Enter password'}
                placeholderTextColor={C.gray}
                secureTextEntry={!isBranchPastor && !showCredential}
                keyboardType={isBranchPastor ? 'number-pad' : 'default'}
                autoCapitalize="none"
              />
              {!isBranchPastor && (
                <TouchableOpacity onPress={() => setShowCredential((v) => !v)} style={s.eyeBtn}>
                  <Ionicons name={showCredential ? 'eye-off' : 'eye'} size={20} color={C.gray} />
                </TouchableOpacity>
              )}
            </View>
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[s.doneBtn, loading && { opacity: 0.6 }]}
              onPress={handleCredentialNext}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={C.dark} />
                : <Text style={s.doneBtnText}>Continue</Text>}
            </TouchableOpacity>
          </>
        )}

        {error && step === 'credential' ? <Text style={s.errorText}>{error}</Text> : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Reset PIN</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={C.gray} />
            </TouchableOpacity>
          </View>
          {renderContent()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.dark, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, minHeight: 380,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 28,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  center: { alignItems: 'center' },
  credTitle: {
    fontSize: 20, fontWeight: '800', color: C.white,
    marginBottom: 10, textAlign: 'center',
  },
  credSub: {
    fontSize: 14, color: C.gray, textAlign: 'center',
    marginBottom: 24, lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E1650', borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    width: '100%', marginBottom: 12,
  },
  input: {
    flex: 1, color: C.white, fontSize: 16,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  eyeBtn: { paddingHorizontal: 14 },
  errorText: { fontSize: 13, color: C.error, marginBottom: 12, textAlign: 'center' },
  doneBtn: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 40,
    marginTop: 8, minWidth: 200, alignItems: 'center',
  },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: C.dark },
  successRing: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(245,197,24,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 8 },
  successSub: { fontSize: 14, color: C.gray, marginBottom: 28 },
});
