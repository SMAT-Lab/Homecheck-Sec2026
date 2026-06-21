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
exports.MaxLinesPerFunctionCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'MaxLinesPerFunctionCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/max-lines-per-function.md",
    description: "Enforce a maximum number of lines of code in a function.",
};
class MaxLinesPerFunctionCheck {
    defects = [];
    issues = [];
    metaData = gMetaData;
    rule;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    defaultOption = { max: 50, skipBlankLines: false, skipComments: false, IIFEs: false };
    option = this.defaultOption;
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    /**
     * 检查 TypeScript 代码中所有方法，返回超过最大行数的方法位置
     * @param sourceFile 要检查的 sourceFile
     * @returns 超过最大行数的方法位置数组，包含错误信息
     */
    checkMaxLinesPerFunction(sourceFile) {
        const invalidPositions = [];
        const lines = sourceFile.text.split('\n'); // 提前分割文件内容，避免重复操作
        const countLines = (node) => {
            const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
            let lineCount = 0;
            for (let i = startLine; i <= endLine; i++) {
                const lineText = lines[i]; // 使用预分割的行数据
                if (this.option.skipBlankLines && /^\s*$/.test(lineText))
                    continue; // 使用正则判断空行
                if (this.option.skipComments && /^\s*(\/\/|\/\*)/.test(lineText))
                    continue; // 使用正则判断注释行
                lineCount++;
            }
            return lineCount;
        };
        const checkNode = (node) => {
            if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isMethodDeclaration(node) || (this.option.IIFEs && arkanalyzer_1.ts.isCallExpression(node))) {
                const lineCount = countLines(node);
                const functionName = (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isMethodDeclaration(node)) && node.name
                    ? node.name.getText()
                    : 'anonymous function';
                if (lineCount > (this.option.max ?? 50)) {
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    const message = functionName === 'anonymous function'
                        ? `Arrow function has too many lines (${lineCount}). Maximum allowed is ${this.option.max ?? 50}`
                        : `Function '${functionName}' has too many lines (${lineCount}). Maximum allowed is ${this.option.max ?? 50}`;
                    invalidPositions.push({
                        line: line + 1,
                        character: character + 1,
                        message
                    });
                }
            }
            arkanalyzer_1.ts.forEachChild(node, checkNode); // 避免重复绑定上下文
        };
        checkNode(sourceFile);
        return invalidPositions;
    }
    check = (target) => {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (this.rule && this.rule.option && this.rule.option[0]) {
            const ruleOption = this.rule.option[0];
            this.option.max = ruleOption.max ?? this.defaultOption.max;
            this.option.skipBlankLines = ruleOption.skipBlankLines ?? this.defaultOption.skipBlankLines;
            this.option.skipComments = ruleOption.skipComments ?? this.defaultOption.skipComments;
            this.option.IIFEs = ruleOption.IIFEs ?? this.defaultOption.IIFEs;
        }
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const myInvalidPositions = this.checkMaxLinesPerFunction(sourceFile);
        myInvalidPositions.forEach(pos => {
            this.addIssueReport(pos, severity, target.getFilePath());
        });
    };
    addIssueReport(pos, severity, filePath) {
        let defects = new Defects_1.Defects(pos.line, pos.character, pos.character, pos.message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
}
exports.MaxLinesPerFunctionCheck = MaxLinesPerFunctionCheck;
