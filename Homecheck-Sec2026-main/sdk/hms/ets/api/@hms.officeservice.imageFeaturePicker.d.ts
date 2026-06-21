/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved.
 */
/**
 * @file Defines the capabilities of image feature picker module.
 * @kit Penkit
 */
import common2D from '@ohos.graphics.common2D';
import colorSpaceManager from '@ohos.graphics.colorSpaceManager';
/**
* This module provides the capability to image feature picker.
* @namespace imageFeaturePicker
* @syscap SystemCapability.Stylus.ColorPicker
* @since 5.0.0(12)
*/
declare namespace imageFeaturePicker {
    /**
     * Provides struct of PickedColorInfo.
     *
     * @interface PickedColorInfo
     * @syscap SystemCapability.Stylus.ColorPicker
     * @since 5.0.0(12)
     */
    interface PickedColorInfo {
        /**
         * The color result of color picker.
         *
         * @type {common2D.Color}
         * @syscap SystemCapability.Stylus.ColorPicker
         * @since 5.0.0(12)
         */
        color: common2D.Color;
        /**
         * The color space result of color picker.
         *
         * @type {colorSpaceManager.ColorSpace}
         * @syscap SystemCapability.Stylus.ColorPicker
         * @since 5.0.0(12)
         */
        colorSpace: colorSpaceManager.ColorSpace;
        /**
         * The time stamp of color picker.
         *
         * @type {number}
         * @syscap SystemCapability.Stylus.ColorPicker
         * @since 5.0.0(12)
         */
        timestamp: number;
    }
    /**
     * pick current colorspace and color of an image
     *
     * @param { number } x - Global color picker initial position x.
     * @param { number } y - Global color picker initial position y.
     * @return { Promise<PickedColorInf> } Global color result.
     * @throws { BusinessError } 401 - Parameter error. Possible causes:
     * 1. Mandatory parameters are left unspecified.
     * 2. Incorrect parameter types.
     * 3. Parameter verification failed.
     * @throws { BusinessError } 801 - api is not supported
     * @throws { BusinessError } 1013900001 - IPC communication failed
     * @throws { BusinessError } 1013900002 - memory is insufficient
     * @throws { BusinessError } 1013900003 - service is invalid
     * @throws { BusinessError } 1013900004 - multi app call
     * @throws { BusinessError } 1013900005 - background service call
     * @syscap SystemCapability.Stylus.ColorPicker
     * @since 5.0.0(12)
     */
    function pickForResult(x?: number, y?: number): Promise<PickedColorInfo>;
}
export default imageFeaturePicker;
