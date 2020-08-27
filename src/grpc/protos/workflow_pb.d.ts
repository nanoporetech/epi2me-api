// package: epi2me.workflow
// file: workflow.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import * as google_protobuf_struct_pb from "google-protobuf/google/protobuf/struct_pb";

export class StartRequest extends jspb.Message { 
    getApikey(): string;
    setApikey(value: string): StartRequest;

    getApisecret(): string;
    setApisecret(value: string): StartRequest;

    getUrl(): string;
    setUrl(value: string): StartRequest;

    clearInputfoldersList(): void;
    getInputfoldersList(): Array<string>;
    setInputfoldersList(value: Array<string>): StartRequest;
    addInputfolders(value: string, index?: number): string;

    getOutputfolder(): string;
    setOutputfolder(value: string): StartRequest;

    getIdworkflow(): string;
    setIdworkflow(value: string): StartRequest;

    getComputeaccountid(): string;
    setComputeaccountid(value: string): StartRequest;

    getStorageaccountid(): string;
    setStorageaccountid(value: string): StartRequest;

    getIsconsentedhuman(): boolean;
    setIsconsentedhuman(value: boolean): StartRequest;

    getIddataset(): string;
    setIddataset(value: string): StartRequest;

    getStoreresults(): boolean;
    setStoreresults(value: boolean): StartRequest;


    hasUserdefined(): boolean;
    clearUserdefined(): void;
    getUserdefined(): google_protobuf_struct_pb.Struct | undefined;
    setUserdefined(value?: google_protobuf_struct_pb.Struct): StartRequest;

    clearInstanceattributesList(): void;
    getInstanceattributesList(): Array<StartRequest.InstanceAttribute>;
    setInstanceattributesList(value: Array<StartRequest.InstanceAttribute>): StartRequest;
    addInstanceattributes(value?: StartRequest.InstanceAttribute, index?: number): StartRequest.InstanceAttribute;

    getRegion(): string;
    setRegion(value: string): StartRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StartRequest.AsObject;
    static toObject(includeInstance: boolean, msg: StartRequest): StartRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StartRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StartRequest;
    static deserializeBinaryFromReader(message: StartRequest, reader: jspb.BinaryReader): StartRequest;
}

export namespace StartRequest {
    export type AsObject = {
        apikey: string,
        apisecret: string,
        url: string,
        inputfoldersList: Array<string>,
        outputfolder: string,
        idworkflow: string,
        computeaccountid: string,
        storageaccountid: string,
        isconsentedhuman: boolean,
        iddataset: string,
        storeresults: boolean,
        userdefined?: google_protobuf_struct_pb.Struct.AsObject,
        instanceattributesList: Array<StartRequest.InstanceAttribute.AsObject>,
        region: string,
    }


    export class InstanceAttribute extends jspb.Message { 
        getIdAttribute(): number;
        setIdAttribute(value: number): InstanceAttribute;

        getValue(): string;
        setValue(value: string): InstanceAttribute;


        serializeBinary(): Uint8Array;
        toObject(includeInstance?: boolean): InstanceAttribute.AsObject;
        static toObject(includeInstance: boolean, msg: InstanceAttribute): InstanceAttribute.AsObject;
        static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
        static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
        static serializeBinaryToWriter(message: InstanceAttribute, writer: jspb.BinaryWriter): void;
        static deserializeBinary(bytes: Uint8Array): InstanceAttribute;
        static deserializeBinaryFromReader(message: InstanceAttribute, reader: jspb.BinaryReader): InstanceAttribute;
    }

    export namespace InstanceAttribute {
        export type AsObject = {
            idAttribute: number,
            value: string,
        }
    }

}

export class StartReply extends jspb.Message { 
    getStarted(): boolean;
    setStarted(value: boolean): StartReply;

    getIdworkflowinstance(): string;
    setIdworkflowinstance(value: string): StartReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StartReply.AsObject;
    static toObject(includeInstance: boolean, msg: StartReply): StartReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StartReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StartReply;
    static deserializeBinaryFromReader(message: StartReply, reader: jspb.BinaryReader): StartReply;
}

