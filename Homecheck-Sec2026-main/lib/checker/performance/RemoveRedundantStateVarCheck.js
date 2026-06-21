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
exports.RemoveRedundantStateVarCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const ViewTreeTool_1 = require("../../utils/checker/ViewTreeTool");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'RemoveRedundantStateVarCheck');
let viewTreeTool = new ViewTreeTool_1.ViewTreeTool();
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/remove-redundant-state-var-check.md',
    description: 'You are advised to remove the status variable settings that are not associated with UI components.'
};
class RemoveRedundantStateVarCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        hasViewTree: true
    };
    registerMatchers() {
        const matchClazzCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchClazzCb];
    }
    check = (target) => {
        if (viewTreeTool.hasTraverse(target)) {
            return;
        }
        for (let arkField of target.getFields()) {
            if (!arkField.hasDecorator('State')) {
                continue;
            }
            let isAssociated = this.isStateAssociated(target, arkField);
            if (!isAssociated) {
                this.addIssueReport(target, arkField);
            }
        }
    };
    isStateAssociated(clazz, arkField) {
        let viewTree = clazz.getViewTree();
        if (!viewTree) {
            return false;
        }
        let values = viewTree.getStateValues();
        for (let [key] of values.entries()) {
            if (key.getSignature() === arkField.getSignature()) {
                return true;
            }
        }
        return false;
    }
    addIssueReport(target, arkField) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(target, arkField);
        if (warnInfo) {
            let defects = new Index_1.Defects(warnInfo.lineNum, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defects, undefined));
        }
    }
    getLineAndColumn(target, arkField) {
        const originPosition = arkField.getOriginPosition();
        const lineNum = originPosition.getLineNo();
        const arkFile = target.getDeclaringArkFile();
        if (arkFile) {
            const filedName = arkField.getName();
            const lineCode = arkField.getCode();
            const startCol = originPosition.getColNo() + lineCode.indexOf(filedName);
            const endCol = startCol + filedName.length - 1;
            const originPath = arkFile.getFilePath();
            return { lineNum, startCol, endCol, filePath: originPath };
        }
        else {
            logger.debug('ArkFile is null.');
        }
        return { lineNum: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.RemoveRedundantStateVarCheck = RemoveRedundantStateVarCheck;
