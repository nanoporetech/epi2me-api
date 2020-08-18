export declare type DisposeTimer = () => void;
export declare function createInterval(duration: number, cb: Function): DisposeTimer;
export declare function createTimeout(duration: number, cb: Function): DisposeTimer;
