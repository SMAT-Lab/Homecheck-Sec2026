/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
 */
/**
 * @file The module provides the capability of advertising.
 * @kit NearLinkKit
 */
import type { Callback } from '@ohos.base';
/**
 * Provides methods related to advertising. Nearby devices can scan and discover this device.
 *
 * @namespace advertising
 * @syscap SystemCapability.Communication.NearLink.Core
 * @since 5.0.1(13)
 */
declare namespace advertising {
    /**
     * Starts advertising.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @param { AdvertisingParams } advertisingParams - Indicates the param for advertising.
     * @returns { Promise<number> } Returns the promise object advertise handle.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @throws { BusinessError } 1009700003 - Nearlink is off.
     * @throws { BusinessError } 1009700099 - Operation failed.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function startAdvertising(advertisingParams: AdvertisingParams): Promise<number>;
    /**
     * Stops advertising with advertising ID.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @param { number } advertisingId - Indicates the ID for this advertising.
     * @returns { Promise<void> } Returns the promise object.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @throws { BusinessError } 1009700003 - Nearlink is off.
     * @throws { BusinessError } 1009700099 - Operation failed.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function stopAdvertising(advertisingId: number): Promise<void>;
    /**
     * Subscribing to advertising state change event.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @param { 'advertisingStateChange' } type - Type of the advertising state to listen for.
     * @param { Callback<AdvertisingStateChangeInfo> } callback - Callback used to listen for the advertising state.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function on(type: 'advertisingStateChange', callback: Callback<AdvertisingStateChangeInfo>): void;
    /**
     * Unsubscribe from advertising state change event.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @param { 'advertisingStateChange' } type - Type of the advertising state to listen for.
     * @param { Callback<AdvertisingStateChangeInfo> } callback - Callback used to listen for the advertising state.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function off(type: 'advertisingStateChange', callback?: Callback<AdvertisingStateChangeInfo>): void;
    /**
     * Describes the advertising parameters.
     *
     * @typedef AdvertisingParams
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface AdvertisingParams {
        /**
         * Indicates the advertising settings.
         *
         * @type { AdvertisingSettings }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        advertisingSettings: AdvertisingSettings;
        /**
         * Indicates the advertising data.
         *
         * @type { AdvertisingData }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        advertisingData: AdvertisingData;
    }
    /**
     * Describes the settings for advertising.
     *
     * @typedef AdvertisingSettings
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface AdvertisingSettings {
        /**
         * Indicates the advertising interval, the unit is slot.
         * The minimum number of slots is 160, and the corresponding time is 20 ms. (160 * 0.125 = 20ms).
         * The maximum number of slots is 16777215, and the corresponding time is 2097151.875 ms.
         * If the "interval" is not set, the default value is 5000, and the corresponding time is 625 ms.
         *
         * @type { ?number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        interval?: number;
        /**
         * Indicates the advertising power mode.
         * If the "power" is not set, the default value is "ADV_TX_POWER_LOW".
         *
         * @type { ?TxPowerMode }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        power?: TxPowerMode;
        /**
         * Indicates whether the advertising is connectable.
         * If the "isConnectable" is not set, the default value is true.
         *
         * @type { ?boolean }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        isConnectable?: boolean;
    }
    /**
     * Describes the advertising data.
     *
     * @typedef AdvertisingData
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface AdvertisingData {
        /**
         * The specified service UUID.
         *
         * @type { ?Array<string> }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        serviceUuids?: Array<string>;
        /**
         * The specified manufacturer data.
         *
         * @type { ?Array<ManufacturerData> }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        manufacturerData?: Array<ManufacturerData>;
        /**
         * The specified service data.
         *
         * @type { ?Array<ServiceData> }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        serviceData?: Array<ServiceData>;
        /**
         * Indicates whether the device name will be included.
         *
         * @type { ?boolean }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        includeDeviceName?: boolean;
    }
    /**
     * Describes the manufacturer data.
     *
     * @typedef ManufacturerData
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface ManufacturerData {
        /**
         * Indicates the manufacturer ID.
         *
         * @type { number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        manufacturerId: number;
        /**
         * Indicates the manufacturer data.
         *
         * @type { ArrayBuffer }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        manufacturerData: ArrayBuffer;
    }
    /**
     * Describes the service data.
     *
     * @typedef ServiceData
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface ServiceData {
        /**
         * Indicates service uuid.
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        serviceUuid: string;
        /**
         * Indicates the service data.
         *
         * @type { ArrayBuffer }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        serviceData: ArrayBuffer;
    }
    /**
     * The enum of advertising mode.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    enum TxPowerMode {
        /**
         * Low power mode.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        ADV_TX_POWER_LOW = 1,
        /**
         * Medium power mode.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        ADV_TX_POWER_MEDIUM = 2,
        /**
         * High power mode.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        ADV_TX_POWER_HIGH = 3
    }
    /**
     * Advertising state change information.
     *
     * @typedef AdvertisingStateChangeInfo
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface AdvertisingStateChangeInfo {
        /**
         * Indicates the advertising ID.
         *
         * @type { number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        advertisingId: number;
        /**
         * Indicates the advertising state.
         *
         * @type { AdvertisingState }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        state: AdvertisingState;
    }
    /**
     * The enum of advertising state.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    enum AdvertisingState {
        /**
         * Indicates the advertising is started.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        STARTED = 1,
        /**
         * Indicates the advertising is stopped.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        STOPPED = 2
    }
}
export default advertising;
