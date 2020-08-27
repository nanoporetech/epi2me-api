// package: epi2me.status
// file: status.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class AliveRequest extends jspb.Message { 
    getName(): string;
    setName(value: string): AliveRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AliveRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AliveRequest): AliveRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AliveRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AliveRequest;
    static deserializeBinaryFromReader(message: AliveRequest, reader: jspb.BinaryReader): AliveRequest;
}

export namespace AliveRequest {
    export type AsObject = {
        name: string,
    }
}

export class AliveStreamRequest extends jspb.Message { 
    getName(): string;
    setName(value: string): AliveStreamRequest;

    getNumGreetings(): number;
    setNumGreetings(value: number): AliveStreamRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AliveStreamRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AliveStreamRequest): AliveStreamRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AliveStreamRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AliveStreamRequest;
    static deserializeBinaryFromReader(message: AliveStreamRequest, reader: jspb.BinaryReader): AliveStreamRequest;
}

export namespace AliveStreamRequest {
    export type AsObject = {
        name: string,
        numGreetings: number,
    }
}

export class AliveReply extends jspb.Message { 
    getMessage(): string;
    setMessage(value: string): AliveReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AliveReply.AsObject;
    static toObject(includeInstance: boolean, msg: AliveReply): AliveReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AliveReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AliveReply;
    static deserializeBinaryFromReader(message: AliveReply, reader: jspb.BinaryReader): AliveReply;
}

export namespace AliveReply {
    export type AsObject = {
        message: string,
    }
}
