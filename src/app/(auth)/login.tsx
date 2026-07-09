import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { C } from '../../constants/theme';

type AdminForm = { email: string; password: string };

// ── Admin Login (Senior Pastor — email + password) ────────────────────────────

function AdminLoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<AdminForm>({ mode: 'onBlur' });

  const onSubmit = async (data: AdminForm) => {
    setLoading(true);
    setServerError('');
    try {
      const res = await api.post('/auth/login', data);
      const { accessToken, refreshToken, user } = res.data;
      await setAuth(user, accessToken, refreshToken);
      router.replace(user.churchId ? '/(tabs)' : '/(onboarding)/step1');
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.code === 'EMAIL_NOT_VERIFIED') {
        router.push({ pathname: '/(auth)/verify', params: { email: errData.email } });
        return;
      }
      const msg = errData?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={s.fieldGroup}>
        <View style={s.fieldLabel}>
          <Ionicons name="mail-outline" size={16} color={C.textDark} />
          <Text style={s.labelText}>Email Address</Text>
        </View>
        <Controller
          control={control} name="email"
          rules={{ required: 'Email is required', pattern: { value: /^[\w-.]+@[\w-]+\.[a-z]{2,}$/i, message: 'Enter a valid email' } }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[s.input, focused === 'email' && s.inputFocused, errors.email && s.inputError]}
              placeholder="pastor@church.org"
              placeholderTextColor={C.textGray}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={value} onChangeText={onChange}
              onFocus={() => setFocused('email')}
              onBlur={() => { onBlur(); setFocused(null); }}
            />
          )}
        />
        {errors.email && <Text style={s.errorText}>{errors.email.message}</Text>}
      </View>

      <View style={s.fieldGroup}>
        <View style={s.fieldLabel}>
          <Ionicons name="lock-closed-outline" size={16} color={C.textDark} />
          <Text style={s.labelText}>Password</Text>
          <TouchableOpacity style={s.forgotBtn}>
            <Text style={s.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        <Controller
          control={control} name="password"
          rules={{ required: 'Password is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={[s.inputRow, focused === 'password' && s.inputFocused, errors.password && s.inputError]}>
              <TextInput
                style={{ flex: 1, fontSize: 15, color: C.textDark, paddingVertical: 14 }}
                placeholder="••••••••"
                placeholderTextColor={C.textGray}
                secureTextEntry={!showPassword}
                value={value} onChangeText={onChange}
                onFocus={() => setFocused('password')}
                onBlur={() => { onBlur(); setFocused(null); }}
              />
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={s.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.textGray} />
              </TouchableOpacity>
            </View>
          )}
        />
        {errors.password && <Text style={s.errorText}>{errors.password.message}</Text>}
      </View>

      {serverError ? (
        <View style={s.serverError}>
          <Ionicons name="alert-circle-outline" size={16} color={C.error} />
          <Text style={s.serverErrorText}>{serverError}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[s.loginBtn, loading && { opacity: 0.7 }]}
        onPress={handleSubmit(onSubmit)}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={C.dark} />
        ) : (
          <View style={s.loginBtnInner}>
            <Text style={s.loginBtnText}>LOGIN</Text>
            <Ionicons name="log-in-outline" size={22} color={C.dark} />
          </View>
        )}
      </TouchableOpacity>

      {/* Admin access info */}
      <View style={s.accessInfo}>
        <Ionicons name="information-circle-outline" size={14} color={C.textGray} />
        <Text style={s.accessInfoText}>Full ministry-wide access: all branches, members & reports.</Text>
      </View>
    </>
  );
}

// ── Branch Pastor Login (phone number + OTP) ──────────────────────────────────

function BranchPastorLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const [errorTitle,  setErrorTitle]  = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  const handleSendCode = async () => {
    const trimmed = phone.trim();
    if (!trimmed) { setServerError('Please enter your phone number.'); return; }
    setLoading(true);
    setServerError('');
    setErrorTitle('');
    setErrorDetail('');
    try {
      const res = await api.post('/auth/login-pastor', { phone: trimmed });
      const devCode = res.data?.devCode;
      router.push({
        pathname: '/(auth)/verify',
        params: { phone: trimmed, mode: 'pastor', ...(devCode ? { devCode } : {}) },
      } as any);
    } catch (err: any) {
      const data = err.response?.data;
      // New structured error format
      if (data?.message && data?.detail) {
        setErrorTitle(data.message);
        setErrorDetail(data.detail);
      } else {
        const msg = data?.message;
        setServerError(Array.isArray(msg) ? msg[0] : (msg ?? 'Could not send code. Check your phone number.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Info card */}
      <View style={s.pastorInfoCard}>
        <Ionicons name="git-branch-outline" size={18} color={C.accent} />
        <Text style={s.pastorInfoText}>
          Your phone number must already be registered and assigned a Branch Pastor role by your Senior Pastor.
        </Text>
      </View>

      <View style={s.fieldGroup}>
        <View style={s.fieldLabel}>
          <Ionicons name="phone-portrait-outline" size={16} color={C.textDark} />
          <Text style={s.labelText}>Phone Number</Text>
        </View>
        <TextInput
          style={[s.input, focused && s.inputFocused]}
          placeholder="+234 800 000 0000"
          placeholderTextColor={C.textGray}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(t) => { setPhone(t); setServerError(''); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>

      {/* Structured access-denied error (new format) */}
      {errorTitle ? (
        <View style={s.accessDeniedBox}>
          <View style={s.accessDeniedHeader}>
            <Ionicons name="shield-checkmark" size={20} color={C.error} />
            <Text style={s.accessDeniedTitle}>{errorTitle}</Text>
          </View>
          <Text style={s.accessDeniedDetail}>{errorDetail}</Text>
        </View>
      ) : serverError ? (
        <View style={s.serverError}>
          <Ionicons name="alert-circle-outline" size={16} color={C.error} />
          <Text style={s.serverErrorText}>{serverError}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[s.loginBtn, loading && { opacity: 0.7 }]}
        onPress={handleSendCode}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={C.dark} />
        ) : (
          <View style={s.loginBtnInner}>
            <Text style={s.loginBtnText}>SEND VERIFICATION CODE</Text>
            <Ionicons name="send-outline" size={20} color={C.dark} />
          </View>
        )}
      </TouchableOpacity>

      {/* Access scope info */}
      <View style={s.accessInfo}>
        <Ionicons name="information-circle-outline" size={14} color={C.textGray} />
        <Text style={s.accessInfoText}>Branch-level access only: your assigned branch members, attendance & activities.</Text>
      </View>
    </>
  );
}

// ── Worker Login (unique code) ─────────────────────────────────────────────────

function WorkerLoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorTitle,  setErrorTitle]  = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [serverError, setServerError] = useState('');

  const handleLogin = async () => {
    const trimmed = code.trim();
    if (!trimmed) { setServerError('Please enter your worker code.'); return; }
    setLoading(true);
    setServerError('');
    setErrorTitle('');
    setErrorDetail('');
    try {
      const res = await api.post('/auth/worker/login', { code: trimmed });
      const { accessToken, refreshToken, user } = res.data;
      await setAuth(user, accessToken, refreshToken);
      router.replace('/worker-portal' as any);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.message && data?.detail) {
        setErrorTitle(data.message);
        setErrorDetail(data.detail);
      } else {
        const msg = data?.message;
        setServerError(Array.isArray(msg) ? msg[0] : (msg ?? 'Invalid code. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={s.pastorInfoCard}>
        <Ionicons name="key-outline" size={18} color={C.accent} />
        <Text style={s.pastorInfoText}>
          Use the unique code your pastor gave you when you were assigned a follow-up role.
        </Text>
      </View>

      <View style={s.fieldGroup}>
        <View style={s.fieldLabel}>
          <Ionicons name="barcode-outline" size={16} color={C.textDark} />
          <Text style={s.labelText}>Worker Code</Text>
        </View>
        <TextInput
          style={[s.input, focused && s.inputFocused]}
          placeholder="e.g. emma-01k7p2"
          placeholderTextColor={C.textGray}
          autoCapitalize="none"
          autoCorrect={false}
          value={code}
          onChangeText={(t) => { setCode(t); setServerError(''); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <Text style={s.codeHint}>Case-insensitive. Copy it exactly as given.</Text>
      </View>

      {errorTitle ? (
        <View style={s.accessDeniedBox}>
          <View style={s.accessDeniedHeader}>
            <Ionicons name="shield-checkmark" size={20} color={C.error} />
            <Text style={s.accessDeniedTitle}>{errorTitle}</Text>
          </View>
          <Text style={s.accessDeniedDetail}>{errorDetail}</Text>
        </View>
      ) : serverError ? (
        <View style={s.serverError}>
          <Ionicons name="alert-circle-outline" size={16} color={C.error} />
          <Text style={s.serverErrorText}>{serverError}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[s.loginBtn, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={C.dark} />
        ) : (
          <View style={s.loginBtnInner}>
            <Text style={s.loginBtnText}>ENTER PORTAL</Text>
            <Ionicons name="arrow-forward-circle-outline" size={20} color={C.dark} />
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.forgotCodeRow}
        onPress={() => Alert.alert(
          'Forgot your code?',
          'Contact the pastor who assigned you. They can regenerate your code from your worker profile in the Administrative dashboard.',
          [{ text: 'OK' }]
        )}
        activeOpacity={0.7}
      >
        <Text style={s.forgotCodeText}>Forgot your code?</Text>
      </TouchableOpacity>

      <View style={s.accessInfo}>
        <Ionicons name="information-circle-outline" size={14} color={C.textGray} />
        <Text style={s.accessInfoText}>Worker access only: your assigned follow-up tasks, visits, and journeys.</Text>
      </View>
    </>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'admin' | 'pastor' | 'worker'>('admin');

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.logoSection}>
          <View style={s.logoCircle}>
            <Ionicons name="shield-checkmark" size={40} color={C.dark} />
          </View>
          <Text style={s.appName}>KINGDOM PORTAL</Text>
          <Text style={s.tagline}>Ministry management for the faithful</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.card}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>

            {/* Mode Toggle */}
            <View style={s.modeToggle}>
              <TouchableOpacity
                style={[s.modeTab, mode === 'admin' && s.modeTabActive]}
                onPress={() => setMode('admin')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-circle-outline" size={14} color={mode === 'admin' ? C.dark : C.textGray} />
                <Text style={[s.modeTabText, mode === 'admin' && s.modeTabTextActive]}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modeTab, mode === 'pastor' && s.modeTabActive]}
                onPress={() => setMode('pastor')}
                activeOpacity={0.8}
              >
                <Ionicons name="git-branch-outline" size={14} color={mode === 'pastor' ? C.dark : C.textGray} />
                <Text style={[s.modeTabText, mode === 'pastor' && s.modeTabTextActive]}>Pastor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modeTab, mode === 'worker' && s.modeTabActive]}
                onPress={() => setMode('worker')}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={14} color={mode === 'worker' ? C.dark : C.textGray} />
                <Text style={[s.modeTabText, mode === 'worker' && s.modeTabTextActive]}>Worker</Text>
              </TouchableOpacity>
            </View>

            {/* Form by mode */}
            {mode === 'admin' ? <AdminLoginForm /> : mode === 'pastor' ? <BranchPastorLoginForm /> : <WorkerLoginForm />}

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>NEW MINISTRY?</Text>
              <View style={s.dividerLine} />
            </View>

            <TouchableOpacity style={s.applyRow} onPress={() => router.push('/(auth)/register')} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={16} color={C.dark} />
              <Text style={s.applyLink}>Create Account</Text>
            </TouchableOpacity>

            <View style={s.footer}>
              <View style={s.footerDivider} />
              <View style={s.footerRow}>
                <Text style={s.footerCopy}>© {new Date().getFullYear()} Kingdom Portal</Text>
                <View style={s.footerLinks}>
                  <TouchableOpacity><Text style={s.footerLink}>Privacy</Text></TouchableOpacity>
                  <TouchableOpacity><Text style={s.footerLink}>Help</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  logoSection: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  appName: { fontSize: 26, fontWeight: '800', color: C.accent, letterSpacing: 2, marginBottom: 6 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', letterSpacing: 0.3 },

  card: { flex: 1, backgroundColor: '#F5F5FA', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },

  // Mode toggle
  modeToggle: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 14, padding: 4, marginBottom: 24, borderWidth: 1.5, borderColor: C.border },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
  modeTabActive: { backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 6, elevation: 2 },
  modeTabText: { fontSize: 13, fontWeight: '600', color: C.textGray },
  modeTabTextActive: { color: C.dark, fontWeight: '800' },

  // Branch Pastor info card
  pastorInfoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.dark, borderRadius: 12, padding: 14, marginBottom: 20 },
  pastorInfoText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },

  // Access scope
  accessInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, marginBottom: 20 },
  accessInfoText: { flex: 1, fontSize: 12, color: C.textGray, lineHeight: 18 },

  // Form fields
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  labelText: { fontSize: 14, fontWeight: '600', color: C.textDark, flex: 1 },
  forgotBtn: { marginLeft: 'auto' },
  forgotText: { fontSize: 13, color: C.accent, fontWeight: '600' },
  input: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.textDark },
  inputFocused: { borderColor: C.accent },
  inputError: { borderColor: C.error },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingLeft: 16, paddingRight: 12 },
  eyeBtn: { padding: 4 },
  errorText: { fontSize: 12, color: C.error, marginTop: 4, marginLeft: 4 },
  serverError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 8 },
  serverErrorText: { fontSize: 13, color: C.error, flex: 1 },
  accessDeniedBox: { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: C.error },
  accessDeniedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  accessDeniedTitle: { fontSize: 16, fontWeight: '800', color: C.error },
  accessDeniedDetail: { fontSize: 14, color: '#7F1D1D', lineHeight: 21 },

  // Worker code field extras
  codeHint: { fontSize: 11, color: C.textGray, marginTop: 5 },
  forgotCodeRow: { alignItems: 'center', marginTop: 12, marginBottom: 4 },
  forgotCodeText: { fontSize: 13, color: C.accent, fontWeight: '700' },

  // Login button
  loginBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  loginBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loginBtnText: { fontSize: 15, fontWeight: '800', color: C.dark, letterSpacing: 1.5 },

  // Footer
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 11, color: C.textGray, fontWeight: '700', letterSpacing: 1 },
  applyRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 24 },
  applyLink: { fontSize: 14, fontWeight: '800', color: C.dark },
  footer: { marginTop: 8 },
  footerDivider: { height: 1, backgroundColor: C.border, marginBottom: 16 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerCopy: { fontSize: 12, color: C.textGray },
  footerLinks: { flexDirection: 'row', gap: 16 },
  footerLink: { fontSize: 12, color: C.textGray },
});
