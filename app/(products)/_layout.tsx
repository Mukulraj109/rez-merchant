// app/(products)/_layout.tsx
import { Stack } from "expo-router";

export default function ProductsLayout() {
  return (
    <Stack>
      <Stack.Screen name="products" options={{ title: "Products" }} />
    </Stack>
  );
}
