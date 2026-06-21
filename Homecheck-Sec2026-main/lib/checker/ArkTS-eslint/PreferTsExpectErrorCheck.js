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
exports.PreferTsExpectErrorCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PreferTsExpectErrorCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/prefer-ts-expect-error.md",
    description: 'Use "@ts-expect-error" to ensure an error is actually being suppressed.',
};
const tsIgnoreRegExpSingleLine = /^\s*\/{2,}\s*@ts-ignore/;
class PreferTsExpectErrorCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (target) => {
        if (target instanceof lib_1.ArkFile) {
            if (this.getFileExtension(target.getName()) !== '.ets') {
                const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
                let filePath = target.getFilePath();
                // 提取注释
                const comments = this.extractComments(sourceFile);
                // 输出结果
                comments.forEach(comment => {
                    this.addIssueReportNodeFix(sourceFile, comment, filePath);
                });
            }
        }
    };
    getFileExtension(filePath) {
        const lastDotIndex = filePath.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return '';
        }
        return filePath.substring(lastDotIndex);
    }
    // 判断注释类型并匹配
    extractComments(sourceFile) {
        const comments = [];
        const visitedComments = new Set(); // 用于记录已处理的注释位置
        const visit = (node) => {
            const leadingComments = lib_1.ts.getLeadingCommentRanges(sourceFile.getFullText(), node.pos);
            if (leadingComments) {
                for (const comment of leadingComments) {
                    // 如果该注释已经被处理过，跳过
                    if (visitedComments.has(comment.pos)) {
                        continue;
                    }
                    visitedComments.add(comment.pos); // 标记为已处理
                    const commentText = sourceFile.getFullText().substring(comment.pos, comment.end).trim();
                    // 判断是否为 @ts-ignore 注释
                    if (this.isTsIgnoreComment(commentText)) {
                        const tsIgnoreIndex = commentText.indexOf("@ts-ignore");
                        const startOffset = comment.pos + tsIgnoreIndex;
                        // 计算 character（从多行注释的开头开始）
                        const { line: commentStartLine, character: commentStartChar } = sourceFile.getLineAndCharacterOfPosition(comment.pos);
                        // 计算 endCol（从 @ts-ignore 的起始位置开始）
                        const { line: tsIgnoreLine, character: tsIgnoreChar } = sourceFile.getLineAndCharacterOfPosition(startOffset);
                        comments.push({
                            commentStartLine: commentStartLine + 1,
                            fileName: sourceFile.fileName,
                            line: tsIgnoreLine + 1,
                            startCol: tsIgnoreChar + 1,
                            endCol: tsIgnoreChar + "@ts-ignore".length + 1,
                            character: commentStartChar + 1, // 从多行注释的开头开始
                        });
                    }
                }
            }
            lib_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return comments;
    }
    isTsIgnoreComment(commentText) {
        if (commentText.startsWith("//")) {
            return tsIgnoreRegExpSingleLine.test(commentText);
        }
        else if (commentText.startsWith("/*")) {
            const lines = commentText.split("\n");
            for (const line of lines) {
                // 修改后的正则表达式处理块注释中的单行注释格式
                const trimmedLine = line.trim()
                    .replace(/^[\/\*\s]+/g, "")
                    .replace(/[\*\/\s]+$/g, "");
                if (trimmedLine.startsWith("@ts-ignore")) {
                    return true;
                }
            }
        }
        return false;
    }
    ruleFix(sourceFile, loc) {
        // 获取注释的起始位置和结束位置
        const startPosition = sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.startCol - 1);
        const endPosition = sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.endCol - 1);
        // 替换 @ts-ignore 为 @ts-expect-error
        const fixText = "@ts-expect-error";
        // 返回替换的范围和替换文本
        return { range: [startPosition, endPosition], text: fixText };
    }
    addIssueReportNodeFix(sourceFile, loc, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(loc.commentStartLine, loc.character, loc.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        let fix = this.ruleFix(sourceFile, loc);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.PreferTsExpectErrorCheck = PreferTsExpectErrorCheck;
