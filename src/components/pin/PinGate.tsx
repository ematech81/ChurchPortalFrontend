import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, AppState, AppStateStatus,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import PinPad from './PinPad';
import PinSetupFlow from './PinSetupFlow';
import PinForgotModal from './PinForgotModal';

const C = {
  dark: '#120D2E',
  darkCard: '#1E1650',
  accent: '#F5C518',
  white: '#FFFFFF',
  gray: '#8888A0',
  error: '#FF4C4C',
};

interface Props {
  children: React.ReactNode;
  /** Label shown on the lock screen, e.g. "Finance" or "Administration" */
  sectionLabel: string;
}

export default function PinGate({ children, sectionLabel }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [showForgot, setShowForgot] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lock when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current === 'active' && next.match(/inactive|background/)) {
        setAuthorized(false);
        setError(null);
        setResetKey((k) => k + 1);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  // Countdown ticker for lockout display
  useEffect(() => {
    if (!lockedUntil) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
      setCountdown(rem);
      if (rem <= 0) {
        setLockedUntil(null);
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [lockedUntil]);

  const handlePin = useCallback(async (pin: string) => {
    if (lockedUntil && lockedUntil > new Date()) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/pin/verify', { pin });
      setAuthorized(true);
    } catch (e: any) {
      const data = e?.response?.data;
      const code = data?.code ?? data?.error;
      if (code === 'PIN_LOCKED' || data?.message?.code === 'PIN_LOCKED') {
        const locked = new Date(data.lockedUntil ?? Date.now() + (data.remainingSeconds ?? 900) * 1000);
        setLockedUntil(locked);
        setError(null);
      } else {
        setError(data?.message ?? 'Incorrect PIN. Try again.');
      }
      setResetKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }, [lockedUntil]);

  const handleSetupDone = useCallback(() => {
    setAuthorized(true);
  }, []);

  if (authorized) {
    return <>{children}</>;
  }

  // No PIN yet — show setup flow
  if (!user?.hasPin) {
    return (
      <View style={s.screen}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <PinSetupFlow onDone={handleSetupDone} />
      </View>
    );
  }

  const isLocked = lockedUntil && lockedUntil > new Date();
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <View style={s.screen}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color={C.white} />
      </TouchableOpacity>
      <View style={s.card}>
        <View style={s.iconRing}>
          <Ionicons name="lock-closed" size={32} color={C.accent} />
        </View>
        <Text style={s.sectionLabel}>{sectionLabel}</Text>
        <Text style={s.lockTitle}>This section is protected</Text>

        {isLocked ? (
          <View style={s.lockoutBox}>
            <Ionicons name="time-outline" size={20} color={C.error} />
            <Text style={s.lockoutText}>
              Too many failed attempts.{'\n'}
              Try again in {mins}:{secs.toString().padStart(2, '0')}
            </Text>
          </View>
        ) : (
          <PinPad
            title=""
            subtitle="Enter your 4-digit PIN to continue."
            onComplete={handlePin}
            error={error}
            disabled={loading || !!isLocked}
            showForgot
            onForgot={() => setShowForgot(true)}
            resetKey={resetKey}
          />
        )}

        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        )}
      </View>

      <PinForgotModal
        visible={showForgot}
        onClose={() => setShowForgot(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: C.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute', top: 52, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  card: {
    width: '88%', backgroundColor: C.darkCard,
    borderRadius: 24, padding: 32,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  iconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(245,197,24,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: C.accent,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6,
  },
  lockTitle: {
    fontSize: 20, fontWeight: '800', color: C.white,
    textAlign: 'center', marginBottom: 28,
  },
  lockoutBox: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,76,76,0.1)', borderRadius: 12,
    padding: 16, marginTop: 8,
  },
  lockoutText: {
    fontSize: 14, color: C.error, lineHeight: 20, flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,13,46,0.5)',
    borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
});
