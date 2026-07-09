import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';

export default function Root() {
  const { user, accessToken, onboardingDone, isReady } = useAuthStore();

  if (!isReady) return null;

  if (accessToken) {
    // user.churchId means the church was already created — treat as fully onboarded
    const setupDone = onboardingDone || !!user?.churchId;
    if (!setupDone) return <Redirect href="/(onboarding)/step1" />;
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
