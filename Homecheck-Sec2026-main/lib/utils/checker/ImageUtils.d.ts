import { ImageInfo } from '../../model/Interfaces';
declare const typeHandlers: {
    bmp: import("../../model/Interfaces").ImageData;
    jpg: import("../../model/Interfaces").ImageData;
    png: import("../../model/Interfaces").ImageData;
    svg: import("../../model/Interfaces").ImageData;
    webp: import("../../model/Interfaces").ImageData;
};
export type imageType = keyof typeof typeHandlers;
export declare function readImageInfo(filePath: string): ImageInfo | undefined;
export {};
