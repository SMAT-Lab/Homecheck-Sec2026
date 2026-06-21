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
exports.SparseArrayCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const SparseArrayValue_1 = require("../../model/SparseArrayValue");
const VarInfo_1 = require("../../model/VarInfo");
const NumberUtils_1 = require("../../utils/checker/NumberUtils");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'SparseArrayCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/sparse-array-check.md',
    description: 'Sparse array detected. Avoid using sparse arrays.'
};
class SparseArrayCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueColumnInTs = new Map();
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
        let arkFilePath = arkFile.getFilePath();
        this.issueColumnInTs.set(arkFilePath, new Array());
        let parentScope = Index_1.CheckerStorage.getInstance().getScope(arkFilePath);
        if (!parentScope) {
            return;
        }
        //获取所有scope
        let scopes = [];
        this.traverseScope(parentScope, scopes);
        for (let scope of scopes) {
            this.findSparseArrayInScope(arkFile, scope);
        }
        this.issueColumnInTs.clear();
    };
    findSparseArrayInScope(arkFile, scope) {
        for (let varDef of scope.defList) {
            for (let leftUsedVarInfo of varDef.leftUsedInfo) {
                let useStmt = leftUsedVarInfo.stmt;
                let def = useStmt.getDef();
                if (!def || !(def instanceof arkanalyzer_1.ArkArrayRef)) {
                    continue;
                }
                let pIndex = def.getIndex();
                this.valueCalculate(arkFile, useStmt, leftUsedVarInfo, pIndex);
            }
            let defStmt = varDef.defStmt;
            if (!(defStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let leftOp = defStmt.getLeftOp();
            let rightOp = defStmt.getRightOp();
            let isArray = (leftOp !== null) && (leftOp.getType() instanceof arkanalyzer_1.ArrayType);
            if (isArray && rightOp instanceof arkanalyzer_1.ArkNewArrayExpr) {
                let size = rightOp.getSize();
                let varInfo = new VarInfo_1.VarInfo(defStmt, scope);
                this.valueCalculate(arkFile, defStmt, varInfo, size);
            }
            if (rightOp instanceof arkanalyzer_1.ArkArrayRef) {
                let pIndex = rightOp.getIndex();
                let reDefInfo = new VarInfo_1.VarInfo(defStmt, scope);
                this.valueCalculate(arkFile, defStmt, reDefInfo, pIndex);
            }
        }
    }
    valueCalculate(arkFile, stmt, varInfo, value) {
        if (NumberUtils_1.NumberUtils.isValueSupportCalculation(arkFile, varInfo, value)) {
            let index = NumberUtils_1.NumberUtils.getNumberByScope(arkFile, varInfo, value);
            if ((value instanceof arkanalyzer_1.Local) && (index.value > 1024)) {
                this.reportIssue(arkFile, stmt, value);
            }
            else if ((value.getType() instanceof arkanalyzer_1.NumberType) && (index.value > 1024)) {
                this.reportIssue(arkFile, stmt, value);
            }
        }
    }
    traverseScope(parentScope, scopes) {
        scopes.push(parentScope);
        if (parentScope.childScopeList.length !== 0) {
            for (let child of parentScope.childScopeList) {
                this.traverseScope(child, scopes);
            }
        }
    }
    reportIssue(arkFile, stmt, value) {
        let filePath = arkFile.getFilePath();
        let originalPosition = stmt.getOriginPositionInfo();
        let lineNum = originalPosition.getLineNo();
        let startColum = -1;
        let endColum = -1;
        let valStr = '';
        let orgStmtColumn = -1;
        const orgStmtStr = stmt.getOriginalText();
        const severity = this.rule.alert ?? this.metaData.severity;
        if (orgStmtStr && orgStmtStr.length !== 0) {
            orgStmtColumn = originalPosition.getColNo();
            valStr = NumberUtils_1.NumberUtils.getOriginalValueText(stmt, value);
            startColum = this.getRealStartColum(filePath, lineNum, orgStmtColumn, orgStmtStr, valStr, stmt);
            if (startColum === -1) {
                logger.info('Find sparse array, but can not get startColum.');
                return;
            }
            endColum = startColum + valStr.length - 1;
            this.issueColumnInTs.get(filePath)?.push(lineNum + '%' + startColum);
        }
        filePath = arkFile.getFilePath();
        let defects = new Index_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
    getRealStartColum(filePath, lineNum, orgStmtColumn, orgStmtStr, valStr, stmt) {
        let startColumn = -1;
        if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            return -1;
        }
        let fullStmtValue = this.getFullStmtValue(stmt, valStr);
        let realStmtStr = fullStmtValue.fulStmtStr;
        let tmpOrgStmtStr = orgStmtStr;
        while (tmpOrgStmtStr.includes(realStmtStr)) {
            let fullStmtStartColumn = tmpOrgStmtStr.indexOf(realStmtStr);
            startColumn = orgStmtColumn + fullStmtStartColumn + fullStmtValue.baseStr.length;
            if (!this.hasReported(filePath, lineNum, startColumn)) {
                break;
            }
            tmpOrgStmtStr = tmpOrgStmtStr.replace(realStmtStr, '-'.repeat(realStmtStr.length));
        }
        return startColumn;
    }
    hasReported(filePath, lineNum, startColumn) {
        let targetIssue = this.issueColumnInTs.get(filePath)?.find((lineCol) => lineCol === (lineNum + '%' + startColumn));
        return targetIssue !== undefined;
    }
    getFullStmtValue(stmt, valStr) {
        let rightOp = stmt.getRightOp();
        if (rightOp instanceof arkanalyzer_1.ArkNewArrayExpr) {
            return new SparseArrayValue_1.SparseArrayValue(SparseArrayValue_1.SparseArrayType.NEW_ARRAY, 'new Array(', valStr);
        }
        if (rightOp instanceof arkanalyzer_1.ArkArrayRef) {
            let base = rightOp.getBase();
            if (base instanceof arkanalyzer_1.Local) {
                let baseStr = base.toString();
                return new SparseArrayValue_1.SparseArrayValue(SparseArrayValue_1.SparseArrayType.ARRAY_RIGHT, baseStr + '[', valStr);
            }
        }
        let leftOp = stmt.getLeftOp();
        if (leftOp instanceof arkanalyzer_1.ArkArrayRef) {
            let base = leftOp.getBase();
            if (base instanceof arkanalyzer_1.Local) {
                let baseStr = base.toString();
                return new SparseArrayValue_1.SparseArrayValue(SparseArrayValue_1.SparseArrayType.ARRAY_LEFT, baseStr + '[', valStr);
            }
        }
        return new SparseArrayValue_1.SparseArrayValue(SparseArrayValue_1.SparseArrayType.UNKNOWN, '', valStr);
    }
}
exports.SparseArrayCheck = SparseArrayCheck;
