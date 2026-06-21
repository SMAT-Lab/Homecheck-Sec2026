export interface ImageInfo {
    width: number;
    height: number;
    type?: string;
}
export type ImagesInfo = {
    images?: ImageInfo[];
} & ImageInfo;
export interface ImageData {
    validate: (intput: Uint8Array) => boolean;
    calculate: (input: Uint8Array, filepath?: string) => ImagesInfo;
}
export interface IAttributes {
    width: number | null;
    height: number | null;
    viewbox?: IAttributes | null;
}
