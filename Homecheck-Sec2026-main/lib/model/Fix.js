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
exports.FixMode = exports.AIFix = exports.FunctionFix = exports.RuleFix = exports.FixInfo = void 0;
class FixInfo {
    fixed = false;
}
exports.FixInfo = FixInfo;
// eslint修复信息
class RuleFix extends FixInfo {
    /**
     * 被修复字符串的起始位置
     */
    range;
    /**
     * 要替换的文本
     */
    text;
}
exports.RuleFix = RuleFix;
// homecheck的修复信息
class FunctionFix extends FixInfo {
    /**
     * 修复方法,入参为ArkFile和fixkey
     */
    fix;
}
exports.FunctionFix = FunctionFix;
// AI修复的信息
class AIFix extends FixInfo {
    /**
     * 提供给大模型的修复语义
     */
    text;
}
exports.AIFix = AIFix;
var FixMode;
(function (FixMode) {
    FixMode[FixMode["AST"] = 0] = "AST";
    FixMode[FixMode["ARKFILE"] = 1] = "ARKFILE";
    FixMode[FixMode["AI"] = 2] = "AI";
    FixMode[FixMode["UNKNOWN"] = 3] = "UNKNOWN";
})(FixMode = exports.FixMode || (exports.FixMode = {}));
