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
exports.DefaultCaseLastCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'DefaultCaseLastCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/default-case-last.md',
    description: 'Default clause should be the last clause',
};
class DefaultCaseLastCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    getAllComments = (code) => {
        const comments = [];
        const commentRegex = /\/\/(.*)|\/\*([\s\S]*?)\*\//g;
        let match;
        while ((match = commentRegex.exec(code)) !== null) {
            if (match[1]) {
                // Single-line comment
                comments.push(match[1].trim());
            }
            else if (match[2]) {
                // Multi-line comment
                comments.push(match[2].trim());
            }
        }
        return comments;
    };
    /**
     * 检查 TypeScript 代码中switch代码块中default case是否在所有case中为最后一个，否则返回报错位置
     * @param code 要检查的 TypeScript 代码
     * @returns 包含default case不在最后一个位置的错误位置的对象数组
     */
    checkDefaultCaseLast(target) {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const defaultCasePositions = [];
        function checkNode(node) {
            if (arkanalyzer_1.ts.isSwitchStatement(node)) {
                const cases = node.caseBlock.clauses;
                const defaultCaseIndex = cases.findIndex(clause => arkanalyzer_1.ts.isDefaultClause(clause));
                if (defaultCaseIndex !== -1 && defaultCaseIndex !== cases.length - 1) {
                    const defaultCase = cases[defaultCaseIndex];
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(defaultCase.getStart());
                    defaultCasePositions.push({ line: line + 1, character: character + 1, sourceCode: defaultCase.getText() });
                }
            }
            arkanalyzer_1.ts.forEachChild(node, checkNode);
        }
        checkNode(sourceFile);
        return defaultCasePositions;
    }
    check = (target) => {
        // Check for default case in switch statements
        const defaultCasePositions = this.checkDefaultCaseLast(target);
        for (const position of defaultCasePositions) {
            this.addIssueReport(target, position.line, position.character, position.sourceCode);
        }
    };
    getCharPosition = (code, charIndex) => {
        const lines = code.split('\n');
        let currentCharIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length + 1; // +1 for the newline character
            if (currentCharIndex + lineLength > charIndex) {
                return { line: i + 1, column: charIndex - currentCharIndex + 1 };
            }
            currentCharIndex += lineLength;
        }
        throw new Error('Character index out of bounds');
    };
    addIssueReport(arkFile, lineNum, startColum, code) {
        let filePath = arkFile.getFilePath();
        const severity = this.rule.alert ?? this.metaData.severity;
        let endColum = startColum + code.length - 1;
        let defect = new Defects_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.DefaultCaseLastCheck = DefaultCaseLastCheck;
