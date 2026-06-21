/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024-2024. All rights reserved.
 */
/**
 * @file Defines UI components used to show PDF.
 * @kit PDFKit
 */
import image from '@ohos.multimedia.image';
import pdfService from '@hms.officeservice.pdfservice';
import { Callback } from '@ohos.base';
/**
 * Defines the business logic of the PDF view.
 * @namespace pdfViewManager
 * @syscap SystemCapability.OfficeService.PDFService.Core
 * @since 5.0.0(12)
 */
declare namespace pdfViewManager {
    /**
     * Supported annotation types on PDF pages
     * @enum { number }
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export enum SupportedAnnotationType {
        /**
         * Sticky unknown type.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        UNKNOWN = 0,
        /**
         * Free text.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        FREE_TEXT = 3,
        /**
         * Line.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        LINE = 4,
        /**
         * Square, including rectangle.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        SQUARE = 5,
        /**
         * Oval, including circle.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        OVAL = 6,
        /**
         * Polygon.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        POLYGON = 7,
        /**
         * Highlight.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        HIGHLIGHT = 9,
        /**
         * Underline.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        UNDERLINE = 10,
        /**
         * Strikethrough.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        STRIKETHROUGH = 12
    }
    /**
     * Supported annotation change types on PDF pages
     * @enum { number }
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export enum AnnotationEditType {
        /**
         * add.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        ADD = 0,
        /**
         * modify.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        MODIFY = 1,
        /**
         * delete.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        DELETE = 2
    }
    /**
     * The information of PageRects.
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export class PageRects {
        /**
         * The PageRects page index.
         * @type { number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        pageIndex: number;
        /**
         * The array of PdfRect in order describing the rect.
         * @type { Array<pdfService.PdfRect> }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        rectArray: Array<pdfService.PdfRect>;
        /**
         * Constructor
         * @param { number } pageIndex - The PageRects page index.
         * @param { Array<pdfService.PdfRect> } rectArray - The array of PdfRect in order describing the rect.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        constructor(pageIndex: number, rectArray: Array<pdfService.PdfRect>);
    }
    /**
     * Rectangular area of selected text
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export class SelectedRects extends PageRects {
        /**
         * Constructor
         * @param { number } pageIndex - The page index.
         * @param { Array<pdfService.PdfRect> } rectArray - The Page rect area.
         * @param { number } isRotated - Whether the PageWithRect is rotate.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        constructor(pageIndex: number, rectArray: Array<pdfService.PdfRect>, isRotated: number);
        /**
         * Whether the SelectedRects is rotate.
         * @type { number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        isRotated: number;
    }
    /**
     * ActionType that requires service redirection.
     * @enum { number }
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export enum RedirectType {
        /**
         * uri.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        URI = 6,
        /**
         * launch, local file path
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        LAUNCH = 4
    }
    /**
     * The information of Redirect Info.
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export class RedirectInfo {
        /**
         * The redirect info content.
         * @type { string }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        content: string;
        /**
         * The RedirectType action type.
         * @type { RedirectType }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        actionType: RedirectType;
        /**
         * Constructor
         * @param { string } content - The redirect info content
         * @param { RedirectType } actionType - The RedirectType action type
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        constructor(content: string, actionType: RedirectType);
    }
    /**
     * The information of SelectedAnnotation.
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export class SelectedAnnotation {
        /**
         * The pdf Annotation index.
         * @type { number }
         * @readonly
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        readonly annotationIndex: number;
        /**
         * The pdf Annotation page index.
         * @type { number }
         * @readonly
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        readonly pageIndex: number;
        /**
         * The pdf annotation type.
         * @type { SupportedAnnotationType }
         * @readonly
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        readonly annotationType: SupportedAnnotationType;
        /**
         * The pdf annotation color. - Color(ARGB)
         * @type { number }
         * @readonly
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        readonly color: number;
        /**
         * The array of pdf annotation rect area.
         * @type { ?Array<pdfService.PdfRect> }
         * @readonly
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        readonly rect?: Array<pdfService.PdfRect>;
        /**
         * The pdf annotation points.
         * @type { ?Array<pdfService.PdfPoint> }
         * @readonly
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        readonly points?: Array<pdfService.PdfPoint>;
    }
    /**
     * The param of registerScrollListener function.
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export class ScrollParam {
        /**
         * offset X, the parameter is the percentage offset
         * @type { number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        offsetX: number;
        /**
         * offset Y, the parameter is the percentage offset
         * @type { number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        offsetY: number;
        /**
         * pdf width, the parameter is the total width of the scaled PDF.
         * @type { number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        pdfWidth: number;
        /**
         * pdf height, the parameter is the total height of the scaled PDF.
         * @type { number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        pdfHeight: number;
        /**
         * The width of the control, For example, if DPI = 1.25, the viewWidth is approximately the outer width * 1.25.
         * @type { number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        viewWidth: number;
        /**
         * The height of the control, For example, if DPI = 1.25, the viewHeight is approximately the outer height * 1.25.
         * @type { number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        viewHeight: number;
    }
    /**
     * The param of registerTextSelectedListener function.
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export class TextSelectedParam {
        /**
         * The text parameter is the selected text. If text is empty, the selection is canceled.
         * @type { string }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        text: string;
        /**
         * The selected text is in rectangular areas of the PDF page.
         * @type { Array<SelectedRects> }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        pdfRect: Array<SelectedRects>;
    }
    /**
     * The param of registerImageSelectedListener function.
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export class ImageSelectedParam {
        /**
         * image type.
         * @type { pdfService.ImageFormat }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        imageType: pdfService.ImageFormat;
        /**
         * The buffer parameter is the image content. If the buffer is empty, the selection is canceled.
         * @type { ?ArrayBuffer }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        buffer?: ArrayBuffer;
        /**
         * Rectangular area of the selected image on the PDF page
         * @type { ?pdfService.PdfRect }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        pdfRect?: pdfService.PdfRect;
        /**
         * page index
         * @type { ?number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        pageIndex?: number;
    }
    /**
     * The param of registerAnnotationChangedListener function.
     * When there is a callback, the value is always 1. If the value does not change, the callback is not performed.
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export class AnnotationChangedParam {
        /**
         * color - Color(ARGB)
         * @type { number }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        color: number;
        /**
         * annotation type
         * @type { SupportedAnnotationType }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        annotationType: SupportedAnnotationType;
        /**
         * annotation index list
         * @type { Array<number> }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        pageIndexArray: Array<number>;
        /**
         * annotation edit type
         * @type { AnnotationEditType }
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        controlType: AnnotationEditType;
    }
    /**
     * The information of pdf page controller.
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    export class PdfController {
        /**
         * Constructor
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        constructor();
        /**
         * Sets the view offset for PdfView page scrolling
         * @param { number } offsetX - The percentage offset for horizontal scrolling. For example,
         * if the total width is 1000 and you want to move to 500, pass 0.5.
         * @param { number } offsetY - Percentage offset for vertical scrolling. Same as offsetX.
         * @param { boolean } refreshView - Whether to refresh the view. In general, you should not constantly
         * refresh the view while your finger is pressed, as this can cause lag.
         * Refreshes the view only when the finger is raised.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setViewOffset(offsetX: number, offsetY: number, refreshView: boolean): void;
        /**
         * Obtain the thumbnail of the corresponding PDF page.
         * @param { number } pageIndex - page index
         * @param { boolean } [isSync] - Whether to obtain the latest thumbnail synchronously
         * @returns { Promise<image.PixelMap> } Image PixelMap object.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getPagePixelMap(pageIndex: number, isSync?: boolean): Promise<image.PixelMap>;
        /**
         * Register Scroll Listener.
         * @param { Callback<ScrollParam> } listener - Callback function of the listener
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerScrollListener(listener: Callback<ScrollParam>): void;
        /**
         * Set whether the page supports dragging.
         * @param { boolean } verticalEnabled - Indicates whether to enable vertical dragging.
         * @param { boolean } horizontalEnabled - Whether to enable horizontal dragging.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        enablePageDrag(verticalEnabled: boolean, horizontalEnabled: boolean): void;
        /**
         * Loads a file and displays a specified page.
         * @param { string } path - file path
         * @param { string } [password] - file password
         * @param { number } [initPageIndex] - Initial Page Number
         * @param { Callback<number> } [onProgress] - Progress callback where progress is the progress.
         * Whether to cancel the opening depends on the return value of the callback function.
         * If the return value is not 0, the opening is canceled.
         * @returns { Promise<pdfService.ParseResult> } parse result.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        loadDocument(path: string, password?: string, initPageIndex?: number, onProgress?: Callback<number>): Promise<pdfService.ParseResult>;
        /**
         * Releasing a Loaded File
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        releaseDocument(): void;
        /**
         * Setting the highlight area
         * @param { Array<PageRects> } rectArray - The array of PageRects
         * @param { number } [color] - highlight color - Color(ARGB)
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setHighlightRects(rectArray: Array<PageRects>, color?: number): void;
        /**
         * Sets the highlighted text area.
         * @param { number } pageIndex - page index
         * @param { string[] } textArray - Array of text to be highlighted.
         * @param { number } color - highlight color - Color(ARGB)
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setHighlightText(pageIndex: number, textArray: string[], color: number): void;
        /**
         * Sets the magnification of the view.
         * @param { number } zoom - Scaling (0.1 - 10).
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setPageZoom(zoom: number): void;
        /**
         * Gets the zoom factor of the view
         * @returns { number } get page zoom number
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getPageZoom(): number;
        /**
         * Set the page layout mode: Single/Double = 1/2
         * @param { pdfService.PageLayout } columnCount - Layout mode: 1 = single-page mode, 2 = double-page mode.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setPageLayout(columnCount: pdfService.PageLayout): void;
        /**
         * Obtain the page layout mode: Single/Double = 1/2
         * @returns { pdfService.PageLayout } - Layout mode: 1 = single-page mode, 2 = double-page mode.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getPageLayout(): pdfService.PageLayout;
        /**
         * Sets whether the pages are consecutive. Only vertical alignment is supported.
         * @param { boolean } isContinuous - Indicates whether to scroll continuously.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setPageContinuous(isContinuous: boolean): void;
        /**
         * Obtains whether pages are consecutively arranged. Only vertical arrangement is supported.
         * @returns { boolean } - Whether to scroll continuously
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        isPageContinuous(): boolean;
        /**
         * Set the page fit mode.
         * @param { pdfService.PageFit } pageFit - Fit mode: 0 = no fit,
         * 1 = fit whole page, 2 = fit page width, 3 = fit page height
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setPageFit(pageFit: pdfService.PageFit): void;
        /**
         * Get the page fit mode.
         * @returns { pdfService.PageFit } PageFit - Fit mode: 0 = no fit,
         * 1 = fit whole page, 2 = fit page width, 3 = fit page height
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getPageFit(): pdfService.PageFit;
        /**
         * Set the spacing between pages
         * @param { number } horizontal - Spacing between the left and right pages in two-page mode.
         * @param { number } [vertical] - Spacing between the upper and lower pages
         * in continuous scrolling mode. The default value is the same as row.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setPageSpacing(horizontal: number, vertical?: number): void;
        /**
         * Spacing between left and right pages in two-page mode
         * @returns { number } page horizontal spacing
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getPageHorizontalSpacing(): number;
        /**
         * Spacing between the upper and lower pages.
         * @returns { number } page vertical spacing
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getPageVerticalSpacing(): number;
        /**
         * Obtains the total number of pages in a document.
         * @returns { number } get page count
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getPageCount(): number;
        /**
         * Obtains the current page number.
         * @returns { number } current page index
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getPageIndex(): number;
        /**
         * Go to the head of the specified page
         * @param { number } pageIndex - page index
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        goToPage(pageIndex: number): void;
        /**
         * Rotate the specified page (only the display effect is rotated, not the content): 0/90/180/270
         * @param { number } pageIndex - page index
         * @param { pdfService.RotationAngle } angle - angle of rotation: 0/90/180/270
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setPageRotation(pageIndex: number, angle: pdfService.RotationAngle): void;
        /**
         * Obtain the rotation degree of the specified page
         * (the rotation is only the display effect, not the content): 0/90/180/270
         * @param { number } pageIndex - page index
         * @returns { pdfService.RotationAngle } - angle of rotation: 0/90/180/270
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getPageRotation(pageIndex: number): pdfService.RotationAngle;
        /**
         * Switch between common operations and add comments. Currently,
         * highlight, underline, and strikethrough are supported.
         * @param { SupportedAnnotationType } annotationType - Annotation type (see Constant.AnnotationType).
         * @param { number } [color] - Color(ARGB)
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        enableAnnotation(annotationType: SupportedAnnotationType, color?: number): void;
        /**
         * Add text annotations such as highlighting
         * @param { SupportedAnnotationType } annotationType - Annotation Type
         * @param { Array<SelectedRects> } selectedRects -  Selected text rect Area
         * @param { number } color - Annotation Color - Color(ARGB)
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        addMarkupAnnotation(annotationType: SupportedAnnotationType, selectedRects: Array<SelectedRects>, color: number): void;
        /**
         * Stopping the operation of adding a comment
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        disableAnnotation(): void;
        /**
         * Only after being selected can be deleted, selected to get the real index,
         * or their own traversal Annots and then pass the index can also support the deletion and modification
         * @param { number } annotationIndex - Annotation index.
         * @param { number } pageIndex - page index.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        deleteSelectedAnnotation(annotationIndex: number, pageIndex: number): void;
        /**
         * Modify Annotation Color
         * @param { number } annotationIndex - Annotation index
         * @param { number } pageIndex - page index.
         * @param { number } color - Color, for example, 0xFF000000 (ARGB).
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        updateMarkupAnnotation(annotationIndex: number, pageIndex: number, color: number): void;
        /**
         * Save the file
         * @param { string } path -  The save path must be different from the source file path.
         * @param { Callback<number> } [onProgress] - Progress callback function,
         * The progress argument is the progress value.
         * @returns { Promise<number> } - Promise number
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        saveDocument(path: string, onProgress?: Callback<number>): Promise<number>;
        /**
         * The window changes when the selected text is dragged. As a result,
         * the highlighted block in the selected area also changes.
         * @param { Callback<Array<SelectedRects>> } listener - Callback function of the listener.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerSelectedRectsChangedListener(listener: Callback<Array<SelectedRects>>): void;
        /**
         * Sets a listener for PageFit property changes.
         * @param { Callback<pdfService.PageFit> } listener - Callback function of the listener.
         * The value argument is the current value of the property.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerPageFitChangedListener(listener: Callback<pdfService.PageFit>): void;
        /**
         * Sets a listener for PageIndex property changes.
         * @param { Callback<number> } listener - Callback function of the listener.
         * The value argument is the current value of the property.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerPageChangedListener(listener: Callback<number>): void;
        /**
         * Sets a listener for Zoom property changes.
         * @param { Callback<number> } listener - Callback function of the listener
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerScaleChangedListener(listener: Callback<number>): void;
        /**
         * Set Text Selection Listener
         * @param { Callback<TextSelectedParam> } listener - Callback function of the listener
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerTextSelectedListener(listener: Callback<TextSelectedParam>): void;
        /**
         * Set annotation selection listening
         * @param { Callback<SelectedAnnotation> } listener - Callback function of the listener
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerAnnotationSelectedListener(listener: Callback<SelectedAnnotation>): void;
        /**
         * Sets the listener for image selection.
         * @param {Callback<ImageSelectedParam>} listener - Callback function of the listener
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerImageSelectedListener(listener: Callback<ImageSelectedParam>): void;
        /**
         * Action click Callback
         * @param { Callback<RedirectInfo> } listener - Callback function of the listener
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerActionClickListener(listener: Callback<RedirectInfo>): void;
        /**
         * Monitor whether comments are changed (added, modified, or deleted), that is, whether comments are edited.
         * @param { Callback<AnnotationChangedParam> } listener - Callback function of the listener
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerAnnotationChangedListener(listener: Callback<AnnotationChangedParam>): void;
        /**
         * Register a listener for the change of the total number of PDF document pages.
         * @param { Callback<number> } listener - Callback function of the listener
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        registerPageCountChangedListener(listener: Callback<number>): void;
        /**
         * Searches for text and returns the total number of matches
         * @param { string } text - The text to search for.
         * @param { Callback<number> } listener - Callback function of the listener
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        searchKey(text: string, listener: Callback<number>): void;
        /**
         * Cancel Search Text
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        clearSearch(): void;
        /**
         * Obtains the sequence number of the currently displayed matching result.
         * @returns { number } - The index of the currently displayed match result.
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        getSearchIndex(): number;
        /**
         * Sets the search result index and jump to index location
         * @param { number } index - current search index
         * @syscap SystemCapability.OfficeService.PDFService.Core
         * @since 5.0.0(12)
         */
        setSearchIndex(index: number): void;
    }
}
/**
 * Declare struct PdfView.
 * @struct { PdfView }
 * @syscap SystemCapability.ArkUI.ArkUI.Full
 * @since 5.0.0(12)
 */
@Component
declare struct PdfView {
    /**
     * Instantiating the PdfController
     * @type { pdfViewManager.PdfController }
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    controller: pdfViewManager.PdfController;
    /**
     * Page layout display mode
     * @type { pdfService.PageLayout }
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    pageLayout: pdfService.PageLayout;
    /**
     * Whether to support continuous preview
     * @type { boolean }
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    isContinuous: boolean;
    /**
     * Whether to display the scroll bar
     * @type { boolean }
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    showScroll: boolean;
    /**
     * Page adaptation method
     * @type { pdfService.PageFit }
     * @syscap SystemCapability.OfficeService.PDFService.Core
     * @since 5.0.0(12)
     */
    pageFit: pdfService.PageFit;
    build(): void;
}
export { pdfViewManager, PdfView };
