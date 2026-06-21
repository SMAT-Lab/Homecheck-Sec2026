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
exports.BanTsCommentCheck = void 0;
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
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'BanTsCommentCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/ban-ts-comment.md",
    description: "Disallow `@ts-<directive>` comments or require descriptions after directives.",
};
class BanTsCommentCheck {
    defaultOptions = {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-check': false,
        minimumDescriptionLength: 3,
    };
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    descriptionLength = 3;
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
        if (target instanceof arkanalyzer_1.ArkFile) {
            const code = target.getCode();
            if (!code) {
                return;
            }
            const filePath = target.getFilePath();
            const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
            // 提取注释
            const comments = this.extractComments(sourceFile);
            // 输出结果
            comments.forEach(comment => {
                this.addIssueReportNode(comment, filePath);
            });
        }
    };
    extractComments(sourceFile) {
        const comments = [];
        const visit = (node) => {
            const leadingComments = arkanalyzer_1.ts.getLeadingCommentRanges(sourceFile.getFullText(), node.pos);
            if (leadingComments) {
                this.checkComments(sourceFile, leadingComments, comments);
            }
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return comments;
    }
    checkComments(sourceFile, leadingComments, comments) {
        let description;
        for (const comment of leadingComments) {
            let isPass = true;
            const commentText = sourceFile.getFullText().substring(comment.pos, comment.end).trim();
            if (commentText.includes('@ts-expect-error')) {
                isPass = this.checkOption(commentText, 'ts-expect-error');
                if (this.checkExpectError('ts-expect-error')) {
                    description = 'Do not use "@ts-expect-error" because it alters compilation errors.';
                }
                else {
                    description = `Include a description after the "@ts-expect-error" directive to explain why the @ts-expect-error is necessary.The description must be ${this.descriptionLength} characters or longer.`;
                }
                const formatMessage = this.checkDescriptionFormat(commentText, 'ts-expect-error');
                if (formatMessage) {
                    description = formatMessage;
                }
            }
            if (commentText.includes('@ts-ignore')) {
                isPass = this.checkOption(commentText, 'ts-ignore');
                description = `Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free.`;
            }
            if (commentText.includes('@ts-nocheck')) {
                isPass = this.checkOption(commentText, 'ts-nocheck');
                description = `Do not use "@ts-nocheck" because it alters compilation errors.`;
            }
            if (commentText.includes('@ts-check')) {
                isPass = this.checkOption(commentText, 'ts-check');
                description = `Do not use "@ts-check" because it alters compilation errors.`;
            }
            if (!isPass) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(comment.pos);
                comments.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    character: character + 1,
                    comment: commentText,
                    description: description || ''
                });
            }
        }
        return comments;
    }
    checkExpectError(option) {
        const options = this.rule && this.rule.option[0] ? this.rule.option[0] : this.defaultOptions;
        let directiveConfig;
        if (typeof options === 'object' && options !== null && option in options) {
            directiveConfig = options[option];
        }
        if (directiveConfig === true) {
            return true;
        }
        return false;
    }
    checkOption(commentText, option) {
        let isPass = false;
        const options = this.rule && this.rule.option[0] ? this.rule.option[0] : this.defaultOptions;
        this.descriptionLength = options.minimumDescriptionLength ?? 3;
        let directiveConfig;
        // 提取配置中的实际规则值
        if (typeof options === 'object' && options !== null && option in options) {
            directiveConfig = options[option];
        }
        if (directiveConfig === false) {
            isPass = true;
        }
        else if (directiveConfig === 'allow-with-description') {
            // 使用模板字符串动态生成正则表达式
            const directiveRegex = new RegExp(`@${option}\\s*(.+)`);
            const match = commentText.match(directiveRegex);
            if (match) {
                const fullMatch = match[0];
                const description = match[1].trim();
                // 获取 fullMatch 和 description 的起始位置
                const fullMatchStart = commentText.indexOf(fullMatch);
                const descriptionStart = commentText.indexOf(description, fullMatchStart);
                // 检查 description 是否在同一行
                const lines = commentText.split('\n');
                const fullMatchLine = lines.findIndex(line => line.includes(fullMatch));
                const descriptionLine = lines.findIndex(line => line.includes(description));
                if (fullMatchLine === descriptionLine && description.length > this.descriptionLength) {
                    isPass = true;
                }
            }
        }
        else if (typeof directiveConfig === 'object' && directiveConfig !== null && 'descriptionFormat' in directiveConfig) {
            const format = directiveConfig.descriptionFormat;
            // 移除开头的冒号要求，并确保没有多余的空格
            const formatRegex = new RegExp(format.replace(/^\^:/, '^').replace(/^\^ /, '^'));
            // 提取描述部分，移除注释标记和指令
            const description = commentText.includes(':') ? commentText.split(':')[1]?.trim() : commentText.trim();
            if (formatRegex.test(description)) {
                isPass = true;
            }
        }
        return isPass;
    }
    checkDescriptionFormat(commentText, option) {
        let message = '';
        const options = this.rule && this.rule.option[0] ? this.rule.option[0] : this.defaultOptions;
        let directiveConfig;
        // 提取配置中的实际规则值
        if (typeof options === 'object' && options !== null && option in options) {
            directiveConfig = options[option];
        }
        if (directiveConfig === false) {
            return message;
        }
        if (typeof directiveConfig === 'object' && directiveConfig !== null && 'descriptionFormat' in directiveConfig) {
            const format = directiveConfig.descriptionFormat;
            // 移除开头的冒号要求，并确保没有多余的空格
            const formatRegex = new RegExp(format.replace(/^\^:/, '^').replace(/^\^ /, '^'));
            // 提取描述部分，移除注释标记和指令
            const description = commentText.includes(':') ? commentText.split(':')[1]?.trim() : commentText.trim();
            if (formatRegex.test(description)) {
                return '';
            }
            message = `The description for the ${option} directive must match the ${format} format.`;
        }
        return message;
    }
    addIssueReportNode(info, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (info.description) {
            this.metaData.description = info.description;
        }
        let defect = new Defects_1.Defects(info.line, info.character, info.character, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.BanTsCommentCheck = BanTsCommentCheck;
