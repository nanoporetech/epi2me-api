export declare function defer<T>(): {
    promise: Promise<T>;
    resolve: (value?: T) => void;
    reject: (error: unknown) => void;
};
