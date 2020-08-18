/// <reference types="socket.io-client" />
import type { Logger } from './Logger';
import REST from './rest';
interface SocketOptions {
    log: Logger;
    debounceWindow?: number;
    url: string;
}
export default class Socket {
    debounces: Set<unknown>;
    log: Logger;
    debounceWindow: number;
    socket?: SocketIOClient.Socket;
    constructor(rest: REST, opts: SocketOptions);
    private initialise;
    debounce(data: unknown, func: (data: unknown) => void): void;
    watch(chan: string, func: (data: unknown) => void): void;
    emit(chan: string, data: unknown): void;
}
export {};
