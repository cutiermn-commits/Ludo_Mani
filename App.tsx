import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GameState, createGame } from './src/engine/game';
import { GameScreen } from './src/ui/GameScreen';
import { MenuScreen } from './src/ui/MenuScreen';
import { UI } from './src/ui/theme';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState(0);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        {game ? (
          // key forces a fresh GameScreen for every new game
          <GameScreen key={gameId} initial={game} onExit={() => setGame(null)} />
        ) : (
          <MenuScreen onStart={(players, rules) => {
              setGameId((n) => n + 1);
              setGame(createGame(players, rules));
            }} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UI.bg },
});
