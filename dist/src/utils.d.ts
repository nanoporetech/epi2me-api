export default utils;
declare const utils: {
    version: string;
    headers: (req: any, optionsIn: any) => void;
    head: (uriIn: any, options: any) => Promise<any>;
    get: (uriIn: any, options: any) => Promise<any>;
    post: (uriIn: any, obj: any, options: any) => Promise<any>;
    put: (uriIn: any, id: any, obj: any, options: any) => Promise<any>;
    convertResponseToObject(data: any): any;
};
