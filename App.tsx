import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GameState, createGame } from './src/engine/game';
import { LocalGame } from './src/ui/LocalGame';
import { MenuScreen } from './src/ui/MenuScreen';
import { OnlineScreen } from './src/ui/OnlineScreen';
import { clearJoinFromUrl, joinCodeFromUrl } from './src/ui/platform';
import { UI } from './src/ui/theme';
import { useProfileName } from './src/storage/profile';

type Screen = { name: 'menu' } | { name: 'local'; game: GameState; id: number } | { name: 'online'; joinCode?: string | null };

// Web invite links look like .../play/?join=ABC123 and open the online screen directly.
const rawJoin = joinCodeFromUrl()?.toUpperCase() ?? '';
const initialJoin = /^[A-Z2-9]{6}$/.test(rawJoin) ? rawJoin : null;

export default function App() {
  const [screen, setScreen] = useState<Screen>(initialJoin ? { name: 'online', joinCode: initialJoin } : { name: 'menu' });
  useEffect(() => clearJoinFromUrl(), []);
  const toMenu = () => setScreen({ name: 'menu' });
  const [profileName, , shuffleProfile] = useProfileName();
  // Rematch: same players, names and rules, fresh board.
  const rematch = (g: GameState) =>
    setScreen({
      name: 'local',
      game: createGame(
        g.players.map((p) => ({ color: p.color, kind: p.kind, difficulty: p.difficulty, name: p.name })),
        g.rules,
      ),
      id: Date.now(),
    });

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {screen.name === 'local' && <LocalGame key={screen.id} initial={screen.game} onExit={toMenu} onRematch={rematch} />}
        {screen.name === 'online' && (
          <OnlineScreen onExit={toMenu} joinCode={screen.joinCode} profileName={profileName} onShuffleProfile={shuffleProfile} />
        )}
        {screen.name === 'menu' && (
          <MenuScreen
            profileName={profileName}
            onShuffleProfile={shuffleProfile}
            onStart={(players, rules) => setScreen({ name: 'local', game: createGame(players, rules), id: Date.now() })}
            onResume={(game) => setScreen({ name: 'local', game, id: Date.now() })}
            onOnline={() => setScreen({ name: 'online' })}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
});
