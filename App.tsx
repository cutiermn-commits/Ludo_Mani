import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GameState, createGame } from './src/engine/game';
import { LocalGame } from './src/ui/LocalGame';
import { MenuScreen } from './src/ui/MenuScreen';
import { OnlineScreen } from './src/ui/OnlineScreen';
import { UI } from './src/ui/theme';

type Screen = { name: 'menu' } | { name: 'local'; game: GameState; id: number } | { name: 'online' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const toMenu = () => setScreen({ name: 'menu' });

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {screen.name === 'local' && <LocalGame key={screen.id} initial={screen.game} onExit={toMenu} />}
        {screen.name === 'online' && <OnlineScreen onExit={toMenu} />}
        {screen.name === 'menu' && (
          <MenuScreen
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
