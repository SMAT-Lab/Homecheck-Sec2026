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
exports.OptionalParametersCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'OptionalParametersCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/optional-parameters-check.md',
    description: 'Declare function parameters as mandatory parameters.'
};
class OptionalParametersCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    methodMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD
    };
    registerMatchers() {
        const matchMethodCb = {
            matcher: this.methodMatcher,
            callback: this.check
        };
        return [matchMethodCb];
    }
    check = (targetMethod) => {
        let parameters = targetMethod.getParameters();
        if (!parameters) {
            return;
        }
        for (let [index, parameter] of parameters.entries()) {
            let isOptional = parameter.isOptional();
            if (!isOptional) {
                continue;
            }
            const startColumn = this.getStartColumn(targetMethod, parameter, index);
            const lineNum = targetMethod.getLine() ?? (targetMethod.getDeclareLines() ?? [-1])[0];
            if (startColumn === -1 || lineNum === -1) {
                continue;
            }
            let name = parameter.getName();
            let endColunm = startColumn + name.length - 1;
            this.reportIssue(targetMethod.getDeclaringArkClass().getDeclaringArkFile(), lineNum, startColumn, endColunm);
        }
    };
    getStartColumn(method, parameter, index) {
        let code = method.getCode();
        if (!code || code.length === 0) {
            return -1;
        }
        let lineCode = code.split('\n')[0];
        let parameterStr = lineCode.split(',')[index];
        let name = parameter.getName();
        let pos = parameterStr?.indexOf(name) ?? -1;
        if (pos === -1) {
            return -1;
        }
        let indexOfParameterStr = lineCode?.indexOf(parameterStr) ?? -1;
        if (indexOfParameterStr === -1) {
            return -1;
        }
        const mtdCol = method.getColumn() ?? (method.getDeclareColumns() ?? [-1])[0];
        return (mtdCol !== -1) ? mtdCol + indexOfParameterStr + pos : -1;
    }
    reportIssue(arkFile, lineNum, startColumn, endColunm) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.OptionalParametersCheck = OptionalParametersCheck;
