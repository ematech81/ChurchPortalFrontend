import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { C } from '../../constants/theme';

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN = 60;

export default function VerifyScreen() {
  const router = useRouter();
  const { email, phone, mode, devCode } = useLocalSearchParams<{
    email?: string; phone?: string; mode?: string; devCode?: string;
  }>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setOnboardingDone = useAuthStore((s) => s.setOnboardingDone);

  const isPastor = mode === 'pastor';
  const identifier = isPastor ? phone : email;

  // In dev mode, pre-fill the boxes with the code returned by the API
  const [digits, setDigits] = useState<string[]>(
    devCode && devCode.length === OTP_LENGTH
      ? devCode.split('')
      : Array(OTP_LENGTH).fill(''),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [ttl, setTtl] = useState(OTP_TTL_SECONDS);
  const [expired, setExpired] = useState(false);

  const inputs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  useEffect(() => {
    const interval = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
      setTtl((t) => {
        if (t <= 1) { setExpired(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  const code = digits.join('');
  const isComplete = code.length === OTP_LENGTH;

  const handleVerify = useCallback(async () => {
    if (!isComplete || loading) return;
    setLoading(true);
    setError('');
    try {
      let res;
      if (isPastor) {
        res = await api.post('/auth/verify-pastor-otp', { phone, code });
        const { accessToken, refreshToken, user } = res.data;
        // Branch Pastors skip onboarding — go straight to tabs
        await setAuth(user, accessToken, refreshToken);
        await setOnboardingDone();
        router.replace('/(tabs)');
      } else {
        res = await api.post('/auth/verify-otp', { email, code });
        const { accessToken, refreshToken, user } = res.data;
        await setAuth(user, accessToken, refreshToken);
        router.replace('/(onboarding)/step1');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Verification failed. Please try again.'));
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [isComplete, loading, code, email, phone, isPastor]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      let newDevCode: string | undefined;
      if (isPastor) {
        const res = await api.post('/auth/resend-pastor-otp', { phone });
        newDevCode = res.data?.devCode;
      } else {
        await api.post('/auth/send-otp', { email });
      }
      setResendCooldown(RESEND_COOLDOWN);
      setTtl(OTP_TTL_SECONDS);
      setExpired(false);
      setError('');
      if (newDevCode && newDevCode.length === OTP_LENGTH) {
        setDigits(newDevCode.split(''));
      } else {
        setDigits(Array(OTP_LENGTH).fill(''));
        inputs.current[0]?.focus();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : 'Could not resend code. Try again.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>KINGDOM PORTAL</Text>
          <View style={{ width: 30 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.card}>
          {/* Icon */}
          <View style={s.iconWrap}>
            <Ionicons
              name={isPastor ? 'phone-portrait-outline' : 'mail-unread'}
              size={40}
              color={C.accent}
            />
          </View>

          {/* Role badge for Branch Pastor */}
          {isPastor && (
            <View style={s.roleBadge}>
              <Ionicons name="git-branch-outline" size={12} color={C.accent} />
              <Text style={s.roleBadgeText}>BRANCH PASTOR LOGIN</Text>
            </View>
          )}

          <Text style={s.title}>{isPastor ? 'Check Your Phone' : 'Check Your Email'}</Text>
          <Text style={s.subtitle}>
            {isPastor
              ? "We've sent a 6-digit code to your phone number"
              : "We've sent a 6-digit verification code to"}
          </Text>
          <Text style={s.identifierText}>{identifier}</Text>

          {/* TTL Pill */}
          <View style={[s.ttlPill, expired && s.ttlPillExpired]}>
            <Ionicons name={expired ? 'time-outline' : 'timer-outline'} size={14} color={expired ? C.error : C.textGray} />
            <Text style={[s.ttlText, expired && s.ttlTextExpired]}>
              {expired ? 'Code expired — request a new one' : `Expires in ${formatTime(ttl)}`}
            </Text>
          </View>

          {/* Dev auto-fill banner */}
          {!!devCode && (
            <View style={s.devBanner}>
              <Ionicons name="construct-outline" size={13} color="#92400E" />
              <Text style={s.devBannerText}>DEV — code auto-filled: {devCode}</Text>
            </View>
          )}

          {/* OTP Boxes */}
          <View style={s.otpRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                style={[s.otpBox, digit && s.otpBoxFilled, error && s.otpBoxError]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!expired}
              />
            ))}
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={C.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.verifyBtn, (!isComplete || expired) && s.verifyBtnDisabled, loading && { opacity: 0.7 }]}
            onPress={handleVerify}
            disabled={!isComplete || loading || expired}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.dark} />
            ) : (
              <View style={s.verifyBtnInner}>
                <Text style={s.verifyBtnText}>{isPastor ? 'VERIFY CODE' : 'VERIFY EMAIL'}</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color={C.dark} />
              </View>
            )}
          </TouchableOpacity>

          <View style={s.resendRow}>
            <Text style={s.resendBase}>Didn't receive the code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
              <Text style={[s.resendLink, resendCooldown > 0 && s.resendLinkDisabled]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.hint}>
            <Ionicons name="information-circle-outline" size={14} color={C.textGray} />
            <Text style={s.hintText}>
              {isPastor
                ? 'Check your SMS messages for the verification code.'
                : 'Check your spam folder if you don\'t see the email.'}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.accent, letterSpacing: 1.5 },
  card: { flex: 1, backgroundColor: '#F5F5FA', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 28, paddingTop: 36, paddingBottom: 24 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: C.dark, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  roleBadgeText: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: C.textDark, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: C.textGray, textAlign: 'center', lineHeight: 22 },
  identifierText: { fontSize: 15, fontWeight: '700', color: C.textDark, textAlign: 'center', marginBottom: 20 },
  ttlPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'center', marginBottom: 28 },
  ttlPillExpired: { backgroundColor: '#FEF2F2' },
  ttlText: { fontSize: 13, color: C.textGray },
  ttlTextExpired: { color: C.error, fontWeight: '600' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  otpBox: { width: 48, height: 58, borderRadius: 12, borderWidth: 2, borderColor: C.border, backgroundColor: C.white, textAlign: 'center', fontSize: 24, fontWeight: '800', color: C.textDark },
  otpBoxFilled: { borderColor: C.accent, backgroundColor: '#FFFBEA' },
  otpBoxError: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: C.error, flex: 1 },
  verifyBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  verifyBtnDisabled: { backgroundColor: C.border, shadowOpacity: 0 },
  verifyBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyBtnText: { fontSize: 16, fontWeight: '800', color: C.dark, letterSpacing: 1.5 },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  resendBase: { fontSize: 14, color: C.textDark },
  resendLink: { fontSize: 14, fontWeight: '700', color: C.accent },
  resendLinkDisabled: { color: C.textGray },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  hintText: { fontSize: 12, color: C.textGray, textAlign: 'center', flex: 1 },
  devBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B',
  },
  devBannerText: { fontSize: 12, fontWeight: '700', color: '#92400E', flex: 1 },
});
