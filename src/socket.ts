import type { Logger } from './Logger.type';
import type { REST } from './rest';
import type { SocketOptions } from './socket.type';
import type { Duration } from './Duration';

import io from 'socket.io-client';
import { isDictionary } from 'ts-runtime-typecheck';
import { createTimeout } from './timers';
import { wrapAndLogError } from './NodeError';

export default class Socket {
  debounces: Set<unknown> = new Set();
  log: Logger;
  debounceWindow: Duration;
  socket?: ReturnType<typeof io>;

  constructor(rest: REST, opts: SocketOptions) {
    this.debounceWindow = opts.debounceWindow;
    this.log = opts.log;
    this.initialise(rest, opts.url);
  }

  destroy(): void {
    this.socket?.disconnect();
  }

  private async initialise(rest: REST, url: string): Promise<void> {
    try {
      const jwt = await rest.jwt();

      this.socket = io(url, {
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

  debounce(data: unknown, func: (data: unknown) => void): void {
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
