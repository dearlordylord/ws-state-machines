import { Effect, Brand } from 'effect';
import { SocketServer } from '@effect/experimental';
import { layerWebSocket } from '@effect/experimental/SocketServer/Node';
import { ulid } from 'ulidx';

type ConnectionId = string & Brand.Brand<'ws/ConnectionId'>

type Event = {
  connectionId: ConnectionId,
} & ({
  type: 'online'
  write: (message: Uint8Array | string) => void,
} | {
  type: 'offline',
} | {
  type: 'message',
  message: Uint8Array,
});

const onlineEffect = (cb: (event: Event) => void) => Effect.gen(function* () {
  const server = yield* SocketServer.SocketServer;
  yield* server.run((s) => Effect.gen(function* () {
    const connectionId = ulid() as ConnectionId;
    const write = yield* s.writer;
    yield* Effect.sync(() => cb({
      type: 'online',
      connectionId,
      write: (message) => Effect.runPromise(write(message)),
    }));
    yield* Effect.addFinalizer(() => Effect.sync(() => cb({
      type: 'offline',
      connectionId,
    })));
    yield* s.run((a) => Effect.sync(() => cb({
      type: 'message',
      connectionId,
      message: a,
    })));
  }).pipe(Effect.scoped));
});

const webSocketLayer = layerWebSocket({
  port: 3004,
});

const run = (cb: (event: Event) => void) => Effect.runPromise(onlineEffect(cb).pipe(Effect.provide(webSocketLayer), Effect.scoped));

run((event) => {
  console.log(event);
});
