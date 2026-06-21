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
exports.PNG = void 0;
const BytesUtils_1 = require("../BytesUtils");
const pngSignature = 'PNG\r\n\x1a\n';
const pngImageHeaderChunkName = 'IHDR';
const pngFriedChunkName = 'CgBI';
exports.PNG = {
    validate(input) {
        if (pngSignature === (0, BytesUtils_1.toUTF8String)(input, 1, 8)) {
            let chunkName = (0, BytesUtils_1.toUTF8String)(input, 12, 16);
            if (chunkName === pngFriedChunkName) {
                chunkName = (0, BytesUtils_1.toUTF8String)(input, 28, 32);
            }
            if (chunkName !== pngImageHeaderChunkName) {
                throw new TypeError('Invalid PNG');
            }
            return true;
        }
        return false;
    },
    calculate(input) {
        if ((0, BytesUtils_1.toUTF8String)(input, 12, 16) === pngFriedChunkName) {
            return {
                height: (0, BytesUtils_1.readUInt32BE)(input, 36),
                width: (0, BytesUtils_1.readUInt32BE)(input, 32),
            };
        }
        return {
            height: (0, BytesUtils_1.readUInt32BE)(input, 20),
            width: (0, BytesUtils_1.readUInt32BE)(input, 16),
        };
    },
};
