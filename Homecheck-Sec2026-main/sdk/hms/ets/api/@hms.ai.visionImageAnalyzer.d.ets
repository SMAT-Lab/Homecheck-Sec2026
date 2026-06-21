/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024-2024. All rights reserved.
 */
/**
 * @file This module provides image analyzer controller.
 * @kit VisionKit
 */
import type { Callback, ErrorCallback } from '@ohos.base';
import visionBase from '@hms.ai.vision.visionBase';
/**
 * This module is used to control image.
 *
 * @namespace visionImageAnalyzer
 * @syscap SystemCapability.AI.VisionImageAnalyzer
 * @since 5.0.0(12)
 */
declare namespace visionImageAnalyzer {
    /**
     * This is vision image controller, used to control interactions.
     *
     * @extends ImageAnalyzerController
     * @syscap SystemCapability.AI.VisionImageAnalyzer
     * @since 5.0.0(12)
     */
    class VisionImageAnalyzerController extends ImageAnalyzerController {
        /**
         * set whether the image analyzer is visible.
         *
         * @param { ImageAnalyzerVisibility } visibility - The visibility.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        setImageAnalyzerVisibility(visibility: ImageAnalyzerVisibility): void;
        /**
         * set the margin value of the ai button display area from the image.
         *
         * @param { Rect } position - overlay margin.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        setAIButtonPosition(position: Rect): void;
        /**
         * set whether ai button is visible.
         *
         * @param { boolean } visible - ai button visibility.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        setAIButtonVisibility(visible: boolean): void;
        /**
         * set image analyzer text custom menus.
         *
         * @param { Menu[] } menus - text menus.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        setCustomTextMenuItems(menus: Menu[]): void;
        /**
         * start detect subject.
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        startSubjectAnalyzer(): void;
        /**
         * set image analyzer subject custom menus.
         *
         * @param { Menu[] } menus - subject menus
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        setCustomSubjectMenuItems(menus: Menu[]): void;
        /**
         * Set the subject to be selected by ids.
         *
         * @param { number[] } subjectIds - subject ids, invalid ids will be ignore.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        setSelectedSubjects(subjectIds: number[]): void;
        /**
         * get image analyzer selected subjects.
         *
         * @returns { Promise<Subject[] | null> } The selected subject result.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        getSelectedSubjects(): Promise<Subject[] | null>;
        /**
         * get the subject based on the relative image position.
         *
         * @param { visionBase.Point } point - relative image position.
         * @returns { Promise<Subject | null> } subject result.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        getSubject(point: visionBase.Point): Promise<Subject | null>;
        /**
         * get the merged pixelMap based on ids.
         *
         * @param { number[] } subjectIds - subject ids, invalid ids will be ignore.
         * @returns { Promise<PixelMap | null> } merged pixelMap.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        getSubjectsImage(subjectIds: number[]): Promise<PixelMap | null>;
        /**
         * start object search business.
         *
         * @returns { Promise<boolean> } Whether it started successfully.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        startObjectSearch(): Promise<boolean>;
        /**
         * stop object search business.
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        stopObjectSearch(): void;
        /**
         * set imageSegment menu status.
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.1(13)
         */
        setSubjectMenuVisibility(visible: boolean): void;
        /**
         * Subscribe ai button state changed event.
         *
         * @param { 'aiButtonStatusChange' } type - Type of the ai button state changed event to listen for.
         * @param { Callback<AIButtonStatus> } callback - Callback used to listen for the ai button state changed event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        on(type: 'aiButtonStatusChange', callback: Callback<AIButtonStatus>): void;
        /**
         * Unsubscribe ai button state changed event.
         *
         * @param { 'aiButtonStatusChange' } type - Type of the ai button state changed event to listen for.
         * @param { Callback<AIButtonStatus> } callback - Callback used to listen for the ai button state changed event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        off(type: 'aiButtonStatusChange', callback?: Callback<AIButtonStatus>): void;
        /**
         * Subscribe image analyzer visibility state changed event.
         *
         * @param { 'imageAnalyzerVisibilityChange' } type - Type of the image analyzer visibility state changed event to
         * listen for.
         * @param { Callback<ImageAnalyzerVisibility> } callback - Callback used to listen for the image analyzer
         * visibility state changed event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        on(type: 'imageAnalyzerVisibilityChange', callback: Callback<ImageAnalyzerVisibility>): void;
        /**
         * Unsubscribe image analyzer visibility state changed event.
         *
         * @param { 'imageAnalyzerVisibilityChange' } type - Type of the image analyzer visibility state changed event to
         * listen for.
         * @param { Callback<ImageAnalyzerVisibility> } callback - Callback used to listen for the image analyzer
         * visibility state changed event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        off(type: 'imageAnalyzerVisibilityChange', callback?: Callback<ImageAnalyzerVisibility>): void;
        /**
         * Subscribe image analyzer text analyze event.
         *
         * @param { 'textAnalysis' } type - Type of the image analyzer text analyze event.
         * @param { Callback<string> } callback - Callback used to listen for the image analyzer text analyze event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        on(type: 'textAnalysis', callback: Callback<string>): void;
        /**
         * Unsubscribe image analyzer text analyze event.
         *
         * @param { 'textAnalysis' } type - Type of the image analyzer text analyze event.
         * @param { Callback<string> } callback - Callback used to listen for the image analyzer text analyze event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        off(type: 'textAnalysis', callback?: Callback<string>): void;
        /**
         * Subscribe image analyzer selected text change event.
         *
         * @param { 'selectedTextChange' } type - Type of the image analyzer selected text change event.
         * @param { Callback<string> } callback - Callback used to listen for the image analyzer selected text.
         * change event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        on(type: 'selectedTextChange', callback: Callback<string>): void;
        /**
         * Unsubscribe image analyzer selected text change event.
         *
         * @param { 'selectedTextChange' } type - Type of the image analyzer selected text change event.
         * @param { Callback<string> } callback - Callback used to listen for the image analyzer selected text.
         * change event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        off(type: 'selectedTextChange', callback?: Callback<string>): void;
        /**
         * Subscribe image analyzer subject analyze event.
         *
         * @param { 'subjectAnalysis' } type - Type of the image analyzer subject analyze event.
         * @param { Callback<Subject[]> } callback - Callback used to listen for the image analyzer
         * subject analyze event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        on(type: 'subjectAnalysis', callback: Callback<Subject[]>): void;
        /**
         * Unsubscribe image analyzer subject analyze event.
         *
         * @param { 'subjectAnalysis' } type - Type of the image analyzer subject analyze event.
         * @param { Callback<Subject[]> } callback - Callback used to listen for the image analyzer subject
         * analyze event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        off(type: 'subjectAnalysis', callback?: Callback<Subject[]>): void;
        /**
         * Subscribe image analyzer selected subject change event.
         *
         * @param { 'selectedSubjectsChange' } type - Type of the image analyzer selected subject change event.
         * @param { Callback<Subject[]> } callback - Callback used to listen for the image analyzer selected
         * subject change event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        on(type: 'selectedSubjectsChange', callback: Callback<Subject[]>): void;
        /**
         * Unsubscribe image analyzer selected subject change event.
         *
         * @param { 'selectedSubjectsChange' } type - Type of the image analyzer selected subject change event.
         * @param { Callback<Subject[]> } callback - Callback used to listen for the image analyzer selected subject
         * change event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        off(type: 'selectedSubjectsChange', callback?: Callback<Subject[]>): void;
        /**
         * Subscribe image analyzer error event.
         *
         * @param { 'analyzerFailed' } type - Type of the image analyzer error event.
         * @param { ErrorCallback } callback - Callback used to listen for the image analyzer error event.
         * @throws { BusinessError } 401 - If the input parameter is not valid parameter.
         * @throws { BusinessError } 1013700002 - The service is abnormal.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        on(type: 'analyzerFailed', callback: ErrorCallback): void;
        /**
         * Unsubscribe image analyzer error event.
         *
         * @param { 'analyzerFailed' } type - Type of the image analyzer error event.
         * @param { ErrorCallback } callback - Callback used to listen for the image analyzer error event.
         * @throws { BusinessError } 401 - If the input parameter is not valid parameter.
         * @throws { BusinessError } 1013700002 - The service is abnormal.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        off(type: 'analyzerFailed', callback?: ErrorCallback): void;
        /**
         * Subscribe image search event.
         *
         * @param { 'subjectAnalysis' } type - Type of the image analyzer subject analyze event.
         * @param { Callback<Subject[]> } callback - Callback used to listen for the image analyzer
         * image search change event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.1(13)
         */
        on(type: 'objectSearchPanelVisibilityChange', callback: Callback<ObjectSearchPanelVisibility>): void;
        /**
         * Subscribe image search event.
         *
         * @param { 'subjectAnalysis' } type - Type of the image analyzer subject analyze event.
         * @param { Callback<Subject[]> } callback - Callback used to listen for the image analyzer
         * image search change event.
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.1(13)
         */
        off(type: 'objectSearchPanelVisibilityChange', callback?: Callback<ObjectSearchPanelVisibility>): void;
    }
    /**
     * Enum for type of image analyzer visibility.
     *
     * @enum { number }
     * @syscap SystemCapability.AI.VisionImageAnalyzer
     * @since 5.0.0(12)
     */
    enum ImageAnalyzerVisibility {
        /**
         * shown status
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        SHOWN = 0,
        /**
         * hidden status
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        HIDDEN = 1
    }
    /**
     * the type of image search visibility
     *
     * @enum { number }
     * @syscap SystemCapability.AI.VisionImageAnalyzer
     * @since 5.0.1(13)
     */
    enum ObjectSearchPanelVisibility {
        /**
         * image search shown status
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.1(13)
         */
        SHOW = 0,
        /**
         * image search hidden status
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.1(13)
         */
        HIDE = 1
    }
    /**
     * Enum for type of image analyzer ai button status
     *
     * @enum { number }
     * @syscap SystemCapability.AI.VisionImageAnalyzer
     * @since 5.0.0(12)
     */
    enum AIButtonStatus {
        /**
         * selected status
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        SELECTED = 0,
        /**
         * unselected status
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        UNSELECTED = 1,
        /**
         * hidden status
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        HIDDEN = 2
    }
    /**
     * Enum for type of analyzer selected status
     *
     * @enum { number }
     * @syscap SystemCapability.AI.VisionImageAnalyzer
     * @since 5.0.0(12)
     */
    enum SelectedStatus {
        /**
         * selected status
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        SELECTED = 0,
        /**
         * unselected status
         *
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        UNSELECTED = 1
    }
    /**
     * Subject information params, contains basic information about the subject.
     *
     * @typedef Subject
     * @syscap SystemCapability.AI.VisionImageAnalyzer
     * @since 5.0.0(12)
     */
    interface Subject {
        /**
         * id of the subject.
         *
         * @type { number }
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        id: number;
        /**
         * pixelMap of the subject.
         *
         * @type { PixelMap }
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        image: PixelMap;
        /**
         * bounding box of the subject.
         *
         * @type { Rect }
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        boundingBox: Rect;
    }
    /**
     * Rect information params, represents the rectangle area.
     *
     * @interface Rect
     * @syscap SystemCapability.AI.VisionImageAnalyzer
     * @since 5.0.0(12)
     */
    interface Rect {
        /**
         * The left position of Rectangle.
         *
         * @type { ?number }
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        left?: number;
        /**
         * The top position of Rectangle.
         *
         * @type { ?number }
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        top?: number;
        /**
         * The right position of Rectangle.
         *
         * @type { ?number }
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        right?: number;
        /**
         * The bottom position of Rectangle.
         *
         * @type { ?number }
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        bottom?: number;
    }
    /**
     * Menu information params.
     *
     * @interface Menu
     * @syscap SystemCapability.AI.VisionImageAnalyzer
     * @since 5.0.0(12)
     */
    interface Menu {
        /**
         * Text content of the Menu.
         *
         * @type { ResourceStr }
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        value: ResourceStr;
        /**
         * Method executed by the callback.
         *
         * @type { Callback<string | Subject[]> }
         * @syscap SystemCapability.AI.VisionImageAnalyzer
         * @since 5.0.0(12)
         */
        action: Callback<string | Subject[]>;
    }
}
export default visionImageAnalyzer;
