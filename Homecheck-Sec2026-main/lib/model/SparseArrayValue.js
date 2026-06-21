"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SparseArrayType = exports.SparseArrayValue = void 0;
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
class SparseArrayValue {
    sparseArrayType;
    baseStr;
    valStr;
    fulBaseStr;
    fulStmtStr;
    constructor(StmtType, baseStr, valStr) {
        this.sparseArrayType = StmtType;
        this.baseStr = baseStr;
        this.valStr = valStr;
        this.fulBaseStr = this.baseStr + this.valStr;
        if (this.sparseArrayType === SparseArrayType.NEW_ARRAY) {
            this.fulStmtStr = this.fulBaseStr + ')';
        }
        else if (this.sparseArrayType === SparseArrayType.ARRAY_RIGHT) {
            this.fulStmtStr = this.fulBaseStr + ']';
        }
        else if (this.sparseArrayType === SparseArrayType.ARRAY_LEFT) {
            this.fulStmtStr = this.fulBaseStr + ']';
        }
        else {
            this.fulStmtStr = this.fulBaseStr;
        }
    }
}
exports.SparseArrayValue = SparseArrayValue;
var SparseArrayType;
(function (SparseArrayType) {
    SparseArrayType[SparseArrayType["NEW_ARRAY"] = 0] = "NEW_ARRAY";
    SparseArrayType[SparseArrayType["ARRAY_RIGHT"] = 1] = "ARRAY_RIGHT";
    SparseArrayType[SparseArrayType["ARRAY_LEFT"] = 2] = "ARRAY_LEFT";
    SparseArrayType[SparseArrayType["UNKNOWN"] = 3] = "UNKNOWN";
})(SparseArrayType = exports.SparseArrayType || (exports.SparseArrayType = {}));
