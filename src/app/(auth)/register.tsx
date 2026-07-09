import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { C } from '../../constants/theme';

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({ mode: 'onBlur' });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError('');
    try {
      const res = await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
      });
      // Registration no longer returns tokens — OTP verification is required first
      const { email } = res.data;
      router.replace({ pathname: '/(auth)/verify', params: { email } });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? 'Registration failed. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    s.input,
    focused === field && s.inputFocused,
    (errors as any)[field] && s.inputError,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.dark }}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.dark }}>
        <View style={s.logoSection}>
          <View style={s.logoCircle}>
            <Ionicons name="person-add" size={36} color={C.dark} />
          </View>
          <Text style={s.appName}>CREATE ACCOUNT</Text>
          <Text style={s.tagline}>Join your ministry's digital portal</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.card}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>

            {/* Senior Pastor Account Notice */}
            <View style={s.seniorPastorCard}>
              <View style={s.seniorPastorAccent} />
              <View style={{ flex: 1 }}>
                <View style={s.seniorPastorTitleRow}>
                  <Ionicons name="shield-checkmark" size={18} color={C.accent} />
                  <Text style={s.seniorPastorTitle}>Primary Ministry Account</Text>
                </View>
                <Text style={s.seniorPastorBody}>
                  You are creating the <Text style={s.seniorPastorBold}>Senior Pastor / Administrative account</Text> for this ministry. Branch Pastors and additional leadership roles can be assigned later from the Administrative Dashboard.
                </Text>
              </View>
            </View>

            {/* Name Row */}
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>First Name</Text>
                <Controller
                  control={control} name="firstName"
                  rules={{ required: 'Required' }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={inputStyle('firstName')}
                      placeholder="John"
                      placeholderTextColor={C.textGray}
                      value={value} onChangeText={onChange}
                      onFocus={() => setFocused('firstName')}
                      onBlur={() => { onBlur(); setFocused(null); }}
                    />
                  )}
                />
                {errors.firstName && <Text style={s.errorText}>{errors.firstName.message}</Text>}
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Last Name</Text>
                <Controller
                  control={control} name="lastName"
                  rules={{ required: 'Required' }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={inputStyle('lastName')}
                      placeholder="Doe"
                      placeholderTextColor={C.textGray}
                      value={value} onChangeText={onChange}
                      onFocus={() => setFocused('lastName')}
                      onBlur={() => { onBlur(); setFocused(null); }}
                    />
                  )}
                />
                {errors.lastName && <Text style={s.errorText}>{errors.lastName.message}</Text>}
              </View>
            </View>

            {/* Email */}
            <Text style={s.label}>Email Address</Text>
            <Controller
              control={control} name="email"
              rules={{ required: 'Email is required', pattern: { value: /^[\w-.]+@[\w-]+\.[a-z]{2,}$/i, message: 'Enter a valid email' } }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={inputStyle('email')}
                  placeholder="pastor@church.org"
                  placeholderTextColor={C.textGray}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={value} onChangeText={onChange}
                  onFocus={() => setFocused('email')}
                  onBlur={() => { onBlur(); setFocused(null); }}
                />
              )}
            />
            {errors.email && <Text style={s.errorText}>{errors.email.message}</Text>}

            {/* Phone */}
            <Text style={s.label}>Phone Number <Text style={s.optional}>(optional)</Text></Text>
            <Controller
              control={control} name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={inputStyle('phone')}
                  placeholder="+234 800 000 0000"
                  placeholderTextColor={C.textGray}
                  keyboardType="phone-pad"
                  value={value} onChangeText={onChange}
                  onFocus={() => setFocused('phone')}
                  onBlur={() => { onBlur(); setFocused(null); }}
                />
              )}
            />

            {/* Password */}
            <Text style={s.label}>Password</Text>
            <Controller
              control={control} name="password"
              rules={{ required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[s.inputRow, focused === 'password' && s.inputFocused, errors.password && s.inputError]}>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, color: C.textDark }}
                    placeholder="Min. 8 characters"
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

            {/* Confirm Password */}
            <Text style={s.label}>Confirm Password</Text>
            <Controller
              control={control} name="confirmPassword"
              rules={{
                required: 'Please confirm your password',
                validate: (v) => v === watch('password') || 'Passwords do not match',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[s.inputRow, focused === 'confirm' && s.inputFocused, errors.confirmPassword && s.inputError]}>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, color: C.textDark }}
                    placeholder="Re-enter password"
                    placeholderTextColor={C.textGray}
                    secureTextEntry={!showConfirm}
                    value={value} onChangeText={onChange}
                    onFocus={() => setFocused('confirm')}
                    onBlur={() => { onBlur(); setFocused(null); }}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={s.eyeBtn}>
                    <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.textGray} />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.confirmPassword && <Text style={s.errorText}>{errors.confirmPassword.message}</Text>}

            {/* Server Error */}
            {serverError ? (
              <View style={s.serverError}>
                <Ionicons name="alert-circle-outline" size={16} color={C.error} />
                <Text style={s.serverErrorText}>{serverError}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit(onSubmit)}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={C.dark} />
              ) : (
                <View style={s.submitInner}>
                  <Text style={s.submitText}>CREATE ACCOUNT</Text>
                  <Ionicons name="arrow-forward" size={20} color={C.dark} />
                </View>
              )}
            </TouchableOpacity>

            {/* Login link */}
            <View style={s.loginRow}>
              <Text style={s.loginBase}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={s.loginLink}>Sign In</Text>
              </TouchableOpacity>
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
  appName: { fontSize: 24, fontWeight: '800', color: C.accent, letterSpacing: 2, marginBottom: 6 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  card: { flex: 1, backgroundColor: '#F5F5FA', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 28, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: C.textDark, marginBottom: 6, marginTop: 14 },
  optional: { fontSize: 12, color: C.textGray, fontWeight: '400' },
  input: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textDark },
  inputFocused: { borderColor: C.accent },
  inputError: { borderColor: C.error },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 },
  eyeBtn: { padding: 8 },
  errorText: { fontSize: 12, color: C.error, marginTop: 4, marginLeft: 2 },
  serverError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 16 },
  serverErrorText: { fontSize: 13, color: C.error, flex: 1 },
  submitBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24, shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitText: { fontSize: 16, fontWeight: '800', color: C.dark, letterSpacing: 2 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  loginBase: { fontSize: 14, color: C.textDark },
  loginLink: { fontSize: 14, fontWeight: '700', color: C.dark, textDecorationLine: 'underline' },

  // Senior Pastor info card
  seniorPastorCard: { flexDirection: 'row', backgroundColor: C.dark, borderRadius: 14, marginBottom: 20, overflow: 'hidden' },
  seniorPastorAccent: { width: 5, backgroundColor: C.accent },
  seniorPastorTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, padding: 14, paddingBottom: 0 },
  seniorPastorTitle: { fontSize: 14, fontWeight: '800', color: C.accent, letterSpacing: 0.3 },
  seniorPastorBody: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 20, padding: 14, paddingTop: 6 },
  seniorPastorBold: { color: C.white, fontWeight: '700' },
});
