import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import PinGate from '../../components/pin/PinGate';

const PASTOR_ROLES = ['senior_pastor', 'branch_pastor'];

export default function FinanceLayout() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? '').toLowerCase();

  useEffect(() => {
    if (!PASTOR_ROLES.includes(role)) {
      router.replace('/(tabs)' as any);
    }
  }, [role]);

  if (!PASTOR_ROLES.includes(role)) return null;

  return (
    <PinGate sectionLabel="Finance">
      <Stack screenOptions={{ headerShown: false }} />
    </PinGate>
  );
}