export namespace StartReply {
    export type AsObject = {
        started: boolean,
        idworkflowinstance: string,
    }
}

export class RunningInstancesReply extends jspb.Message { 
    clearWorkflowinstanceList(): void;
    getWorkflowinstanceList(): Array<RunningInstancesReply.RunningInstanceDetails>;
    setWorkflowinstanceList(value: Array<RunningInstancesReply.RunningInstanceDetails>): RunningInstancesReply;
    addWorkflowinstance(value?: RunningInstancesReply.RunningInstanceDetails, index?: number): RunningInstancesReply.RunningInstanceDetails;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RunningInstancesReply.AsObject;
    static toObject(includeInstance: boolean, msg: RunningInstancesReply): RunningInstancesReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RunningInstancesReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RunningInstancesReply;
    static deserializeBinaryFromReader(message: RunningInstancesReply, reader: jspb.BinaryReader): RunningInstancesReply;
}

export namespace RunningInstancesReply {
    export type AsObject = {
        workflowinstanceList: Array<RunningInstancesReply.RunningInstanceDetails.AsObject>,
    }


    export class RunningInstanceDetails extends jspb.Message { 
        getIdworkflowinstance(): string;
        setIdworkflowinstance(value: string): RunningInstanceDetails;


        serializeBinary(): Uint8Array;
        toObject(includeInstance?: boolean): RunningInstanceDetails.AsObject;
        static toObject(includeInstance: boolean, msg: RunningInstanceDetails): RunningInstanceDetails.AsObject;
        static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
        static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
        static serializeBinaryToWriter(message: RunningInstanceDetails, writer: jspb.BinaryWriter): void;
        static deserializeBinary(bytes: Uint8Array): RunningInstanceDetails;
        static deserializeBinaryFromReader(message: RunningInstanceDetails, reader: jspb.BinaryReader): RunningInstanceDetails;
    }

    export namespace RunningInstanceDetails {
        export type AsObject = {
            idworkflowinstance: string,
        }
    }

}

export class WorkflowInstanceByIdRequest extends jspb.Message { 
    getIdworkflowinstance(): string;
    setIdworkflowinstance(value: string): WorkflowInstanceByIdRequest;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): WorkflowInstanceByIdRequest.AsObject;
    static toObject(includeInstance: boolean, msg: WorkflowInstanceByIdRequest): WorkflowInstanceByIdRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: WorkflowInstanceByIdRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): WorkflowInstanceByIdRequest;
    static deserializeBinaryFromReader(message: WorkflowInstanceByIdRequest, reader: jspb.BinaryReader): WorkflowInstanceByIdRequest;
}

export namespace WorkflowInstanceByIdRequest {
    export type AsObject = {
        idworkflowinstance: string,
    }
}

export class RunningInstanceStateReply extends jspb.Message { 
    getUpload(): boolean;
    setUpload(value: boolean): RunningInstanceStateReply;

    getAnalyse(): boolean;
    setAnalyse(value: boolean): RunningInstanceStateReply;

    getReport(): boolean;
    setReport(value: boolean): RunningInstanceStateReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RunningInstanceStateReply.AsObject;
    static toObject(includeInstance: boolean, msg: RunningInstanceStateReply): RunningInstanceStateReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RunningInstanceStateReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RunningInstanceStateReply;
    static deserializeBinaryFromReader(message: RunningInstanceStateReply, reader: jspb.BinaryReader): RunningInstanceStateReply;
}

export namespace RunningInstanceStateReply {
    export type AsObject = {
        upload: boolean,
        analyse: boolean,
        report: boolean,
    }
}

export class StopReply extends jspb.Message { 
    getSuccess(): boolean;
    setSuccess(value: boolean): StopReply;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): StopReply.AsObject;
    static toObject(includeInstance: boolean, msg: StopReply): StopReply.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: StopReply, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): StopReply;
    static deserializeBinaryFromReader(message: StopReply, reader: jspb.BinaryReader): StopReply;
}

export namespace StopReply {
    export type AsObject = {
        success: boolean,
    }
}
