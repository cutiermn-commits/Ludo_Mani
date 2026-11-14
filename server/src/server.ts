import { randomBytes, randomInt } from 'node:crypto';
import { createServer, IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import {
  ClientMessage,
  PROTOCOL_VERSION,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ServerMessage,
  parseClientMessage,
} from '../../src/net/protocol';
import { Conn, DEFAULT_TIMING, Deps, Room, RoomError, Timing } from './room';

export interface ServerOptions {
  port: number;
  maxRooms: number;
  /** Rooms with no activity for this long are deleted. */
  idleRoomTtlMs: number;
  /** Rooms with no connected humans for this long are deleted. */
  emptyRoomTtlMs: number;
  timing: Timing;
  /** Optional list of allowed browser Origins (native apps send none). */
  allowedOrigins?: string[];
}

export const DEFAULT_OPTIONS: ServerOptions = {
  port: 8080,
  maxRooms: 2000,
  idleRoomTtlMs: 30 * 60_000,
  emptyRoomTtlMs: 2 * 60_000,
  timing: DEFAULT_TIMING,
};

const MAX_MESSAGE_BYTES = 1024;
const RATE_PER_SEC = 10;
const RATE_BURST = 20;

const realDeps: Deps = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout),
  randomInt: (max) => randomInt(max),
  token: () => randomBytes(18).toString('base64url'),
};

interface Client extends Conn {
  ws: WebSocket;
  room: Room | null;
  playerId: string | null;
  alive: boolean;
  tokens: number;
  lastRefill: number;
}

function log(event: string, data: Record<string, unknown> = {}) {
  // Structured, PII-free logs: no IPs, no tokens.
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...data }));
}

