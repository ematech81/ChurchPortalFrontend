import { useLocalSearchParams } from 'expo-router';
import MemberProfile from '../../components/MemberProfile';

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemberProfile memberId={id} />;
}
