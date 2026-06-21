/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
 */
/**
 * @file This module is used for remote procedure call.
 * @kit RemoteCommunicationKit
 */
import type BusinessError from '@ohos.base';
/**
 * Provides urpc APIs.
 * @namespace urpc
 * @syscap SystemCapability.Collaboration.RemoteCommunication
 * @since 5.0.1(13)
 */
declare namespace urpc {
    /**
     * Flowbuf data type.
     * @typedef FlowbufType
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    type FlowbufType = 'INT8' | 'UINT8' | 'INT16' | 'UINT16' | 'INT32' | 'UINT32' | 'INT64' | 'UINT64' | 'BOOL' | 'FLOAT' | 'DOUBLE' | 'STRING' | 'BYTES' | 'MESSAGE' | 'REPEATED_INT8' | 'REPEATED_UINT8' | 'REPEATED_INT16' | 'REPEATED_UINT16' | 'REPEATED_INT32' | 'REPEATED_UINT32' | 'REPEATED_INT64' | 'REPEATED_UINT64' | 'REPEATED_BOOL' | 'REPEATED_FLOAT' | 'REPEATED_DOUBLE' | 'REPEATED_STRING' | 'REPEATED_BYTES' | 'REPEATED_MESSAGE' | 'ARRAY_INT8' | 'ARRAY_UINT8' | 'ARRAY_INT16' | 'ARRAY_UINT16' | 'ARRAY_INT32' | 'ARRAY_UINT32' | 'ARRAY_INT64' | 'ARRAY_UINT64' | 'ARRAY_BOOL' | 'ARRAY_FLOAT' | 'ARRAY_DOUBLE';
    /**
     * Flowbuf data element.
     * @typedef FlowbufElement<T>
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    interface FlowbufElement<T> {
        /**
         * Flowbuf data type.
         * @type {FlowbufType}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        type: FlowbufType;
        /**
         * Flowbuf data value.
         * @type {T}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        value: T;
        /**
         * Flowbuf data value.
         * @type {T}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        name: string;
    }
    /**
     * Flowbuf array element.
     * @typedef FlowbufArrayElement<T>
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    interface FlowbufArrayElement<T> {
        /**
         * Flowbuf data type.
         * @type {FlowbufType}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        type: FlowbufType;
        /**
         * Flowbuf array value.
         * @type {T[]}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        value: T[];
        /**
         * Flowbuf array length.
         * @type {number}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        length: number;
    }
    /**
     * Urpc mode.
     * @typedef UrpcMode
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    type UrpcMode = 'client';
    /**
     * Urpc communication protocol.
     * @typedef UrpcProtocol
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    type UrpcProtocol = 'eat';
    /**
     * Ip and port.
     * @typedef IpAndPort
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    interface IpAndPort {
        /**
         * Service ip address.
         * @type {string}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        ip: string;
        /**
         * Service port.
         * @type {number}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        port: number;
    }
    /**
     * Urpc response object and calling id.
     * @typedef UrpcPromise
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    interface UrpcPromise {
        /**
         * Urpc response object.
         * @type {Promise<Object>}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        promise: Promise<Object>;
        /**
         * Calling id.
         * @type {number}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        callingId: number;
    }
    /**
     * Urpc connect configuration.
     * @typedef UrpcConnectConfiguration
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    interface UrpcConnectConfiguration {
        /**
         * Service node.
         * @type {IpAndPort}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        node: IpAndPort;
        /**
         * Urpc protocol.
         * @type {?UrpcProtocol}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        protocol?: UrpcProtocol;
        /**
         * Multi path switch.
         * @type {?boolean}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        multiPath?: boolean;
        /**
         * Cert flags.
         * @type {?number}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        flags?: number;
        /**
         * Cert host.
         * @type {?string}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        host?: string;
        /**
         * Cert path.
         * @type {?string}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        caPath?: string;
    }
    /**
     * urpc init configuration.
     * @typedef UrpcInitConfiguration
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    interface UrpcInitConfiguration {
        /**
         * Urpc mode.
         * @type {?UrpcMode}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        mode?: UrpcMode;
        /**
         * Urpc connect configuration.
         * @type {UrpcConnectConfiguration}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        connect: UrpcConnectConfiguration;
        /**
         * Urpc request timeout.
         * @type {number}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        timeout: number;
    }
    /**
     * Urpc call option.
     * @typedef CallingOption
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    interface CallingOption {
        /**
         * Urpc request priority.
         * @type {?number}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        priority?: number;
    }
    /**
     * Callback for urpc call.
     * @typedef UrpcCall
     * @param { string } funcName - An service method name.
     * @param { object } request - An urpc request.
     * @param { object } returnValue - An urpc response.
     * @param { CallingOption } [config] - Optional parameters {@link CallingOption}.
     * @returns { UrpcPromise } The promise returned by the callback.
     * @throws { BusinessError } 401 - Parameter error.
     * @throws { BusinessError } 1007910001 - Urpc some error.
     * @throws { BusinessError } 1007910002 - Timeout was reached.
     * @throws { BusinessError } 1007910003 - Request is cancel.
     * @throws { BusinessError } 1007910004 - Urpc disconnect.
     * @throws { BusinessError } 1007910005 - Limit of request number.
     * @throws { BusinessError } 1007910006 - Limit of request size.
     * @throws { BusinessError } 1007910008 - Resume transmit error.
     * @throws { BusinessError } 10079100997 - Deserialize failed.
     * @throws { BusinessError } 10079100999 - Urpc stub not found.
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    type UrpcCall = (funcName: string, request: object, returnValue: object, config?: CallingOption) => UrpcPromise;
    /**
     * Callback for urpc cancel.
     * @typedef UrpcCancel
     * @param { number | number[] } [callingId] - Request number {@link number | number[]}.
     * @throws { BusinessError } 401 - Parameter error.
     * @throws { BusinessError } 1007910099 - Urpc stub not found.
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    type UrpcCancel = (callingId?: number | number[]) => void;
    /**
     * Callback for urpc destroy.
     * @typedef UrpcDestroy
     * @throws { BusinessError } 401 - Parameter error.
     * @throws { BusinessError } 10079100999 - Urpc stub not found.
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    type UrpcDestroy = () => void;
    /**
     * UrpcStub is a main object to send urpc requests.
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    class UrpcStub {
        /**
         * An unique id of UrpcStub.
         * @type {number}
         * @readonly
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        readonly id: number;
        /**
         * Send an urpc request and get urpc response.
         * @type {UrpcCall}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        call: UrpcCall;
        /**
         * Cancel a request or cancel some requests or cancel all requests.
         * @type {UrpcCancel}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        cancel: UrpcCancel;
        /**
         * Close a stub.
         * @type {UrpcDestroy}
         * @syscap SystemCapability.Collaboration.RemoteCommunication
         * @since 5.0.1(13)
         */
        destroy: UrpcDestroy;
    }
    /**
     * Creates a stub.
     * @permission ohos.permission.INTERNET
     * @param { UrpcInitConfiguration } config - urpc configuration.
     * @param { string | string[] } funcList - urpc service method.
     * @returns { Promise<UrpcStub> } The promise returned by the function.
     * @throws { BusinessError } 401 - Parameter error.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 10079100998 - Function name error.
     * @syscap SystemCapability.Collaboration.RemoteCommunication
     * @since 5.0.1(13)
     */
    function urpcStubCreate(config: UrpcInitConfiguration, funcList: string | string[]): Promise<UrpcStub>;
}
export default urpc;
