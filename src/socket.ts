import type { Logger } from './Logger.type';
import type { SocketOptions } from './socket.type';
import type { Duration } from './Duration';
import type { Agent } from 'http';

import io from 'socket.io-client';
import { isDictionary } from 'ts-runtime-typecheck';
import { createTimeout } from './timers';
import { wrapAndLogError } from './NodeError';
import type { GraphQLFS } from './graphql-fs';

export class Socket {
  private debounces: Set<unknown> = new Set();
  private log: Logger;
  private debounceWindow: Duration;
  private socket?: ReturnType<typeof io>;

  constructor(opts: SocketOptions, gql: GraphQLFS, agent?: Agent) {
    this.debounceWindow = opts.debounceWindow;
    this.log = opts.log;
    this.initialise(gql, opts.url, agent);
  }

  destroy(): void {
    this.socket?.disconnect();
  }

  private async initialise(gql: GraphQLFS, url: string, agent?: Agent): Promise<void> {
    try {
      const jwt = await gql.jwt();

      this.socket = io(url, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agent: agent as any, // appears to be an error in @types/socket.io-client here
        transportOptions: {
          polling: {
            extraHeaders: {
              Cookie: `x-epi2me-jwt=${jwt}`,
            },
          },
        },
      });

      this.socket.on('connect', () => {
        this.log.debug('socket ready');
      });
    } catch (err) {
      wrapAndLogError('socket connection failed - JWT authentication error', err, this.log);
    }
  }

  private debounce(data: unknown, func: (data: unknown) => void): void {
    if (isDictionary(data) && '_uuid' in data) {
      const { _uuid: uuid } = data;

      if (this.debounces.has(uuid)) {
        return;
      }

      this.debounces.add(uuid);
      createTimeout(this.debounceWindow, () => this.debounces.delete(uuid));
    }

    if (func) {
      func(data);
    }
  }

  watch(chan: string, func: (data: unknown) => void): void {
    if (!this.socket) {
      this.log.debug(`socket not ready. requeueing watch on ${chan}`);

      setTimeout(() => {
        this.watch(chan, func);
      }, 1000);
      return;
    }

    this.socket.on(chan, (data: unknown) => {
      return this.debounce(data, func);
    });
  }

  emit(chan: string, data: unknown): void {
    if (!this.socket) {
      this.log.debug(`socket not ready. requeueing emit on ${chan}`);

      setTimeout(() => {
        this.emit(chan, data);
      }, 1000);
      return;
    }

    this.log.debug(`socket emit ${chan} ${JSON.stringify(data)}`);
    this.socket.emit(chan, data);
  }
}
