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
exports.AvoidUpdateAutoStateVarAboutToReuseCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'AvoidUpdateAutoStateVarAboutToReuseCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/avoid-update-auto-state-var-in-aboutToReuse-check.md',
    description: 'Avoid updating state variables that automatically update values in aboutToReuse.'
};
const variableSet = new Set(['Link', 'StorageLink', 'ObjectLink', 'Consume']);
class AvoidUpdateAutoStateVarAboutToReuseCheck {
    metaData = gMetaData;
    COMPONENT_DEC = 'Component';
    ABOUTTOREUSE_MET = 'aboutToReuse';
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS
    };
    registerMatchers() {
        const matchClassCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClassCb];
    }
    check = (targetCla) => {
        if (!targetCla.hasDecorator(this.COMPONENT_DEC)) {
            return;
        }
        let method = targetCla.getMethodWithName(this.ABOUTTOREUSE_MET);
        if (method === null) {
            return;
        }
        let stateFields = this.saveStateField(targetCla);
        this.invokestmt(stateFields, method, targetCla.getDeclaringArkFile());
    };
    saveStateField(arkClass) {
        let stateFields = [];
        for (let field of arkClass.getFields()) {
            if (field.hasDecorator(variableSet)) {
                stateFields.push(field);
            }
        }
        return stateFields;
    }
    invokestmt(stateFields, method, arkFile) {
        for (let stmt of method.getBody()?.getCfg().getStmts() ?? []) {
            if (stmt instanceof lib_1.ArkInvokeStmt) {
                let invmethod = arkFile.getScene().getMethod(stmt.getInvokeExpr().getMethodSignature());
                if (invmethod === null) {
                    continue;
                }
                this.invokestmt(stateFields, invmethod, arkFile);
            }
            else if (stmt instanceof lib_1.ArkAssignStmt) {
                let leftOp = stmt.getLeftOp();
                if (!(leftOp instanceof lib_1.ArkInstanceFieldRef)) {
                    continue;
                }
                let arkField = this.stateValueUpdate(stateFields, leftOp);
                if (arkField !== null) {
                    this.reportIssue(arkFile, arkField);
                }
            }
        }
    }
    stateValueUpdate(stateFields, leftOp) {
        for (let stateField of stateFields) {
            if (leftOp.getFieldSignature().toString() === stateField.getSignature().toString()) {
                return stateField;
            }
        }
        return null;
    }
    reportIssue(arkFile, arkField) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const positionInfo = arkField.getOriginPosition();
        const lineNum = positionInfo.getLineNo();
        const fieldName = arkField.getName();
        const lineCode = arkField.getCode();
        const startColumn = positionInfo.getColNo() + lineCode.indexOf(fieldName);
        const endColunm = startColumn + fieldName.length;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.AvoidUpdateAutoStateVarAboutToReuseCheck = AvoidUpdateAutoStateVarAboutToReuseCheck;
