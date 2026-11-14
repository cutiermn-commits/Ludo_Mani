import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Color } from '../engine/board';
import { Difficulty, Rules } from '../engine/game';
import { ClientMessage, PROTOCOL_VERSION, RoomView, ServerMessage } from './protocol';
import { isAllowedName } from '../engine/names';

// Set in .env / EAS environment: EXPO_PUBLIC_SERVER_URL=wss://your-server.example.com
// iOS App Transport Security blocks plain ws:// to remote hosts in release builds, so use wss:// in production.
export const SERVER_URL: string | undefined = process.env.EXPO_PUBLIC_SERVER_URL;

export type ConnStatus = 'idle' | 'connecting' | 'open' | 'reconnecting';

interface Identity {
  code: string;
  playerId: string;
  secret: string;
  color: Color;
}

type Intent = { t: 'create' } | { t: 'join'; code: string } | null;

const PING_MS = 20_000;
const MAX_BACKOFF_MS = 10_000;

export function useOnlineRoom(name?: string | null) {
  const nameRef = useRef(name);
  nameRef.current = name;
  const [status, setStatus] = useState<ConnStatus>('idle');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [me, setMe] = useState<Identity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const meRef = useRef<Identity | null>(null);
  const intent = useRef<Intent>(null);
  const attempts = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wanted = useRef(false); // do we want a live connection?

  const nameField = () => (isAllowedName(nameRef.current) ? { name: nameRef.current } : {});

  const send = useCallback((m: ClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(m));
  }, []);

  const clearTimers = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (pingTimer.current) clearInterval(pingTimer.current);
    retryTimer.current = null;
    pingTimer.current = null;
  };

  const connect = useCallback(() => {
    if (!SERVER_URL) {
      setError('Online play is not configured (EXPO_PUBLIC_SERVER_URL is missing).');
      return;
    }
    if (ws.current && ws.current.readyState <= WebSocket.OPEN) return;
    wanted.current = true;
    setStatus(attempts.current ? 'reconnecting' : 'connecting');
    const sock = new WebSocket(SERVER_URL);
    ws.current = sock;

    sock.onopen = () => {
      attempts.current = 0;
      setStatus('open');
      const id = meRef.current;
      if (id) send({ t: 'resume', v: PROTOCOL_VERSION, code: id.code, playerId: id.playerId, secret: id.secret });
      else if (intent.current?.t === 'create') send({ t: 'create', v: PROTOCOL_VERSION, ...nameField() });
      else if (intent.current?.t === 'join') send({ t: 'join', v: PROTOCOL_VERSION, code: intent.current.code, ...nameField() });
      intent.current = null;
      pingTimer.current = setInterval(() => send({ t: 'ping' }), PING_MS);
    };

    sock.onmessage = (ev) => {
      let m: ServerMessage;
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      switch (m.t) {
        case 'welcome': {
          const id = { code: m.code, playerId: m.playerId, secret: m.secret, color: m.color };
          meRef.current = id;
          setMe(id);
          setError(null);
          break;
        }
        case 'room':
          setRoom(m.room);
          break;
        case 'error':
          setError(m.message);
          // A failed resume means the game is gone: drop our identity.
          if (m.code === 'auth' || (m.code === 'not-found' && meRef.current)) {
            meRef.current = null;
            setMe(null);
            setRoom(null);
          }
          break;
        case 'left':
          meRef.current = null;
          setMe(null);
          setRoom(null);
          break;
      }
    };

    sock.onclose = () => {
      if (ws.current !== sock) return;
      ws.current = null;
      clearTimers();
      // Reconnect only while we are in (or joining) a room.
      if (wanted.current && (meRef.current || intent.current)) {
        const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempts.current++);
        setStatus('reconnecting');
        retryTimer.current = setTimeout(connect, delay);
      } else {
        setStatus('idle');
      }
    };
    sock.onerror = () => {
      // onclose follows and handles retry.
    };
  }, [send]);

  const disconnect = useCallback(() => {
    wanted.current = false;
    clearTimers();
    ws.current?.close();
    ws.current = null;
    setStatus('idle');
  }, []);

  // Reconnect immediately when the app returns to the foreground (iOS suspends sockets in background).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && wanted.current && meRef.current && !ws.current) {
        attempts.current = 0;
        connect();
      }
    });
    return () => sub.remove();
  }, [connect]);

  useEffect(() => () => disconnect(), [disconnect]);

  const begin = (i: Intent) => {
    setError(null);
    meRef.current = null;
    setMe(null);
    setRoom(null);
    intent.current = i;
    if (ws.current?.readyState === WebSocket.OPEN) {
      if (i?.t === 'create') send({ t: 'create', v: PROTOCOL_VERSION, ...nameField() });
      if (i?.t === 'join') send({ t: 'join', v: PROTOCOL_VERSION, code: i.code, ...nameField() });
      intent.current = null;
    } else connect();
  };

  return {
    status,
    room,
    me,
    error,
    clearError: () => setError(null),
    create: () => begin({ t: 'create' }),
    join: (code: string) => begin({ t: 'join', code: code.trim().toUpperCase() }),
    setSeat: (color: Color, kind: 'bot' | 'open', difficulty?: Difficulty) => send({ t: 'seat', color, kind, difficulty }),
    setRules: (rules: Rules) => send({ t: 'rules', rules }),
    rename: (n: string) => isAllowedName(n) && send({ t: 'rename', name: n }),
    start: () => send({ t: 'start' }),
    roll: useCallback(() => send({ t: 'roll' }), [send]),
    move: useCallback((token: number) => send({ t: 'move', token }), [send]),
    leave: () => {
      send({ t: 'leave' });
      meRef.current = null;
      setMe(null);
      setRoom(null);
      disconnect();
    },
  };
}
