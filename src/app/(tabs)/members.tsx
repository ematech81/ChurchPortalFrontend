import { View, Text, StyleSheet, StatusBar } from 'react-native';

export default function MembersScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Text style={styles.text}>Members directory coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  text: { color: '#64748b', fontSize: 16 },
});
