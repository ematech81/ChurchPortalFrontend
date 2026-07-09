import { useLocalSearchParams } from 'expo-router';
import MemberProfile from '../../../components/MemberProfile';

// This route lives under admin/_layout.tsx which wraps the entire stack in
// <PinGate>. Reaching this screen means the user passed PIN authentication.
// MemberProfile.adminMode={true} unlocks the Remove Member button (subject to
// the role and self-delete checks inside MemberProfile).
export default function AdminMemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemberProfile memberId={id} />;
}
