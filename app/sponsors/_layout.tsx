import { Stack } from 'expo-router';

export default function SponsorsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" options={{ presentation: 'card' }} />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/edit" options={{ presentation: 'card' }} />
    </Stack>
  );
}
