import io from 'socket.io-client';
import { merge } from 'lodash';

export default class Socket {
  constructor(rest, opts) {
    this.debounces = {};
    this.debounceWindow = merge(
      {
        debounceWindow: 2000,
      },
      opts,
    ).debounceWindow; // 2s repeat with the same uuid is permitted
    this.log = merge(
      {
        log: {
          debug: () => { },
        },
      },
      opts,
    ).log;

    rest.jwt().then(jwt => {
      this.socket = io(opts.url, {
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
    })
      .catch(err => {
        this.log.error('socket connection failed - JWT authentication error');
      });
  }

  debounce(data, func) {
    const uuid = merge(data)._uuid; // eslint-disable-line

    if (uuid) {
      if (this.debounces[uuid]) {
        return;
      }

      this.debounces[uuid] = 1;
      setTimeout(() => {
        delete this.debounces[uuid];
      }, this.debounceWindow);
    }

    if (func) {
      func(data);
    }
  }

  watch(chan, func) {
    if (!this.socket) {
      this.log.debug(`socket not ready. requeueing watch on ${chan}`);

      setTimeout(() => {
        this.watch(chan, func);
      }, 1000);
      return;
    }

    this.socket.on(chan, data => {
      return this.debounce(data, func);
    });
  }

  emit(chan, data) {
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
