// package: epi2me.samples
// file: samples.proto

import * as jspb from "google-protobuf";

export class SamplesRequest extends jspb.Message {
  getPath(): string;
  setPath(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SamplesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SamplesRequest): SamplesRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SamplesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SamplesRequest;
  static deserializeBinaryFromReader(message: SamplesRequest, reader: jspb.BinaryReader): SamplesRequest;
}

export namespace SamplesRequest {
  export type AsObject = {
    path: string,
  }
}

export class ExperimentMap extends jspb.Message {
  getExperimentsMap(): jspb.Map<string, ExperimentMap.Experiment>;
  clearExperimentsMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExperimentMap.AsObject;
  static toObject(includeInstance: boolean, msg: ExperimentMap): ExperimentMap.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ExperimentMap, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExperimentMap;
  static deserializeBinaryFromReader(message: ExperimentMap, reader: jspb.BinaryReader): ExperimentMap;
}

export namespace ExperimentMap {
  export type AsObject = {
    experimentsMap: Array<[string, ExperimentMap.Experiment.AsObject]>,
  }

  export class Experiment extends jspb.Message {
    getStartdate(): string;
    setStartdate(value: string): void;

    clearSamplesList(): void;
    getSamplesList(): Array<ExperimentMap.Sample>;
    setSamplesList(value: Array<ExperimentMap.Sample>): void;
    addSamples(value?: ExperimentMap.Sample, index?: number): ExperimentMap.Sample;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Experiment.AsObject;
    static toObject(includeInstance: boolean, msg: Experiment): Experiment.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Experiment, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Experiment;
    static deserializeBinaryFromReader(message: Experiment, reader: jspb.BinaryReader): Experiment;
  }

  export namespace Experiment {
    export type AsObject = {
      startdate: string,
      samplesList: Array<ExperimentMap.Sample.AsObject>,
    }
  }

  export class Sample extends jspb.Message {
    getFlowcell(): string;
    setFlowcell(value: string): void;

    getSample(): string;
    setSample(value: string): void;

    getPath(): string;
    setPath(value: string): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Sample.AsObject;
    static toObject(includeInstance: boolean, msg: Sample): Sample.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Sample, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Sample;
    static deserializeBinaryFromReader(message: Sample, reader: jspb.BinaryReader): Sample;
  }

  export namespace Sample {
    export type AsObject = {
      flowcell: string,
      sample: string,
      path: string,
    }
  }
}

