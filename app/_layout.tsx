import { Stack } from "expo-router";
import { GameModeProvider } from "./contexts/GameModeContext";

export default function RootLayout() {
  return (
    <GameModeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      />
    </GameModeProvider>
  );
}

