/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
 */
/**
 * @file This module provides the capability of netHandover.
 * @kit NetworkBoostKit
 */
import type { Callback } from '@ohos.base';
import connection from '@ohos.net.connection';
import netQuality from '@hms.networkboost.netquality';
/**
 * Provides Network handover APIs.
 * @namespace netHandover
 * @syscap SystemCapability.Communication.NetworkBoost.Core
 * @since 5.0.0(12)
 */
declare namespace netHandover {
    /**
     * Subscribe to the handover state change event.
     *
     * @permission ohos.permission.GET_NETWORK_INFO
     * @param { 'handoverChange' } type - Type of the handover change state to listen for.
     * @param { Callback<HandoverInfo> } callback - Callback used to listen for the handover change.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    function on(type: 'handoverChange', callback: Callback<HandoverInfo>): void;
    /**
     * Unsubscribe to the handover state change event.
     *
     * @permission ohos.permission.GET_NETWORK_INFO
     * @param { 'handoverChange' } type - Type of the handover change state to listen for.
     * @param { Callback<HandoverInfo> } callback - Callback used to listen for the handover change.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    function off(type: 'handoverChange', callback?: Callback<HandoverInfo>): void;
    /**
     * Set net handover mode.
     *
     * @permission ohos.permission.GET_NETWORK_INFO
     * @param { HandoverMode } mode - Mode of the net handover.
     * @throws { BusinessError } 201 - Permission denied.
     * @throws { BusinessError } 401 - Invalid parameter.
     * @throws { BusinessError } 801 - Capability not supported.
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    function setHandoverMode(mode: HandoverMode): void;
    /**
     * Callbacks to device on various events during handover.
     * @typedef HandoverInfo
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    interface HandoverInfo {
        /**
         * HandoverStart info.
         * @type { ?HandoverStart }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        readonly handoverStart?: HandoverStart;
        /**
         * HandoverComplete info.
         * @type { ?HandoverComplete }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        readonly handoverComplete?: HandoverComplete;
    }
    /**
     * Handover start info.
     * @typedef HandoverStart
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    interface HandoverStart {
        /**
         * Timeout of handover, in seconds.
         * @type { number }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        expires: number;
        /**
         * Data speed action on old path.
         * @type { DataSpeedAction }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        dataSpeedAction: DataSpeedAction;
    }
    /**
     * Data speed action info.
     * @typedef DataSpeedAction
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    interface DataSpeedAction {
        /**
         * Data speed simple action.
         * @type { netQuality.DataSpeedSimpleAction }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        dataSpeedSimpleAction: netQuality.DataSpeedSimpleAction;
        /**
         * Uplink bandwidth.
         * @type { RateBps }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        linkUpBandwidth: netQuality.RateBps;
        /**
         * Downlink bandwidth.
         * @type { RateBps }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        linkDownBandwidth: netQuality.RateBps;
    }
    /**
     * Handover complete info.
     * @typedef HandoverComplete
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    interface HandoverComplete {
        /**
         * Handover result.
         * @type { ErrorResult }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        result: ErrorResult;
        /**
         * Whether is still new path to be activated, if value set to false, means the last new path.
         * @type { boolean }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        handoverContinue: boolean;
        /**
         * Old path lifetime in seconds.
         * @type { number }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        oldPathLifetime: number;
        /**
         * Data speed action on old path.
         * @type { DataSpeedAction }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        oldDataSpeedAction: DataSpeedAction;
        /**
         * Whether pathType changed.
         * @type { boolean }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        pathTypeChanged: boolean;
        /**
         * New path netHandle.
         * @type { ?connection.NetHandle }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        newNetHandle?: connection.NetHandle;
        /**
         * ReEst action.
         * @type { ReEstAction }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        reEstAction: ReEstAction;
        /**
         * Data speed action on new path.
         * @type { DataSpeedAction }
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        newDataSpeedAction: DataSpeedAction;
    }
    /**
     * Enum of Handover mode.
     * @enum { number }
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    enum HandoverMode {
        /**
         * Handover is triggered by the OS, and the OS activates the new path. This is the default value.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        DELEGATION = 0,
        /**
         * Handover is not triggered by the OS, app activates the new path itself,
         * however, when the app is in the background, handover may triggered by the OS.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        DISCRETION = 1
    }
    /**
     * Enum of the re-establish action.
     * @enum { number }
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    enum ReEstAction {
        /**
         * The App needs to re-establish the connection through the same remote IP address.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        DEFAULT = 0,
        /**
         * Data path type changed, e.g. wifi -> cell, or operator changed.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        QUERY_DNS = 1,
        /**
         * The remote IP needs to be changed, and the App needs to re-establish the connection using the new remote IP.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        CHANGE_REMOTE_IP = 2,
        /**
         * The IP version needs to be changed, e.g. ipv4 <-> ipv6.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        CHANGE_IP_VERSION = 3,
        /**
         * The data path and IP do not change. The App needs to retry to fetch the resource from the remote in the current connection.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        NO_EST = 4
    }
    /**
     * Enum of handover error result.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NetworkBoost.Core
     * @since 5.0.0(12)
     */
    enum ErrorResult {
        /**
         * Indicates no error, handover is success.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        ERROR_NONE = 0,
        /**
         * Indicates handover timeout.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        ERROR_HANDOVER_TIMEOUT = 1,
        /**
         * Indicates that the activation of the new path has failed.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        ERROR_NEW_PATH_ACTIVATION_FAILED = 2,
        /**
         * Indicates handover abort.
         * @syscap SystemCapability.Communication.NetworkBoost.Core
         * @since 5.0.0(12)
         */
        ERROR_ABORT = 3
    }
}
export default netHandover;
