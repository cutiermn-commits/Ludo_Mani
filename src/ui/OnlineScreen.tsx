import React, { useEffect, useState } from 'react';
import { ScrollView, ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Color } from '../engine/board';
import { Difficulty, Rules, currentPlayer } from '../engine/game';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, SeatView } from '../net/protocol';
import { SERVER_URL, useOnlineRoom } from '../net/useOnlineRoom';
import { GameView } from './GameView';
import { DIFFICULTY_LABEL, RULE_LABELS } from './MenuScreen';
import { ShareResult, confirmAction, shareInvite, webJoinUrl } from './platform';
import { LABEL, PALETTE, UI } from './theme';

import { WEB_URL } from '../config';
import { NameChip } from './NameChip';
import { displayName } from '../engine/quips';

/** Invite link: the current web page when playing in a browser, otherwise the public web address. */
function inviteUrl(code: string): string {
  return webJoinUrl(code) ?? `${WEB_URL}/?join=${code}`;
}

export function inviteText(code: string, from?: string | null): string {
  return `🎲 ${from ?? 'A friend'} invited you to play Ludo!\nRoom code: ${code}\nTap the link to join (works in any browser, or enter the code in the app):`;
}

const NEXT_SEAT: Record<string, { kind: 'bot' | 'open'; difficulty?: Difficulty }> = {
  open: { kind: 'bot', difficulty: 'easy' },
  easy: { kind: 'bot', difficulty: 'medium' },
  medium: { kind: 'bot', difficulty: 'hard' },
  hard: { kind: 'open' },
};

function seatLabel(s: SeatView, mine: boolean): string {
  if (s.kind === 'open') return 'Open – waiting';
  if (s.kind === 'bot') return `🤖 Computer · ${DIFFICULTY_LABEL[s.difficulty ?? 'medium']}`;
  if (mine) return 'You';
  return s.connected ? 'Player' : 'Player (offline)';
}

function seatTitle(s: SeatView): string {
  return s.kind === 'open' ? LABEL[s.color] : (s.name ?? LABEL[s.color]);
}

/** Counts down from a server-supplied "ms left", measured from when it arrived. */
function useCountdown(msLeft: number | null, key: unknown): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (msLeft === null) return setLeft(null);
    const deadline = Date.now() + msLeft;
    const tick = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [msLeft, key]);
  return left;
}

