export default class Socket {
    constructor(rest: any, opts: any);
    debounces: {};
    debounceWindow: any;
    log: any;
    socket: SocketIOClient.Socket;
    debounce(data: any, func: any): void;
    watch(chan: any, func: any): void;
    emit(chan: any, data: any): void;
}
