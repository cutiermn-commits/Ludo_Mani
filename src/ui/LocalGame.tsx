import React, { useCallback, useEffect, useState } from 'react';
import { chooseBotMove } from '../engine/ai';
import { GameState, currentPlayer, legalMoves, move, roll } from '../engine/game';
import { saveGame } from '../storage/savedGame';
import { GameView } from './GameView';

const BOT_ROLL_DELAY = 700;
const BOT_MOVE_DELAY = 550;

const rollDie = () => Math.floor(Math.random() * 6) + 1;

/** Pass-and-play on one device, with computer players driven locally. */
export function LocalGame({ initial, onExit, onRematch }: { initial: GameState; onExit: () => void; onRematch: (g: GameState) => void }) {
  const [state, setState] = useState(initial);

  const doRoll = useCallback(() => setState((s) => (s.phase === 'roll' ? roll(s, rollDie()) : s)), []);
  const doMove = useCallback(
    (token: number) => setState((s) => (s.phase === 'move' && legalMoves(s).includes(token) ? move(s, token) : s)),
    [],
  );

  // Save after every change so the game can be resumed after the app is closed.
  // A finished game removes the save.
  useEffect(() => {
    saveGame(state);
  }, [state]);

  useEffect(() => {
    const p = currentPlayer(state);
    if (state.phase === 'over' || p.kind !== 'bot') return;
    const t =
      state.phase === 'roll'
        ? setTimeout(doRoll, BOT_ROLL_DELAY)
        : setTimeout(() => doMove(chooseBotMove(state, p.difficulty)), BOT_MOVE_DELAY);
    return () => clearTimeout(t);
  }, [state, doRoll, doMove]);

  return <GameView state={state} canAct={() => true} onRoll={doRoll} onMove={doMove} onExit={onExit} onRematch={() => onRematch(state)} />;
}
