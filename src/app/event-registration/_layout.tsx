import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

const PASTOR_ROLES = ['senior_pastor', 'branch_pastor'];

/** Event registration is for pastors only (the server enforces this too). */
export default function EventRegistrationLayout() {
  const router = useRouter();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase();
  const allowed = PASTOR_ROLES.includes(role);

  useEffect(() => {
    if (!allowed) router.replace('/(tabs)' as any);
  }, [allowed]);

  if (!allowed) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
