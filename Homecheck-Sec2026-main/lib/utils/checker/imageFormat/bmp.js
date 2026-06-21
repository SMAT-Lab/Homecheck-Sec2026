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
exports.BMP = void 0;
const BytesUtils_1 = require("../BytesUtils");
exports.BMP = {
    validate: (input) => (0, BytesUtils_1.toUTF8String)(input, 0, 2) === 'BM',
    calculate: (input) => ({
        height: Math.abs((0, BytesUtils_1.readInt32LE)(input, 22)),
        width: (0, BytesUtils_1.readUInt32LE)(input, 18),
    }),
};
