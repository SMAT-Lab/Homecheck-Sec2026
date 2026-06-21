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
exports.NumberInitCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const NumberValue_1 = require("../../model/NumberValue");
const VarInfo_1 = require("../../model/VarInfo");
const NumberUtils_1 = require("../../utils/checker/NumberUtils");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NumberInitCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/number-init-check.md',
    description: 'Number variable of both int and float types detected. The value assigned to a variable should be of the type declared for the variable.'
};
class NumberInitCheck {
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
        let filePath = arkFile.getFilePath();
        let scope = Index_1.CheckerStorage.getInstance().getScope(filePath);
        if (scope) {
            this.traverseScope(scope);
        }
    };
    traverseScope(scope) {
        this.parameteCheck(scope);
        if (scope.childScopeList.length !== 0) {
            for (let childScope of scope.childScopeList) {
                this.traverseScope(childScope);
            }
        }
    }
    parameteCheck(scope) {
        if (scope.defList.length === 0) {
            return;
        }
        for (let defValueInfo of scope.defList) {
            let defType = NumberValue_1.ValueType.UNKNOWN;
            let defStmt = defValueInfo.defStmt;
            let defStmtInfo = new VarInfo_1.VarInfo(defStmt, scope);
            if (defStmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let rightOp = defStmt.getRightOp();
                defType = this.checkValueType(defStmtInfo, rightOp);
                if (defType === NumberValue_1.ValueType.UNKNOWN) {
                    continue;
                }
            }
            this.checkByDefValueInfo(defValueInfo, defType);
        }
    }
    checkValueType(varInfo, value) {
        const arkFile = varInfo.stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            if (!NumberUtils_1.NumberUtils.isValueSupportCalculation(arkFile, varInfo, value)) {
                return NumberValue_1.ValueType.UNKNOWN;
            }
            let reDefValue = NumberUtils_1.NumberUtils.getNumberByScope(arkFile, varInfo, value);
            return reDefValue.type;
        }
        return NumberValue_1.ValueType.UNKNOWN;
    }
    checkByDefValueInfo(defValueInfo, defType) {
        let reDefStmtInfos = defValueInfo.redefInfo;
        for (let reDefStmtInfo of reDefStmtInfos) {
            let reDefStmt = reDefStmtInfo.stmt;
            if (reDefStmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let rightOp = reDefStmt.getRightOp();
                let reDefType = this.checkValueType(reDefStmtInfo, rightOp);
                if (reDefType === NumberValue_1.ValueType.UNKNOWN) {
                    break;
                }
                else if (reDefType !== defType) {
                    this.setIssueReports(reDefStmt);
                }
            }
        }
    }
    setIssueReports(reDefStmt) {
        const arkFile = reDefStmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        let originalPosition = reDefStmt.getOriginPositionInfo();
        const lineNo = originalPosition.getLineNo();
        const spacesColumn = originalPosition.getColNo();
        let text = reDefStmt.getOriginalText();
        if (!arkFile || !text || text.length === 0) {
            return;
        }
        const filePath = arkFile.getFilePath();
        const texts = text.split('\n');
        text = texts[0];
        let checkText = '';
        const severity = this.rule.alert ?? this.metaData.severity;
        if (text.includes(';')) {
            if (Index_1.CheckerUtils.getScopeType(reDefStmt) === Index_1.ScopeType.FOR_CONDITION_TYPE) {
                checkText = text.substring(text.lastIndexOf(';') + 2, text.indexOf(';'));
                checkText = checkText.substring(checkText.indexOf('=') + 2);
            }
            else {
                checkText = text.substring(text.indexOf('=') + 2, text.indexOf(';'));
            }
        }
        else {
            checkText = text.substring(text.indexOf('=') + 2);
        }
        const checkTextLen = checkText.length;
        const startColumn = spacesColumn + text.indexOf(checkText);
        const endColumn = startColumn + checkTextLen - 1;
        let defects = new Index_1.Defects(lineNo, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.NumberInitCheck = NumberInitCheck;
