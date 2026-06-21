/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
 */
/**
 * @file The module provides the capability to interact with remote devices.
 * @kit NearLinkKit
 */
import constant from '@hms.nearlink.constant';
/**
 * Provides interaction methods such as pairing and connection with remote devices.
 *
 * @namespace remoteDevice
 * @syscap SystemCapability.Communication.NearLink.Core
 * @since 5.0.1(13)
 */
declare namespace remoteDevice {
    /**
     * Indicate the pairing state.
     *
     * @typedef { constant.PairingState }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    type PairingState = constant.PairingState;
    /**
     * Indicate the connection state.
     *
     * @typedef { constant.ConnectionState }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    type ConnectionState = constant.ConnectionState;
    /**
     * Indicate the device class.
     *
     * @typedef { constant.DeviceClass }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    type DeviceClass = constant.DeviceClass;
    /**
     * Creates a remote device instance.
     *
     * @param { string } address - Indicates the device address. For example, "11:22:33:AA:BB:FF".
     * @returns { RemoteDevice } Returns a near link remote device instance.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function createRemoteDevice(address: string): RemoteDevice;
    /**
     * Remote device operation methods.
     *
     * @typedef RemoteDevice
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface RemoteDevice {
        /**
         * Get the pair state.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @returns { PairingState } Returns the pair state.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        getPairingState(): PairingState;
        /**
         * Get the name of the Nearlink device.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @returns { string } Returns the device name.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        getDeviceName(): string;
        /**
         * Get the type of the Nearlink device.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @returns { DeviceClass } Indicates the type of the Nearlink device.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        getDeviceClass(): DeviceClass;
        /**
         * Get the profile connection state.
         *
         * @permission ohos.permission.ACCESS_NEARLINK
         * @returns { ConnectionState } Returns the connection state.
         * @throws { BusinessError } 201 - Permission denied.
         * @throws { BusinessError } 801 - Capability not supported.
         * @throws { BusinessError } 1009700003 - Nearlink is off.
         * @throws { BusinessError } 1009700099 - Operation failed.
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        getConnectionState(): ConnectionState;
    }
}
export default remoteDevice;
