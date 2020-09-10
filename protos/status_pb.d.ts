// package: epi2me.status
// file: status.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";

export class AliveReply extends jspb.Message {
  getStatus(): boolean;
  setStatus(value: boolean): void;

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
    status: boolean,
  }
}

