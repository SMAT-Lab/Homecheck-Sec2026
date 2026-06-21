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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEBP = void 0;
const BytesUtils_1 = require("../BytesUtils");
function calculateExtended(input) {
    return {
        height: 1 + (0, BytesUtils_1.readUInt24LE)(input, 7),
        width: 1 + (0, BytesUtils_1.readUInt24LE)(input, 4),
    };
}
function calculateLossLess(input) {
    return {
        height: 1 + (((input[4] & 0xf) << 10) | (input[3] << 2) | ((input[2] & 0xc0) >> 6)),
        width: 1 + (((input[2] & 0x3f) << 8) | input[1]),
    };
}
function calculateLossy(input) {
    return {
        height: (0, BytesUtils_1.readInt16LE)(input, 8) & 0x3fff,
        width: (0, BytesUtils_1.readInt16LE)(input, 6) & 0x3fff,
    };
}
exports.WEBP = {
    validate(input) {
        const riffHeader = 'RIFF' === (0, BytesUtils_1.toUTF8String)(input, 0, 4);
        const webpHeader = 'WEBP' === (0, BytesUtils_1.toUTF8String)(input, 8, 12);
        const vp8Header = 'VP8' === (0, BytesUtils_1.toUTF8String)(input, 12, 15);
        return riffHeader && webpHeader && vp8Header;
    },
    calculate(_input) {
        const chunkHeader = (0, BytesUtils_1.toUTF8String)(_input, 12, 16);
        const input = _input.slice(20, 30);
        if (chunkHeader === 'VP8X') {
            const extendedHeader = input[0];
            const validStart = (extendedHeader & 0xc0) === 0;
            const validEnd = (extendedHeader & 0x01) === 0;
            if (validStart && validEnd) {
                return calculateExtended(input);
            }
            throw new TypeError('Invalid WebP');
        }
        if (chunkHeader === 'VP8' && input[0] !== 0x2f) {
            return calculateLossy(input);
        }
        const signature = (0, BytesUtils_1.toHexString)(input, 3, 6);
        if (chunkHeader === 'VP8L' && signature !== '9d012a') {
            return calculateLossLess(input);
        }
        throw new TypeError('Invalid WebP');
    },
};
