import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startServer } from '../src/server';
import { PROTOCOL_VERSION, ServerMessage } from '../../src/net/protocol';

function client(url: string) {
  const ws = new WebSocket(url);
  const inbox: ServerMessage[] = [];
  const waiters: [(m: ServerMessage) => boolean, (m: ServerMessage) => void][] = [];
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString()) as ServerMessage;
    inbox.push(m);
    for (const w of [...waiters]) if (w[0](m)) { waiters.splice(waiters.indexOf(w), 1); w[1](m); }
  });
  const open = new Promise<void>((r) => ws.on('open', () => r()));
  const send = (m: unknown) => ws.send(typeof m === 'string' ? m : JSON.stringify(m));
  const next = (pred: (m: ServerMessage) => boolean, ms = 5000) =>
    new Promise<ServerMessage>((res, rej) => {
      const hit = inbox.find(pred);
      if (hit) { inbox.splice(inbox.indexOf(hit), 1); return res(hit); }
      const t = setTimeout(() => rej(new Error('timeout waiting for message')), ms);
      waiters.push([pred, (m) => { clearTimeout(t); inbox.splice(inbox.indexOf(m), 1); res(m); }]);
    });
  return { ws, open, send, next, inbox };
}

test('two real WebSocket clients play a full online game', async () => {
  const srv = startServer({ port: 0, timing: { botDelayMs: 1, turnTimeoutMs: 5, disconnectedTurnTimeoutMs: 5 } });
  await new Promise((r) => srv.http.once('listening', r));
  const port = (srv.http.address() as any).port;
  const url = `ws://127.0.0.1:${port}`;
  try {
    const a = client(url), b = client(url);
    await Promise.all([a.open, b.open]);

    // Garbage and oversized input are rejected without crashing the server.
    a.send('not json');
    assert.equal(((await a.next((m) => m.t === 'error')) as any).code, 'bad-request');
    a.send({ t: 'create', v: 999 });
    assert.equal(((await a.next((m) => m.t === 'error')) as any).code, 'version');

    a.send({ t: 'create', v: PROTOCOL_VERSION });
    const welcome = (await a.next((m) => m.t === 'welcome')) as any;
    assert.match(welcome.code, /^[A-Z2-9]{6}$/);

    b.send({ t: 'join', v: PROTOCOL_VERSION, code: 'ZZZZZZ' });
    assert.equal(((await b.next((m) => m.t === 'error')) as any).code, 'not-found');
    b.send({ t: 'join', v: PROTOCOL_VERSION, code: welcome.code });
    assert.equal(((await b.next((m) => m.t === 'welcome')) as any).color, 'yellow');

    b.send({ t: 'start' });
    assert.equal(((await b.next((m) => m.t === 'error')) as any).code, 'not-host');

    a.send({ t: 'seat', color: 'green', kind: 'bot', difficulty: 'hard' });
    a.send({ t: 'start' });
    // Nobody acts: the server auto-plays (5 ms turn timeout) until someone wins.
    const over = (await a.next((m) => m.t === 'room' && m.room.state?.phase === 'over', 20000)) as any;
    assert.ok(over.room.state.winner);
    const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
    assert.equal(health.ok, true);
    a.ws.close();
    b.ws.close();
  } finally {
    await srv.close();
  }
});
