import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  dark: '#120D2E',
  darkCard: '#1E1650',
  accent: '#F5C518',
  white: '#FFFFFF',
  gray: '#8888A0',
  error: '#FF4C4C',
  border: '#2E2860',
};

interface Props {
  title: string;
  subtitle?: string;
  onComplete: (pin: string) => void;
  error?: string | null;
  disabled?: boolean;
  showForgot?: boolean;
  onForgot?: () => void;
  /** Reset trigger — increment to wipe entered digits */
  resetKey?: number;
}

export default function PinPad({
  title, subtitle, onComplete, error, disabled, showForgot, onForgot, resetKey,
}: Props) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [show, setShow] = useState(false);
  const refs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Reset digits when resetKey changes
  React.useEffect(() => {
    setDigits(['', '', '', '']);
    refs[0].current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleDigit = useCallback((index: number, val: string) => {
    if (disabled) return;
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 3) {
      refs[index + 1].current?.focus();
    }
    if (next.every((d) => d !== '')) {
      onComplete(next.join(''));
    }
  }, [digits, disabled, onComplete]);

  const handleBackspace = useCallback((index: number) => {
    if (disabled) return;
    const next = [...digits];
    if (next[index]) {
      next[index] = '';
      setDigits(next);
    } else if (index > 0) {
      next[index - 1] = '';
      setDigits(next);
      refs[index - 1].current?.focus();
    }
  }, [digits, disabled]);

  const handleKey = useCallback((index: number, key: string) => {
    if (key === 'Backspace') handleBackspace(index);
  }, [handleBackspace]);

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

      {/* 4-box display */}
      <View style={s.boxes}>
        {digits.map((d, i) => (
          <View key={i} style={[s.box, error ? s.boxError : d ? s.boxFilled : null]}>
            <TextInput
              ref={refs[i]}
              style={s.boxInput}
              value={show ? d : d ? '•' : ''}
              onChangeText={(v) => handleDigit(i, v)}
              onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              secureTextEntry={false}
              editable={!disabled}
              caretHidden
              selectTextOnFocus
            />
          </View>
        ))}

        <TouchableOpacity onPress={() => setShow((v) => !v)} style={s.eye}>
          <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={C.gray} />
        </TouchableOpacity>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {showForgot && onForgot ? (
        <TouchableOpacity onPress={onForgot} style={s.forgot}>
          <Text style={s.forgotText}>Forgot PIN?</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  title: {
    fontSize: 22, fontWeight: '800', color: C.white,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: C.gray, textAlign: 'center',
    marginBottom: 28, lineHeight: 20,
  },
  boxes: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    marginBottom: 10,
  },
  box: {
    width: 56, height: 64, borderRadius: 12,
    backgroundColor: C.darkCard,
    borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  boxFilled: { borderColor: C.accent },
  boxError: { borderColor: C.error },
  boxInput: {
    fontSize: 28, fontWeight: '800', color: C.white,
    textAlign: 'center', width: '100%', height: '100%',
  },
  eye: { marginLeft: 6, padding: 4 },
  error: {
    fontSize: 13, color: C.error, marginTop: 8, textAlign: 'center',
  },
  forgot: { marginTop: 18 },
  forgotText: { fontSize: 14, color: C.accent, fontWeight: '600' },
});
