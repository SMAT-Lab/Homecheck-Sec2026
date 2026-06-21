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
exports.DefaultCaseCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'DefaultCaseCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/default-case.md',
    description: 'Expected a default case',
};
class DefaultCaseCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    defalutOptions = [{ commentPattern: '' }];
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
    /**
     * 检查 TypeScript 代码中switch代码块中是否缺少default case，返回报错位置
     * @param code 要检查的 TypeScript 代码
     * @param options 包含commentPattern的选项对象
     * @returns 包含缺少default case错误位置的对象数组
     */
    checkMissingDefaultCase(target, options = {}) {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const missingDefaultPositions = [];
        const commentPattern = options.commentPattern ? new RegExp(options.commentPattern, 'i') : null;
        this.checkNode(sourceFile, target.getCode(), commentPattern, missingDefaultPositions);
        return missingDefaultPositions;
    }
    checkNode(node, code, commentPattern, missingDefaultPositions) {
        if (arkanalyzer_1.ts.isSwitchStatement(node)) {
            if (node.caseBlock.clauses.length === 0) {
                return;
            }
            const hasDefaultCase = node.caseBlock.clauses.some(clause => arkanalyzer_1.ts.isDefaultClause(clause));
            const switchStart = node.getStart();
            const switchEnd = node.getEnd();
            const switchText = code.substring(switchStart, switchEnd);
            // 检查注释内容
            const noDefaultRegex = /\s*no\s*default/i;
            const comments = getAllComments(switchText);
            const lastComment = comments[comments.length - 1];
            const hasNoDefaultComment = lastComment ? commentPattern != null ? commentPattern?.test(lastComment) : noDefaultRegex.test(lastComment) : false;
            // 检查switch代码块的最后一行
            const switchLines = switchText.split('\n');
            const lastLine = switchLines[switchLines.length - 1].trim();
            const isLastLineComment = /^\s*\/\/.*$/.test(lastLine) && (noDefaultRegex.test(lastLine) || (commentPattern && commentPattern.test(lastLine)));
            if (!hasDefaultCase && !hasNoDefaultComment && !isLastLineComment) {
                const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(switchStart);
                missingDefaultPositions.push({ line: line + 1, character: character + 1, code: switchText });
            }
        }
        arkanalyzer_1.ts.forEachChild(node, (child) => this.checkNode(child, code, commentPattern, missingDefaultPositions));
    }
    getOption = (rule) => {
        let option = this.defalutOptions[0];
        if (rule && rule.option[0]) {
            option = rule.option[0];
        }
        return option;
    };
    check = (target) => {
        let options = this.getOption(this.rule);
        let missingDefaultPositions = this.checkMissingDefaultCase(target, options);
        for (const position of missingDefaultPositions) {
            this.addIssueReport(target, position.line, position.character, position.code);
        }
    };
    addIssueReport(arkFile, lineNum, startColum, code) {
        let filePath = arkFile.getFilePath();
        let endColum = startColum + code.length - 1;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.DefaultCaseCheck = DefaultCaseCheck;
function getAllComments(code) {
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
}
