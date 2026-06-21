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
exports.BanTSLintCommentCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'BanTSLintCommentCheck');
;
;
;
class BanTSLintCommentCheck {
    REGEX_ENABLE_DISABLE = /^\s*tslint:(enable|disable)(?:-(line|next-line))?(:|\s|$)/;
    rule;
    defects = [];
    issues = [];
    filePath = '';
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/ban-tslint-comment.md',
        description: 'tslint comment detected: ',
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcherCb];
    }
    ;
    check = (target) => {
        try {
            this.filePath = target.getFilePath();
            const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
            const comments = this.getComments(sourceFile);
            comments.forEach((comment) => {
                const commentText = sourceFile.getFullText().substring(comment.pos, comment.end);
                this.handleComment(commentText, sourceFile, comment);
            });
        }
        catch (error) {
            logger.error(`Error occurred while checking file: ${target.getFilePath()}, Error: ${error}`);
        }
        ;
    };
    processCommentRanges(ranges, commentRanges, seenComments) {
        if (!ranges) {
            return;
        }
        ;
        ranges.forEach((commentRange) => {
            const key = `${commentRange.pos}-${commentRange.end}`;
            if (!seenComments.has(key)) {
                commentRanges.push(commentRange);
                seenComments.add(key);
            }
            ;
        });
    }
    ;
    processNodeComments(node, text, commentRanges, seenComments) {
        this.processCommentRanges(arkanalyzer_1.ts.getLeadingCommentRanges(text, node.pos), commentRanges, seenComments);
        this.processCommentRanges(arkanalyzer_1.ts.getTrailingCommentRanges(text, node.end), commentRanges, seenComments);
    }
    ;
    processMethodComments(node, sourceFile) {
        if (arkanalyzer_1.ts.isMethodDeclaration(node) && node.body) {
            this.checkMethodComment(node.body, sourceFile);
        }
        else if (arkanalyzer_1.ts.isArrowFunction(node) && node.body) {
            this.checkMethodComment(node.body, sourceFile);
        }
        else if (arkanalyzer_1.ts.isFunctionDeclaration(node) && node.body) {
            this.checkMethodComment(node.body, sourceFile);
        }
        ;
    }
    ;
    // 获取文件中所有注释（包括前导、尾随和未附着的注释）
    visitNode(node, text, commentRanges, seenComments, sourceFile) {
        this.processNodeComments(node, text, commentRanges, seenComments);
        this.processMethodComments(node, sourceFile);
        arkanalyzer_1.ts.forEachChild(node, (child) => this.visitNode(child, text, commentRanges, seenComments, sourceFile));
    }
    ;
    getComments(sourceFile) {
        const text = sourceFile.text;
        const commentRanges = [];
        const seenComments = new Set();
        this.visitNode(sourceFile, text, commentRanges, seenComments, sourceFile);
        return commentRanges;
    }
    ;
    handleComment(commentText, sourceFile, comment) {
        if (comment.kind === arkanalyzer_1.ts.SyntaxKind.SingleLineCommentTrivia || comment.kind === arkanalyzer_1.ts.SyntaxKind.MultiLineCommentTrivia) {
            this.checkComment(commentText, sourceFile, comment);
        }
        ;
    }
    ;
    removeNewlines(str) {
        // 先去除换行符，然后将多个连续空格替换为单个空格
        return str.replace(/[\r\n]/g, '').replace(/\s+/g, ' ').trim();
    }
    ;
    getAllComments(code) {
        const comments = [];
        const commentRegex = /\/\/(.*)|\/\*([\s\S]*?)\*\//g;
        let match;
        while ((match = commentRegex.exec(code)) !== null) {
            const fullMatch = match[0];
            let innerMatch = null;
            if (match[1]) {
                innerMatch = match[1].trim();
            }
            else if (match[2]) {
                innerMatch = match[2].trim();
            }
            ;
            const pos = match.index;
            // 把注释起始位置之前的代码按换行符分割成一个行数组
            const linesBefore = code.slice(0, pos).split('\n');
            // 计算行列号
            const line = linesBefore.length;
            const startCol = linesBefore[linesBefore.length - 1].length + 1;
            const end = pos + fullMatch.length;
            const node = { startCol, pos, end, line };
            comments.push({ fullMatch, innerMatch, node });
        }
        ;
        return comments;
    }
    ;
    // 处理方法节点的最后一个注释
    checkMethodComment(body, sourceFile) {
        const commentMatch = this.getAllComments(body.getText());
        const lastComment = commentMatch.length !== 0 ? commentMatch[commentMatch.length - 1] : null;
        if (lastComment && this.REGEX_ENABLE_DISABLE.test(lastComment.innerMatch)) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(body.getStart());
            const startLine = line + lastComment.node.line;
            const startCol = lastComment.node.startCol;
            let defect = this.addIssueReport({
                line: startLine,
                startCol: startCol,
                endColum: startCol + lastComment.fullMatch.length,
                comment: this.removeNewlines(lastComment.fullMatch)
            });
            let pos = lastComment.node.pos + body.pos + 1;
            let end = lastComment.node.end + body.pos + 1;
            let fix = this.ruleFix(pos, end);
            this.issues.push({ defect, fix });
            DefectsList_1.RuleListUtil.push(defect);
        }
        ;
    }
    ;
    // 检查注释
    checkComment(commentText, sourceFile, comment) {
        let commentValue = commentText.substring(2).trim();
        if (this.REGEX_ENABLE_DISABLE.test(commentValue)) {
            // 获取注释起始位置的行列号
            let { line: startLine, character: startCol } = sourceFile.getLineAndCharacterOfPosition(comment.pos);
            startLine = startLine + 1;
            startCol = startCol + 1;
            let defect = this.addIssueReport({
                line: startLine,
                startCol: startCol,
                endColum: startCol + commentText.length,
                comment: this.removeNewlines(commentText)
            });
            let fix = this.ruleFix(comment.pos, comment.end);
            this.issues.push(new Defects_1.IssueReport(defect, fix));
            DefectsList_1.RuleListUtil.push(defect);
        }
        ;
    }
    ;
    // 创建修复对象 
    ruleFix(pos, end) {
        return { range: [pos, end], text: '' };
    }
    ;
    addIssueReport(warnInfo) {
        this.metaData.description = `tslint comment detected: "${warnInfo.comment}"`;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endColum, this.metaData.description, severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, true);
        return defect;
    }
    ;
}
exports.BanTSLintCommentCheck = BanTSLintCommentCheck;
;
