"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnionTypeArrayCheck = void 0;
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
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const arkanalyzer_1 = require("arkanalyzer");
const NumberValue_1 = require("../../model/NumberValue");
const VarInfo_1 = require("../../model/VarInfo");
const NumberUtils_1 = require("../../utils/checker/NumberUtils");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'UnionTypeArrayCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/union-type-array-check.md',
    description: 'Suggestion: Avoid using arrays of union types.'
};
class UnionTypeArrayCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (arkFile) => {
        for (let clazz of arkFile.getClasses()) {
            this.unionClassProcess(clazz);
        }
        for (let namespace of arkFile.getAllNamespacesUnderThisFile()) {
            for (let clazz of namespace.getClasses()) {
                this.unionClassProcess(clazz);
            }
        }
    };
    unionClassProcess(arkClass) {
        let arkMethods = arkClass.getMethods();
        for (let arkMethod of arkMethods) {
            this.methodProcess(arkMethod, arkClass);
        }
    }
    methodProcess(arkMethod, clazz) {
        const stmts = arkMethod.getBody()?.getCfg()?.getStmts();
        if (!stmts) {
            return;
        }
        let arkFile = clazz.getDeclaringArkFile();
        for (let stmt of stmts) {
            if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let rightOp = stmt.getRightOp();
            if (!rightOp || !(rightOp instanceof arkanalyzer_1.ArkNewArrayExpr)) {
                continue;
            }
            let leftOp = stmt.getLeftOp();
            let leftType = leftOp.getType();
            if (!(leftType instanceof arkanalyzer_1.ArrayType)) {
                continue;
            }
            let type = leftType.getBaseType();
            if (type instanceof arkanalyzer_1.UnionType) {
                let arrayName = this.getArrayName(leftOp);
                if (arrayName === undefined) {
                    continue;
                }
                this.reportIssue(arkFile, stmt, arrayName);
            }
            else if (type instanceof arkanalyzer_1.NumberType) {
                if (!(this.numberCheck(leftOp, clazz))) {
                    continue;
                }
                let arrayName = this.getArrayName(leftOp);
                if (arrayName === undefined) {
                    continue;
                }
                this.reportIssue(arkFile, stmt, arrayName);
            }
        }
    }
    getArrayName(leftOp) {
        if (!(leftOp instanceof arkanalyzer_1.Local)) {
            return undefined;
        }
        let stmts = leftOp.getUsedStmts();
        if (!stmts) {
            return undefined;
        }
        for (let stmt of stmts) {
            if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let rightOp = stmt.getRightOp();
            if (!(rightOp instanceof arkanalyzer_1.Local)) {
                continue;
            }
            if (!rightOp.getName().includes('%')) {
                continue;
            }
            let leftOp = stmt.getLeftOp();
            if (!(leftOp instanceof arkanalyzer_1.Local)) {
                return undefined;
            }
            return leftOp.getName();
        }
        return undefined;
    }
    numberCheck(leftOp, clazz) {
        if (!(leftOp instanceof arkanalyzer_1.Local)) {
            return false;
        }
        let stmts = leftOp.getUsedStmts();
        if (!stmts) {
            return false;
        }
        let valueType = NumberValue_1.ValueType.UNKNOWN;
        for (let [index, stmt] of stmts.entries()) {
            let scope = stmt.scope;
            if (!scope || !(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let arkFile = clazz.getDeclaringArkFile();
            let rightOp = stmt.getRightOp();
            let varInfo = new VarInfo_1.VarInfo(stmt, scope);
            if (!NumberUtils_1.NumberUtils.isValueSupportCalculation(arkFile, varInfo, rightOp)) {
                continue;
            }
            let reDefValue = NumberUtils_1.NumberUtils.getNumberByScope(arkFile, varInfo, rightOp);
            if (index === 0) {
                valueType = reDefValue.type;
                continue;
            }
            if (reDefValue.type !== valueType) {
                return true;
            }
        }
        return false;
    }
    reportIssue(arkFile, stmt, keyword) {
        if (!stmt) {
            return;
        }
        let originalPosition = stmt.getOriginPositionInfo();
        let lineNum = originalPosition.getLineNo();
        let orgStmtStr = stmt.getOriginalText();
        if (!orgStmtStr || orgStmtStr.length === 0) {
            return;
        }
        let startColumn = originalPosition.getColNo() + orgStmtStr.indexOf(keyword);
        let endColumn = startColumn + keyword.length - 1;
        if (startColumn === -1) {
            return;
        }
        let filePath = arkFile.getFilePath();
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Index_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.UnionTypeArrayCheck = UnionTypeArrayCheck;
