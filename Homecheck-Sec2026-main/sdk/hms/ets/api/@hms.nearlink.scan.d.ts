/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
 */
/**
 * @file The module provides the capability of scan.
 * @kit NearLinkKit
 */
import type { Callback } from '@ohos.base';
/**
 * Provides methods for scanning and discovering nearby devices.
 *
 * @namespace scan
 * @syscap SystemCapability.Communication.NearLink.Core
 * @since 5.0.1(13)
 */
declare namespace scan {
    /**
     * Starts scanning for specified Nearlink devices with filters.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @param { Array<ScanFilters> } filters - Indicates the list of filters and this parameter is mandatory.
     * If no filter is configured, this interface throws an error.
     * @param { ScanOptions } options - Indicates the parameters for scanning and the low power mode is used by default.
     * @returns { Promise<void> } Returns the promise object.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @throws { BusinessError } 1009700003 - Nearlink is off.
     * @throws { BusinessError } 1009700099 - Operation failed.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function startScan(filters: Array<ScanFilters>, options?: ScanOptions): Promise<void>;
    /**
     * Stops scanning.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @returns { Promise<void> }
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 801 - Capability not supported.
     * @throws { BusinessError } 1009700003 - Nearlink is off.
     * @throws { BusinessError } 1009700099 - Operation failed.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function stopScan(): Promise<void>;
    /**
     * Subscribe nearlink scan result.
     * If the user has the ohos.permission.GET_NEARLINK_PEER_MAC permission, the real device address is returned.
     * Otherwise, a random device address is returned.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @param { 'deviceFound' } type - Type of the scan result event to listen for.
     * @param { Callback<Array<ScanResults>> } callback - Callback used to listen for the scan result event.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function on(type: 'deviceFound', callback: Callback<Array<ScanResults>>): void;
    /**
     * Unsubscribe nearlink scan result.
     *
     * @permission ohos.permission.ACCESS_NEARLINK
     * @param { 'deviceFound' } type - Type of the scan result event to listen for.
     * @param { Callback<Array<ScanResults>> } callback - Callback used to listen for the scan result event.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    function off(type: 'deviceFound', callback?: Callback<Array<ScanResults>>): void;
    /**
     * Describes the contents of the scan results.
     *
     * @typedef ScanResults
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface ScanResults {
        /**
         * Indicates the device address.
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        address: string;
        /**
         * RSSI of the peripheral device
         *
         * @type { number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        rssi: number;
        /**
         * The raw data.
         *
         * @type { ArrayBuffer }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        data: ArrayBuffer;
        /**
         * The local name of the nearlink device.
         *
         * @type { string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        deviceName: string;
        /**
         * Indicates whether the advertising is connectable.
         *
         * @type { boolean }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        isConnectable: boolean;
    }
    /**
     * Describes the scan filters.
     *
     * @typedef ScanFilters
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface ScanFilters {
        /**
         * Indicates the device address.
         *
         * @type { ?string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        address?: string;
        /**
         * Indicates the device name.
         *
         * @type { ?string }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        deviceName?: string;
        /**
         * Indicates the manufacturer ID.
         *
         * @type { ?number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        manufacturerId?: number;
        /**
         * Indicates the manufacturer data.
         *
         * @type { ?ArrayBuffer }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        manufacturerData?: ArrayBuffer;
        /**
         * Indicates the manufacturer data mask.
         *
         * @type { ?ArrayBuffer }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        manufacturerDataMask?: ArrayBuffer;
    }
    /**
     * Describes the parameters for scan.
     *
     * @typedef ScanOptions
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    interface ScanOptions {
        /**
         * Indicates the scan mode.
         * If the "scanMode" is not set, the default value is "SCAN_MODE_LOW_POWER".
         *
         * @type { ?ScanMode }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        scanMode?: ScanMode;
        /**
         * Indicates the scan duration.
         * The "duration", unit is second, valid range is from 10s to 60s. If the "duration" is not set, the scanning is performed all the time.
         *
         * @type { ?number }
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        duration?: number;
    }
    /**
     * The enum of scan duty.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    enum ScanMode {
        /**
         * Low-power mode with a low scanning frequency (default configuration).
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        SCAN_MODE_LOW_POWER = 0,
        /**
         * Indicates medium scan frequency.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        SCAN_MODE_BALANCED = 1
    }
}
export default scan;