export function startServer(opts: Partial<ServerOptions> = {}): { http: Server; close: () => Promise<void>; rooms: Map<string, Room> } {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const rooms = new Map<string, Room>();
  const byPlayer = new Map<string, Client>(); // playerId -> live client
  const clients = new Set<Client>();

  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
      return;
    }
    res.writeHead(404).end();
  });

  const wss = new WebSocketServer({
    server: http,
    maxPayload: MAX_MESSAGE_BYTES,
    verifyClient: ({ origin }: { origin?: string; req: IncomingMessage }) =>
      !o.allowedOrigins || !origin || o.allowedOrigins.includes(origin),
  });

  function newCode(): string {
    for (let attempt = 0; attempt < 20; attempt++) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      if (!rooms.has(code)) return code;
    }
    throw new RoomError('capacity', 'Could not allocate a room. Try again.');
  }

  function bind(client: Client, room: Room, playerId: string) {
    const previous = byPlayer.get(playerId);
    if (previous && previous !== client) {
      previous.room = null;
      previous.playerId = null;
      previous.ws.close(4000, 'replaced');
    }
    client.room = room;
    client.playerId = playerId;
    byPlayer.set(playerId, client);
  }

  function unbind(client: Client) {
    if (client.playerId && byPlayer.get(client.playerId) === client) byPlayer.delete(client.playerId);
    client.room = null;
    client.playerId = null;
  }

  function deleteRoom(room: Room, reason: string) {
    room.dispose();
    rooms.delete(room.code);
    log('room.deleted', { code: room.code, reason });
  }

  function handle(client: Client, msg: ClientMessage) {
    if ((msg.t === 'create' || msg.t === 'join' || msg.t === 'resume') && msg.v !== PROTOCOL_VERSION) {
      throw new RoomError('version', 'Please update the app to play online.');
    }
    if (msg.t === 'ping') return client.send({ t: 'pong' });

    if (msg.t === 'create' || msg.t === 'join' || msg.t === 'resume') {
      if (client.room && client.playerId) client.room.disconnect(client);
      unbind(client);
    }

    switch (msg.t) {
      case 'create': {
        if (rooms.size >= o.maxRooms) throw new RoomError('capacity', 'Servers are busy. Try again shortly.');
        const room = new Room(newCode(), realDeps, o.timing);
        rooms.set(room.code, room);
        const { playerId } = room.join(client, msg.name);
        bind(client, room, playerId);
        log('room.created', { code: room.code, rooms: rooms.size });
        return;
      }
      case 'join': {
        const room = rooms.get(msg.code);
        if (!room) throw new RoomError('not-found', 'No room with that code.');
        const { playerId } = room.join(client, msg.name);
        bind(client, room, playerId);
        return;
      }
      case 'resume': {
        const room = rooms.get(msg.code);
        if (!room) throw new RoomError('not-found', 'That game has ended.');
        room.resume(client, msg.playerId, msg.secret);
        bind(client, room, msg.playerId);
        return;
      }
    }

    const room = client.room;
    const pid = client.playerId;
    if (!room || !pid) throw new RoomError('bad-request', 'Join a room first.');
    switch (msg.t) {
      case 'seat':
        return room.setSeat(pid, msg.color, msg.kind, msg.difficulty);
      case 'rules':
        return room.setRules(pid, msg.rules);
      case 'rename':
        return room.rename(pid, msg.name);
      case 'start':
        room.start(pid);
        log('game.started', { code: room.code });
        return;
      case 'roll':
        return room.roll(pid);
      case 'move':
        return room.move(pid, msg.token);
      case 'leave':
        room.leave(pid);
        unbind(client);
        if (room.humanCount() === 0) deleteRoom(room, 'no-humans');
        return;
    }
  }

  wss.on('connection', (ws) => {
    const client: Client = {
      ws,
      room: null,
      playerId: null,
      alive: true,
      tokens: RATE_BURST,
      lastRefill: Date.now(),
      send(m: ServerMessage) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
      },
    };
    clients.add(client);
    ws.on('pong', () => (client.alive = true));
    ws.on('message', (data, isBinary) => {
      const now = Date.now();
      client.tokens = Math.min(RATE_BURST, client.tokens + ((now - client.lastRefill) / 1000) * RATE_PER_SEC);
      client.lastRefill = now;
      if (client.tokens < 1) return client.send({ t: 'error', code: 'rate-limit', message: 'Slow down.' });
      client.tokens -= 1;

      const msg = isBinary ? null : parseClientMessage(data.toString());
      if (!msg) return client.send({ t: 'error', code: 'bad-request', message: 'Invalid message.' });
      try {
        handle(client, msg);
      } catch (e) {
        if (e instanceof RoomError) client.send({ t: 'error', code: e.code, message: e.message });
        else {
          log('error', { message: (e as Error).message });
          client.send({ t: 'error', code: 'bad-request', message: 'Something went wrong.' });
        }
      }
    });
    ws.on('close', () => {
      clients.delete(client);
      if (client.room && client.playerId && byPlayer.get(client.playerId) === client) client.room.disconnect(client);
      unbind(client);
    });
  });

  // Heartbeat: terminate sockets that stop answering pings (mobile networks drop silently).
  const heartbeat = setInterval(() => {
    for (const c of clients) {
      if (!c.alive) {
        c.ws.terminate();
        continue;
      }
      c.alive = false;
      c.ws.ping();
    }
  }, 30_000);

  // Sweep idle and abandoned rooms.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      const idle = now - room.lastActivity;
      const over = room.state?.phase === 'over';
      if (idle > o.idleRoomTtlMs) deleteRoom(room, 'idle');
      else if (room.connectedHumans() === 0 && idle > o.emptyRoomTtlMs) deleteRoom(room, 'abandoned');
      else if (over && idle > o.emptyRoomTtlMs) deleteRoom(room, 'finished');
    }
  }, 15_000);

  http.listen(o.port);
  log('server.listening', { port: o.port });

  return {
    http,
    rooms,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(heartbeat);
        clearInterval(sweeper);
        for (const r of rooms.values()) r.dispose();
        for (const ws of wss.clients) ws.terminate();
        wss.close(() => http.close(() => resolve()));
      }),
  };
}
