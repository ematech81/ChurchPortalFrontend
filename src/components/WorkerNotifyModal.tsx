import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Linking, Clipboard, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  dark: '#120D2E', darkCard: '#1E1650', accent: '#F5C518',
  white: '#FFFFFF', textDark: '#120D2E', textGray: '#8888A0',
  error: '#FF4C4C', green: '#25D366', border: '#E8E8EF',
};

export interface WorkerResult {
  id: string;
  name: string;
  phone: string | null;
  isNewCode: boolean;
  loginCode: string | null;
  loginCodeGeneratedAt: string | null;
}

export interface MessageTemplates {
  whatsapp: string;
  sms: string;
  whatsappDeepLink: string | null;
  smsDeepLink: string | null;
  telLink: string | null;
}

interface Props {
  visible: boolean;
  worker: WorkerResult | null;
  memberName: string;
  messageTemplates: MessageTemplates | null;
  onDismiss: () => void;
}

export default function WorkerNotifyModal({
  visible, worker, memberName, messageTemplates, onDismiss,
}: Props) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  if (!worker) return null;

  const hasPhone = !!(worker.phone?.trim());

  const copyCode = () => {
    if (!worker.loginCode) return;
    Clipboard.setString(worker.loginCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const openLink = async (url: string | null, label: string) => {
    if (!url) return;
    setOpening(label);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', `Could not open ${label}.`);
    } finally {
      setTimeout(() => setOpening(null), 1500);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {/* non-dismissible — must use button */}}
    >
      <View style={s.overlay}>
        <View style={s.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
            bounces={false}
          >
            {/* Header */}
            <View style={s.header}>
              <View style={s.headerIconRing}>
                <Ionicons name="checkmark-circle" size={28} color={C.accent} />
              </View>
              <Text style={s.headerTitle}>Worker Assigned!</Text>
              <Text style={s.headerSub}>
                <Text style={s.headerAccent}>{worker.name}</Text> will follow up with{' '}
                <Text style={s.headerAccent}>{memberName}</Text>.
              </Text>
            </View>

            {/* Login code section */}
            {worker.loginCode && (
              <View style={s.codeSection}>
                <View style={s.codeSectionHeader}>
                  <Ionicons name="key-outline" size={14} color={C.dark} />
                  <Text style={s.codeSectionLabel}>
                    {worker.isNewCode ? 'NEW LOGIN CODE GENERATED' : 'CURRENT LOGIN CODE'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.codeBox}
                  onPress={copyCode}
                  activeOpacity={0.8}
                >
                  <Text style={s.codeText}>{worker.loginCode}</Text>
                  <View style={s.copyBtn}>
                    <Ionicons
                      name={codeCopied ? 'checkmark-circle' : 'copy-outline'}
                      size={18}
                      color={C.dark}
                    />
                    <Text style={s.copyBtnText}>{codeCopied ? 'Copied!' : 'Tap to copy'}</Text>
                  </View>
                </TouchableOpacity>
                <Text style={s.codeNote}>
                  Share this code with {worker.name}. They will use the "Worker" login tab in the app.
                </Text>
              </View>
            )}

            {/* No phone warning */}
            {!hasPhone && (
              <View style={s.noPhoneWarn}>
                <Ionicons name="warning-outline" size={16} color={C.error} />
                <Text style={s.noPhoneText}>
                  {worker.name} has no phone number on file. Add one to enable WhatsApp or SMS.
                </Text>
              </View>
            )}

            {/* Action label */}
            <Text style={s.actionLabel}>NOTIFY WORKER VIA</Text>

            {/* WhatsApp */}
            <TouchableOpacity
              style={[s.btn, s.btnWhatsApp, !hasPhone && s.btnDisabled]}
              onPress={() => openLink(messageTemplates?.whatsappDeepLink ?? null, 'WhatsApp')}
              disabled={!hasPhone || opening === 'WhatsApp'}
              activeOpacity={0.85}
            >
              {opening === 'WhatsApp'
                ? <ActivityIndicator color={C.white} size="small" />
                : <>
                    <Ionicons name="logo-whatsapp" size={20} color={C.white} />
                    <Text style={s.btnText}>Send via WhatsApp</Text>
                  </>
              }
            </TouchableOpacity>

            {/* SMS */}
            <TouchableOpacity
              style={[s.btn, s.btnSms, !hasPhone && s.btnDisabled]}
              onPress={() => openLink(messageTemplates?.smsDeepLink ?? null, 'Messages')}
              disabled={!hasPhone || opening === 'Messages'}
              activeOpacity={0.85}
            >
              {opening === 'Messages'
                ? <ActivityIndicator color={C.white} size="small" />
                : <>
                    <Ionicons name="chatbubble-outline" size={20} color={C.white} />
                    <Text style={s.btnText}>Send via SMS</Text>
                  </>
              }
            </TouchableOpacity>

            {/* Call */}
            <TouchableOpacity
              style={[s.btn, s.btnCall, !hasPhone && s.btnDisabled]}
              onPress={() => openLink(messageTemplates?.telLink ?? null, 'Phone')}
              disabled={!hasPhone || opening === 'Phone'}
              activeOpacity={0.85}
            >
              {opening === 'Phone'
                ? <ActivityIndicator color={C.dark} size="small" />
                : <>
                    <Ionicons name="call-outline" size={20} color={C.dark} />
                    <Text style={[s.btnText, { color: C.dark }]}>Call {worker.name}</Text>
                  </>
              }
            </TouchableOpacity>

            {/* Notify later */}
            <TouchableOpacity style={s.laterBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={s.laterText}>I'll notify them later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  container: {
    width: '100%', maxHeight: '92%',
    backgroundColor: C.dark, borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, elevation: 16,
  },
  scrollContent: { padding: 24, paddingBottom: 32 },

  header: { alignItems: 'center', marginBottom: 24 },
  headerIconRing: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(245,197,24,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 8, textAlign: 'center' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  headerAccent: { color: C.accent, fontWeight: '700' },

  // Code section — gold background, matches SuccessModal pattern
  codeSection: {
    backgroundColor: C.accent, borderRadius: 16, padding: 18, marginBottom: 16,
  },
  codeSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  codeSectionLabel: { fontSize: 10, fontWeight: '800', color: C.dark, letterSpacing: 1.2 },
  codeBox: {
    backgroundColor: 'rgba(18,13,46,0.12)', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 8, marginBottom: 10,
  },
  codeText: { fontSize: 22, fontWeight: '900', color: C.dark, letterSpacing: 2, fontFamily: 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: C.dark },
  codeNote: { fontSize: 12, color: 'rgba(18,13,46,0.65)', textAlign: 'center', lineHeight: 18 },

  noPhoneWarn: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: 'rgba(255,76,76,0.1)', borderRadius: 12, padding: 12, marginBottom: 16,
  },
  noPhoneText: { flex: 1, fontSize: 12, color: C.error, lineHeight: 18 },

  actionLabel: {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5, textAlign: 'center', marginBottom: 12,
  },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 15, marginBottom: 10,
  },
  btnWhatsApp: { backgroundColor: C.green },
  btnSms:      { backgroundColor: '#3B82F6' },
  btnCall:     { backgroundColor: C.accent },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 15, fontWeight: '800', color: C.white, letterSpacing: 0.3 },

  laterBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  laterText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
});
