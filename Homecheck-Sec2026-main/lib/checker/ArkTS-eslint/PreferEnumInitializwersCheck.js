"use strict";
/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
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
exports.PreferEnumInitializwersCheck = void 0;
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PreferEnumInitializwersCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/prefer-enum-initializers.md',
    description: `The value of the member 'propertyName' should be explicitly defined.`,
};
//推荐显式初始化每个枚举成员值。
class PreferEnumInitializwersCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Matchers_1.MatcherTypes.CLASS,
        category: [ArkClass_1.ClassCategory.ENUM],
    };
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.FIELD,
        class: [this.clsMatcher],
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check,
        };
        return [matchBuildCb];
    }
    check = (targetField) => {
        const severity = this.rule.alert ?? this.metaData.severity;
        //通过是否innit判断是否赋值（初始化）
        const stmts = targetField.getInitializer() ?? [];
        if (!(stmts.length > 0)) {
            let fieldName = targetField?.getName() ?? '';
            const fieldCode = targetField?.getCode() ?? '';
            const isString = fieldCode !== fieldName;
            fieldName = isString ? `'${fieldName}'` : fieldName;
            this.addIssueReport(targetField, severity, fieldName);
        }
    };
    addIssueReport(targetField, severity, fieldName) {
        const warnInfo = this.getLineAndColumn(targetField);
        let defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, `The value of the member '${fieldName}' should be explicitly defined.`, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getLineAndColumn(targetField) {
        const originPosition = targetField.getOriginPosition();
        const line = originPosition.getLineNo();
        const arkFile = targetField.getDeclaringArkClass().getDeclaringArkFile();
        if (arkFile) {
            const originText = targetField.getCode() ?? '';
            let startCol = originPosition.getColNo();
            const endCol = startCol + originText.length - 1;
            const originPath = arkFile.getFilePath();
            return { line, startCol, endCol, filePath: originPath };
        }
        else {
            logger.debug('originStmt or arkFile is null');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.PreferEnumInitializwersCheck = PreferEnumInitializwersCheck;
