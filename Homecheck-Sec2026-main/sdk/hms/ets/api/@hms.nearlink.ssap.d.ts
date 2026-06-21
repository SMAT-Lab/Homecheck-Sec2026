/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
 */
/**
 * @file The module provides the capability to operate or manage service of nearlink.
 * @kit NearLinkKit
 */
import type { Callback } from '@ohos.base';
import constant from '@hms.nearlink.constant';
/**
 * Provides methods to operate or manage service of Nearlink.
 *
 * @namespace ssap
 * @syscap SystemCapability.Communication.NearLink.Core
 * @since 5.0.1(13)
 */
declare namespace ssap {
    /**
     * Indicate the connection state.
     *
     * @typedef { constant.ConnectionState }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    type ConnectionState = constant.ConnectionState;
    /**
     * create a Ssap client instance.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @param { string } address - Indicates the device address of a server. For example, "11:22:33:AA:BB:FF".
     * @returns { Client } Returns a Ssap client instance {@code Client}.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @throws { BusinessError } 1009700003 - Nearlink is off.
     * @throws { BusinessError } 1009700099 - Operation failed.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function createClient(address: string): Client;
    /**
     * create a Ssap server instance.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @returns { Server } Returns a Ssap server instance {@code Server}.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 801 - Capability not supported.
     * @throws { BusinessError } 1009700003 - Nearlink is off.
     * @throws { BusinessError } 1009700099 - Operation failed.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function createServer(): Server;
    /**
     * Manages SSAP client. Before calling an Ssap client method, you must use {@link createClient} to create an ssap client instance.
     *
     * @typedef Client
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface Client {
        /**
         * Connects to a server.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @returns { Promise<void> } Returns the promise object.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        connect(): Promise<void>;
        /**
         * Disconnects from or stops an ongoing connection to a server.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @returns { Promise<void> } Returns the promise object.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        disconnect(): Promise<void>;
        /**
         * Close the client.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        close(): void;
        /**
         * Starts discovering all services on server.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @returns { Promise<Array<Service>> } Returns the list of services of the server.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        getServices(): Promise<Array<Service>>;
        /**
         * Reads the property of a server.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { Property } property - Indicates the property to read.
         * @returns { Promise<Property> } - Promise used to return the property value.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        readProperty(property: Property): Promise<Property>;
        /**
         * Writes the property of a server.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { Property } property - Indicates the property to write.
         * @param { PropertyWriteType } writeType - Indicates the write type.
         * @returns { Promise<void> } Promise used to return the result.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        writeProperty(property: Property, writeType: PropertyWriteType): Promise<void>;
        /**
         * Enables or disables notification of a property when value changed.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { Property } property - Indicates the property to notify.
         * @param { boolean } enable - Specifies whether to enable notification of the property.
         * @returns { Promise<void> } Returns the promise object.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        setPropertyNotification(property: Property, enable: boolean): Promise<void>;
        /**
         * Negotiate the MTU size with server.
         * The negotiation result needs to be obtained by subscribing to event 'mtuChange'.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { number } mtu - The maximum transmission unit is 512 bytes, minimum is 22 bytes and default is 256 bytes.
         * @returns { Promise<void> } Returns the promise object.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        requestMtuSize(mtu: number): Promise<void>;
        /**
         * Subscribe property value changed event.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'propertyChange' } type - Type of the property value changed event to listen for.
         * @param { Callback<Property> } callback - Callback used to listen for the property value changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        on(type: 'propertyChange', callback: Callback<Property>): void;
        /**
         * Unsubscribe property value changed event.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'propertyChange' } type - Type of the property value changed event to listen for.
         * @param { Callback<Property> } callback - Callback used to listen for the property value changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        off(type: 'propertyChange', callback?: Callback<Property>): void;
        /**
         * Subscribe client connection state changed event.
         * If the user has the ohos.permission.GET_NEARLINK_PEER_MAC permission, the real device address is returned.
         * Otherwise, a random device address is returned.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'connectionStateChange' } type - Type of the connection state changed event to listen for.
         * @param { Callback<ConnectionChangeState> } callback - Callback used to listen for the connection state changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        on(type: 'connectionStateChange', callback: Callback<ConnectionChangeState>): void;
        /**
         * Unsubscribe client connection state changed event.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'connectionStateChange' } type - Type of the connection state changed event to listen for.
         * @param { Callback<ConnectionChangeState> } callback - Callback used to listen for the connection state changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        off(type: 'connectionStateChange', callback?: Callback<ConnectionChangeState>): void;
        /**
         * Subscribe mtu changed event.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'mtuChange' } type - Type of the mtu changed event to listen for.
         * @param { Callback<number> } callback - Callback used to listen for the mtu changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        on(type: 'mtuChange', callback: Callback<number>): void;
        /**
         * Unsubscribe mtu changed event.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'mtuChange' } type - Type of the mtu changed event to listen for.
         * @param { Callback<number> } callback - Callback used to listen for the mtu changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        off(type: 'mtuChange', callback?: Callback<number>): void;
    }
    /**
     * Manages SSAP server. Before calling an ssap server method, you must use {@link createServer} to create an Ssap server instance.
     *
     * @typedef Server
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface Server {
        /**
         * Add Ssap service.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { Service } service - ssap service need to be added and registered.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        addService(service: Service): void;
        /**
         * Remove specific Ssap service.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { string } serviceUuid - specific Ssap service need to be removed.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        removeService(serviceUuid: string): void;
        /**
         * Closes this {@code Server} object and unregisters its callbacks.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        close(): void;
        /**
         * Notify the client that the property value of the server changes.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { string } address - Indicates the device address.
         * @param { Property } property - Property applied to update and notify.
         * @returns { Promise<void> } Returns the promise object.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        notifyPropertyChanged(address: string, property: Property): Promise<void>;
        /**
         * Sends a response to to a specified read or write request from a client.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { ServerResponse } response - Indicates the response.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        sendResponse(response: ServerResponse): void;
        /**
         * Subscribe server connection state changed event.
         * If the user has the ohos.permission.GET_NEARLINK_PEER_MAC permission, the real device address is returned.
         * Otherwise, a random device address is returned.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'connectionStateChange' } type - Type of the connection state changed event to listen for.
         * @param { Callback<ConnectionChangeState> } callback - Callback used to listen for the connection state changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        on(type: 'connectionStateChange', callback: Callback<ConnectionChangeState>): void;
        /**
         * Unsubscribe server connection state changed event.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'connectionStateChange' } type - Type of the connection state changed event to listen for.
         * @param { Callback<ConnectionChangeState> } callback - Callback used to listen for the connection state changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        off(type: 'connectionStateChange', callback?: Callback<ConnectionChangeState>): void;
        /**
         * Subscribe event and receive callback when property read by client.
         * If the user has the ohos.permission.GET_NEARLINK_PEER_MAC permission, the real device address is returned.
         * Otherwise, a random device address is returned.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'propertyRead' } type - Type of the property operation event to listen for.
         * @param { Callback<PropertyReadRequest> } callback - Callback used to listen for the property operation event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        on(type: 'propertyRead', callback: Callback<PropertyReadRequest>): void;
        /**
         * Unsubscribe event and do not receive callback when property read by client.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'propertyRead' } type - Type of the property operation event to listen for.
         * @param { Callback<PropertyReadRequest> } callback - Callback used to listen for the property operation event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        off(type: 'propertyRead', callback?: Callback<PropertyReadRequest>): void;
        /**
         * Subscribe event and receive callback when property write by client.
         * If the user has the ohos.permission.GET_NEARLINK_PEER_MAC permission, the real device address is returned.
         * Otherwise, a random device address is returned.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'propertyWrite' } type - Type of the property operation event to listen for.
         * @param { Callback<PropertyWriteRequest> } callback - Callback used to listen for the property operation event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        on(type: 'propertyWrite', callback: Callback<PropertyWriteRequest>): void;
        /**
         * Unsubscribe event and do not receive callback when property write by client.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'propertyWrite' } type - Type of the property operation event to listen for.
         * @param { Callback<PropertyWriteRequest> } callback - Callback used to listen for the property operation event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        off(type: 'propertyWrite', callback?: Callback<PropertyWriteRequest>): void;
        /**
         * Subscribe mtu changed event.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'mtuChange' } type - Type of the mtu changed event to listen for.
         * @param { Callback<number> } callback - Callback used to listen for the mtu changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        on(type: 'mtuChange', callback: Callback<number>): void;
        /**
         * Unsubscribe mtu changed event.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @param { 'mtuChange' } type - Type of the mtu changed event to listen for.
         * @param { Callback<number> } callback - Callback used to listen for the mtu changed event.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 401 - Invalid parameter.
         * @throws { BusinessError } 801 - Capability not supported.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        off(type: 'mtuChange', callback?: Callback<number>): void;
    }
    /**
     * Describes the Ssap service.
     *
     * @typedef Service
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface Service {
        /**
         * The UUID of the service.
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        serviceUuid: string;
        /**
         * The properties belongs to this service.
         *
         * @type { Array<Property> }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        properties: Array<Property>;
    }
    /**
     * Describes the Ssap property.
     *
     * @typedef Property
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface Property {
        /**
         * The UUID of the {@link Service} instance to which the property belongs
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        serviceUuid: string;
        /**
         * The UUID of a Property instance
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        propertyUuid: string;
        /**
         * The value of a Property instance
         *
         * @type { ArrayBuffer }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        value: ArrayBuffer;
        /**
         * The list of {@link propertyDescriptor} contained in the property
         *
         * @type { ?Array<PropertyDescriptor> }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        descriptors?: Array<PropertyDescriptor>;
        /**
         * Indications specify how data values and descriptor values are accessed {@link Operation}.
         * The input parameter is the OR operation of enumerated values.
         *
         * @type { ?number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        operation?: number;
    }
    /**
     * Describes the Ssap descriptor for property.
     *
     * @typedef PropertyDescriptor
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface PropertyDescriptor {
        /**
         * The UUID of the {@link Service} instance to which the master property of descriptor belongs
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        serviceUuid: string;
        /**
         * The UUID of the {@link Property} instance to which the propertyDescriptor belongs
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        propertyUuid: string;
        /**
         * The value of the propertyDescriptor instance
         *
         * @type { ArrayBuffer }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        value: ArrayBuffer;
        /**
         * The type of the propertyDescriptor instance
         *
         * @type { PropertyDescriptorType }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        descriptorType: PropertyDescriptorType;
        /**
         * Indicates whether the descriptor is writable.
         *
         * @type { ?boolean }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        isWriteable?: boolean;
    }
    /**
     * Describes the parameters of the ssap client's property read request.
     *
     * @typedef PropertyReadRequest
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface PropertyReadRequest {
        /**
         * Indicates the device address.
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        address: string;
        /**
         * The UUID of the {@link Service} instance to which the property belongs
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        serviceUuid: string;
        /**
         * The UUID of the Property instance which client request to read
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        propertyUuid: string;
        /**
         * The request ID.
         *
         * @type { number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        requestId: number;
    }
    /**
     * Describes the parameters of the ssap client's property write request.
     *
     * @typedef PropertyWriteRequest
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface PropertyWriteRequest {
        /**
         * Indicates the device address.
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        address: string;
        /**
         * The UUID of the {@link Service} instance to which the property belongs
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        serviceUuid: string;
        /**
         * The UUID of the Property instance which client request to write
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        propertyUuid: string;
        /**
         * Indicates the data to be written.
         *
         * @type { ArrayBuffer }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        value: ArrayBuffer;
        /**
         * The request ID.
         *
         * @type { number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        requestId: number;
        /**
         * The write type for this request.
         *
         * @type { PropertyWriteType }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        writeType: PropertyWriteType;
    }
    /**
     * Describes the parameters of a response send by the server to a specified read or write request.
     *
     * @typedef ServerResponse
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface ServerResponse {
        /**
         * Indicates the device address.
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        address: string;
        /**
         * The request ID.
         *
         * @type { number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        requestId: number;
        /**
         * Indicates the response data.
         *
         * @type { ArrayBuffer }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        value: ArrayBuffer;
    }
    /**
     * Describes ssap connection state.
     *
     * @typedef ConnectionChangeState
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface ConnectionChangeState {
        /**
         * Indicates the device address.
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        address: string;
        /**
         * Connection state.
         *
         * @type { ConnectionState }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        state: ConnectionState;
    }
    /**
     * The enum of property descriptor type.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    enum PropertyDescriptorType {
        /**
         * Attribute Description propertyDescriptor
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        PROPERTY = 1,
        /**
         * client Configuration propertyDescriptor
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        CLIENT_PROPERTY_CONFIG = 2,
        /**
         * server configuration descriptor
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        SERVER_PROPERTY_CONFIG = 3,
        /**
         * Format propertyDescriptor
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        PROPERTY_FORMAT = 4,
        /**
         * Vendor-defined
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        TYPE_VENDOR = 255
    }
    /**
     * Enum of property Operation.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    enum Operation {
        /**
         * Indicates that the property value supports the read operation.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        READABLE = 0x01,
        /**
         * Indicates that the property value supports the write operation. After the write operation, no feedback is sent to the client.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        WRITE_NO_RESPONSE = 0x02,
        /**
         * Indicates that the property value supports the write operation. After the write operation, a feedback is generated to the client.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        WRITE_WITH_RESPONSE = 0x04,
        /**
         * Indicates that the property value notify to client.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        NOTIFY = 0x08
    }
    /**
     * The enum of property write type.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    enum PropertyWriteType {
        /**
         * Write property and wait for response.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        WRITE = 1,
        /**
         * Write property without response.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        WRITE_NO_RESPONSE = 2
    }
}
export default ssap;
