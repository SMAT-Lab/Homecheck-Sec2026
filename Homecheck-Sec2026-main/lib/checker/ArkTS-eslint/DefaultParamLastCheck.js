"use strict";
/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
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
exports.DefaultParamLastCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'DefaultParamLastCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/default-param-last.md",
    description: "Default parameters should be last.",
};
class DefaultParamLastCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (target) => {
        let code;
        let filePath;
        let startCol = null;
        let startLine = null;
        if (target instanceof arkanalyzer_1.ArkFile) {
            code = target.getCode();
            filePath = target.getFilePath();
            startLine = 1;
            startCol = 1;
        }
        if (!code || !filePath || !startLine || !startCol) {
            return;
        }
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const issues = this.checkDefaultParamLast(sourceFile, startLine, startCol);
        // 输出结果
        issues.forEach(info => {
            this.addIssueReportNode(info.line, info.character, filePath);
        });
    };
    checkDefaultParamLast(sourceFile, startLine, startCol) {
        const result = [];
        const visit = (node) => {
            if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isMethodDeclaration(node) ||
                arkanalyzer_1.ts.isConstructorDeclaration(node) || arkanalyzer_1.ts.isArrowFunction(node)) {
                const parameters = node.parameters;
                this.checkNode(parameters, sourceFile, startLine, startCol, result);
            }
            // 递归遍历子节点
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return result;
    }
    checkNode(parameters, sourceFile, startLine, startCol, result) {
        for (let i = 0; i < parameters.length; i++) {
            const parameter = parameters[i];
            const isOptional = !!parameter.initializer; // 是否有默认值
            const isDefault = !!parameter.questionToken; // 是否是可选参数
            const isRestParameter = !!arkanalyzer_1.ts.isRestParameter(parameter); // 是否是剩余参数;
            if (!isOptional && !isDefault && !isRestParameter) {
                this.checkNodeTwo(i, parameters, sourceFile, startLine, startCol, result);
            }
        }
    }
    checkNodeTwo(i, parameters, sourceFile, startLine, startCol, result) {
        for (let j = i - 1; j >= 0; j--) {
            const parameter2 = parameters[j];
            if (parameter2.initializer || parameter2.questionToken) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(parameters[j].getStart());
                result.push({
                    fileName: sourceFile.fileName,
                    line: startLine + line,
                    character: startCol + character,
                });
            }
        }
    }
    addIssueReportNode(line, startCol, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(line, startCol, startCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.DefaultParamLastCheck = DefaultParamLastCheck;
