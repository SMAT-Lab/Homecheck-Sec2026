/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024-2024. All rights reserved.
 */
/**
 * @file Defines harmony share capability.
 * @kit ShareKit
 */
import systemShare from '@hms.collaboration.systemShare';
import type { Callback } from '@ohos.base';
/**
 * Provide methods make the host (data owner) application can conveniently wrap shared data,
 * do the harmony share.
 *
 * @namespace harmonyShare
 * @syscap SystemCapability.Collaboration.HarmonyShare
 * @stagemodelonly
 * @since 5.0.0(12)
 */
declare namespace harmonyShare {
    /**
     * Describe the harmony share method.
     * @typedef SharableTarget
     * @syscap SystemCapability.Collaboration.HarmonyShare
     * @stagemodelonly
     * @since 5.0.0(12)
     */
    interface SharableTarget {
        /**
         * Start the harmony share with shared data
         *
         * @param { systemShare.SharedData } data - host application's shared data
         * @returns { Promise<void> } - returns promise void.
         * @throws { BusinessError } 401 - Parameter error.
         * @syscap SystemCapability.Collaboration.HarmonyShare
         * @stagemodelonly
         * @since 5.0.0(12)
         */
        share(data: systemShare.SharedData): Promise<void>;
    }
    /**
     * Register the Tap nearby event callback.
     *
     * @param { 'knockShare' } event - nearby event.
     * @param { Callback<SharableTarget> } callback - Called when resource can be shared.
     * @throws { BusinessError } 401 - Parameter error.
     * @syscap SystemCapability.Collaboration.HarmonyShare
     * @stagemodelonly
     * @since 5.0.0(12)
     */
    function on(event: 'knockShare', callback: Callback<SharableTarget>): void;
    /**
     * Cancel the Tap nearby event registered through { @link on }.
     *
     * @param { 'knockShare' } event - canceled event.
     * @param { Callback<SharableTarget> } callback - Called when callback unregister.
     * @throws { BusinessError } 401 - Parameter error.
     * @syscap SystemCapability.Collaboration.HarmonyShare
     * @stagemodelonly
     * @since 5.0.0(12)
     */
    function off(event: 'knockShare', callback?: Callback<SharableTarget>): void;
}
export default harmonyShare;
