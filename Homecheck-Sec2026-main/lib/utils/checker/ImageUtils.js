"use strict";
/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readImageInfo = void 0;
const fs_1 = __importDefault(require("fs"));
const bmp_1 = require("./imageFormat/bmp");
const jpg_1 = require("./imageFormat/jpg");
const png_1 = require("./imageFormat/png");
const svg_1 = require("./imageFormat/svg");
const webp_1 = require("./imageFormat/webp");
const MaxInputSize = 512 * 1024;
const typeHandlers = {
    bmp: bmp_1.BMP,
    jpg: jpg_1.JPG,
    png: png_1.PNG,
    svg: svg_1.SVG,
    webp: webp_1.WEBP,
};
const firstBytes = {
    0x42: 'bmp',
    0x52: 'webp',
    0x89: 'png',
    0xff: 'jpg',
};
const keys = Object.keys(typeHandlers);
function readImageInfo(filePath) {
    const input = readFileSync(filePath);
    if (!input) {
        return undefined;
    }
    ;
    const type = detector(input);
    if (typeof type === 'undefined') {
        return undefined;
    }
    if (type in typeHandlers) {
        const size = typeHandlers[type].calculate(input, filePath);
        if (!size) {
            return undefined;
        }
        let imageInfo = { width: size.width, height: size.height, type: '' };
        imageInfo.type = size.type ?? type;
        if (size.images && size.images.length > 1) {
            const largestImage = size.images.reduce((largest, current) => {
                return current.width * current.height > largest.width * largest.height ? current : largest;
            }, size.images[0]);
            imageInfo.width = largestImage.width;
            imageInfo.height = largestImage.height;
        }
        return imageInfo;
    }
    return undefined;
}
exports.readImageInfo = readImageInfo;
function readFileSync(filepath) {
    const descriptor = fs_1.default.openSync(filepath, 'r');
    try {
        const { size } = fs_1.default.fstatSync(descriptor);
        if (size <= 0) {
            return undefined;
        }
        const inputSize = Math.min(size, MaxInputSize);
        const input = new Uint8Array(inputSize);
        fs_1.default.readSync(descriptor, input, 0, inputSize, 0);
        return input;
    }
    finally {
        fs_1.default.closeSync(descriptor);
    }
}
function detector(input) {
    try {
        const byte = input[0];
        if (byte in firstBytes) {
            const type = firstBytes[byte];
            if (type && typeHandlers[type].validate(input)) {
                return type;
            }
        }
        const finder = (key) => typeHandlers[key].validate(input);
        return keys.find(finder);
    }
    catch (error) {
        return undefined;
    }
}