export function OnlineScreen({
  onExit,
  joinCode,
  profileName,
  onShuffleProfile,
}: {
  onExit: () => void;
  joinCode?: string | null;
  profileName: string | null;
  onShuffleProfile: () => string;
}) {
  const online = useOnlineRoom(profileName);
  const { room, me, status, error } = online;
  const [code, setCode] = useState(joinCode ?? '');
  const [shared, setShared] = useState<ShareResult | null>(null);

  // Opened from an invite link (web "?join=CODE"): join straight away.
  useEffect(() => {
    if (joinCode && joinCode.length === ROOM_CODE_LENGTH && SERVER_URL) online.join(joinCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const secondsLeft = useCountdown(room?.turnMsLeft ?? null, room?.state);

  const leave = () => {
    online.leave();
    onExit();
  };

  // ---------- in game ----------
  if (room?.state && me) {
    const cur = currentPlayer(room.state);
    const waitingOn = room.state.phase !== 'over' && cur.kind === 'human' && cur.color !== me.color;
    const curSeat = room.seats.find((s) => s.color === cur.color);
    const banner =
      status !== 'open'
        ? 'Connection lost – reconnecting…'
        : waitingOn && secondsLeft !== null
          ? `Waiting for ${displayName(cur)}${curSeat && !curSeat.connected ? ' (offline)' : ''} · auto-move in ${secondsLeft}s`
          : cur.color === me.color && secondsLeft !== null && secondsLeft <= 10 && room.state.phase !== 'over'
            ? `Your turn · auto-move in ${secondsLeft}s`
            : null;
    return (
      <GameView
        state={room.state}
        canAct={(c: Color) => c === me.color && status === 'open'}
        onRoll={online.roll}
        onMove={online.move}
        youColor={me.color}
        banner={banner}
        onExit={() =>
          room.state!.phase === 'over'
            ? leave()
            : confirmAction('Leave game?', 'A computer player will take over your colour.', 'Leave', leave)
        }
      />
    );
  }

  // ---------- lobby ----------
  if (room && me) {
    const isHost = room.hostColor === me.color;
    const filled = room.seats.filter((s) => s.kind !== 'open').length;
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <NameChip label="You are" name={profileName} onShuffle={() => online.rename(onShuffleProfile())} />
        <Text style={styles.label}>Room code</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Room code ${room.code.split('').join(' ')}. Tap to share.`}
          onPress={async () => setShared(await shareInvite(inviteText(room.code, profileName), inviteUrl(room.code)))}
        >
          <Text style={styles.code}>{room.code}</Text>
          <Text style={styles.hint}>
            {shared === 'copied' ? 'Invite link copied – paste it to your friends' : shared === 'failed' ? 'Tell your friends this code' : 'Tap to share an invite with friends'}
          </Text>
        </Pressable>

        <View style={styles.seats}>
          {room.seats.map((s) => {
            const mine = s.color === me.color;
            const editable = isHost && s.kind !== 'human';
            const nextKey = s.kind === 'open' ? 'open' : (s.difficulty ?? 'medium');
            return (
              <Pressable
                key={s.color}
                disabled={!editable}
                accessibilityRole="button"
                accessibilityLabel={`${LABEL[s.color]}: ${seatTitle(s)}, ${seatLabel(s, mine)}${editable ? '. Tap to change.' : ''}`}
                onPress={() => {
                  const n = NEXT_SEAT[nextKey];
                  online.setSeat(s.color, n.kind, n.difficulty);
                }}
                style={[styles.seat, { backgroundColor: s.kind === 'open' ? UI.surface : PALETTE[s.color].main }]}
              >
                <Text style={styles.seatColor} numberOfLines={1}>
                  {seatTitle(s)}
                </Text>
                <Text style={styles.seatKind}>{seatLabel(s, mine)}</Text>
                {room.hostColor === s.color && <Text style={styles.host}>HOST</Text>}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rules}>
          {RULE_LABELS.map(([k, label]) => (
            <View key={k} style={styles.ruleRow}>
              <Text style={styles.ruleText}>{label}</Text>
              <Switch disabled={!isHost} value={room.rules[k]} onValueChange={(v) => online.setRules({ ...room.rules, [k]: v } as Rules)} />
            </View>
          ))}
        </View>

        {isHost ? (
          <Pressable
            disabled={filled < 2}
            accessibilityRole="button"
            onPress={online.start}
            style={({ pressed }) => [styles.primary, { opacity: filled < 2 ? 0.4 : pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.primaryText}>{filled < 2 ? 'Waiting for players…' : 'Start game'}</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>Waiting for the host to start. Empty seats can be given to computer players.</Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={leave} accessibilityRole="button" hitSlop={10}>
          <Text style={styles.link}>Leave room</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ---------- create / join ----------
  const busy = status === 'connecting' || status === 'reconnecting';
  const validCode = code.length === ROOM_CODE_LENGTH;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Play online</Text>
      <NameChip label="You are" name={profileName} onShuffle={onShuffleProfile} />
      {!SERVER_URL && <Text style={styles.error}>Online play is not configured in this build.</Text>}

      <Pressable
        disabled={busy || !SERVER_URL}
        accessibilityRole="button"
        onPress={online.create}
        style={({ pressed }) => [styles.primary, { opacity: busy || !SERVER_URL ? 0.5 : pressed ? 0.8 : 1 }]}
      >
        <Text style={styles.primaryText}>Create a room</Text>
      </Pressable>

      <Text style={styles.or}>or join a friend</Text>
      <TextInput
        value={code}
        onChangeText={(t) =>
          setCode(
            t
              .toUpperCase()
              .split('')
              .filter((ch) => ROOM_CODE_ALPHABET.includes(ch))
              .join('')
              .slice(0, ROOM_CODE_LENGTH),
          )
        }
        placeholder="ROOM CODE"
        placeholderTextColor={UI.muted}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={ROOM_CODE_LENGTH}
        style={styles.input}
        accessibilityLabel="Room code"
        returnKeyType="go"
        onSubmitEditing={() => validCode && online.join(code)}
      />
      <Pressable
        disabled={!validCode || busy || !SERVER_URL}
        accessibilityRole="button"
        onPress={() => online.join(code)}
        style={({ pressed }) => [styles.secondary, { opacity: !validCode || busy ? 0.4 : pressed ? 0.8 : 1 }]}
      >
        <Text style={styles.secondaryText}>Join</Text>
      </Pressable>

      {busy && <ActivityIndicator color={UI.accent} />}
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={leave} accessibilityRole="button" hitSlop={10}>
        <Text style={styles.link}>‹ Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  wrap: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { color: UI.text, fontSize: 34, fontWeight: '900', textAlign: 'center' },
  label: { color: UI.muted, textAlign: 'center', fontSize: 14 },
  code: { color: UI.text, fontSize: 48, fontWeight: '900', letterSpacing: 10, textAlign: 'center' },
  hint: { color: UI.muted, textAlign: 'center', fontSize: 14 },
  or: { color: UI.muted, textAlign: 'center', marginTop: 8 },
  input: {
    backgroundColor: UI.surface,
    color: UI.text,
    borderRadius: 14,
    paddingVertical: 14,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
  },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  seat: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  seatColor: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  seatKind: { color: '#FFFFFF', fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 6 },
  host: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', marginTop: 4, opacity: 0.85 },
  rules: { backgroundColor: UI.surface, borderRadius: 16, padding: 16, gap: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  ruleText: { color: UI.text, fontSize: 15, flex: 1 },
  primary: { backgroundColor: UI.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryText: { color: '#1A1A1A', fontSize: 18, fontWeight: '800' },
  secondary: { backgroundColor: UI.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: UI.accent },
  secondaryText: { color: UI.text, fontSize: 17, fontWeight: '800' },
  error: { color: '#FF8A80', textAlign: 'center', fontSize: 15 },
  link: { color: UI.muted, textAlign: 'center', textDecorationLine: 'underline', fontSize: 15 },
});
