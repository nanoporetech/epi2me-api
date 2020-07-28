import io from 'socket.io-client';
import { merge } from 'lodash';

import type { Logger } from "./Logger";
import REST from './rest';

interface SocketOptions {
  log: Logger;
  debounceWindow?: number;
  url: string;
}

export default class Socket {
  debounces: Set<unknown> = new Set
  log: Logger
  debounceWindow: number
  socket?: SocketIOClient.Socket

  constructor(rest: REST, opts: SocketOptions) {
    this.debounceWindow = opts.debounceWindow ?? 2000;
    this.log = opts.log;
    this.initialise(rest, opts.url);
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
    }
    catch (err) {
      this.log.error('socket connection failed - JWT authentication error');
    }
  }

  debounce(data: unknown, func: (data: unknown) => void): void {
    // NOTE is this actually required? why is no explanation given for this?
    const uuid = merge(data)._uuid; // eslint-disable-line

    if (uuid) {
      if (this.debounces.has(uuid)) {
        return;
      }

      this.debounces.add(uuid);
      setTimeout(() => {
        this.debounces.delete(uuid);
      }, this.debounceWindow);
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
