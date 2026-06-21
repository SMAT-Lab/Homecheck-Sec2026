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
exports.KeywordSpacingCheck = void 0;
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
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const Utils_1 = require("../../utils/common/Utils");
const defaultOptions = {
    before: true,
    after: true,
    overrides: {},
};
//关键字集合 填坑部分关键字不考虑-不在集合[true,false]
const keywordKinds = [83, 84, 91, 92, 98, 100, 125, 108, 116, 117, 104];
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'KeywordSpacingCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/keyword-spacing.md',
    description: 'is better written in dot notation.',
};
//要求或不允许函数标识符和它们的调用之间有空格
class KeywordSpacingCheck {
    codeFix(arkFile, fixKey) {
        throw new Error('Method not implemented.');
    }
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatchBuildCb];
    }
    check = (targetFile) => {
        let options = this.rule.option[0] || defaultOptions;
        let mergedOptions = {
            ...defaultOptions,
            ...options,
        };
        this.issueMap.clear();
        const targetFilePath = targetFile.getFilePath();
        const astRoot = lib_1.AstTreeUtils.getSourceFileFromArkFile(targetFile);
        let keyWordCollect = [];
        for (let child of astRoot.statements) {
            const collectedKeywords = this.loopNode(targetFile, astRoot, child, []);
            keyWordCollect.push(...collectedKeywords);
        }
        //2.依据选项过滤结果集
        keyWordCollect.forEach((keyword) => {
            // 获取当前关键字的设置
            const keywordOverride = mergedOptions.overrides[keyword.name];
            const beforeSetting = keywordOverride?.before ?? mergedOptions.before; // 使用 overrides 中的 before 或默认 before
            const afterSetting = keywordOverride?.after ?? mergedOptions.after; // 使用 overrides 中的 after 或默认 after
            // 判断是否符合 before 和 after 的条件
            const isBeforeValid = beforeSetting === keyword.before;
            const isAfterValid = afterSetting === keyword.after;
            // 返回符合条件的关键字
            keyword.isDefectBefore = !(isBeforeValid || keyword.lineFirst);
            keyword.isDefectAfter = !isAfterValid;
            //开始传递配置
            keyword.before = beforeSetting;
            keyword.after = afterSetting;
        });
        //3.装配报错信息
        this.processKeyword(keyWordCollect, targetFilePath);
        this.reportSortedIssues();
    };
    //修改参数 添加class位置进行拼接性能考虑不在结果集后统一处理;
    loopNode(targetFile, sourceFile, aNode, alloct = [] // 将 alloct 提前放到函数外部
    ) {
        // 允许的关键字选
        const children = aNode.getChildren();
        // 将 keywordKinds 转换为 Set 提高查询效率
        const keywordSet = new Set(keywordKinds);
        // 遍历所有子节点
        for (const child of children) {
            if (keywordSet.has(child.kind)) {
                const position = lib_1.LineColPosition.buildFromNode(child, sourceFile);
                const keywordSpace = this.checkKeywordSpacing(child, sourceFile.text);
                alloct.push({
                    name: child.getText(),
                    kind: child.kind,
                    node: child,
                    before: keywordSpace.beforeSpace,
                    after: keywordSpace.afterSpace,
                    lineFirst: keywordSpace.lineFirst,
                    lineNo: position.getLineNo(),
                    colStrNo: position.getColNo(),
                    colEndNo: position.getColNo() + child.getText().length,
                    isLeadingCharNormal: keywordSpace.isLeadingCharNormal,
                    isTrailingCharNormal: keywordSpace.isTrailingCharNormal,
                    leadingDistance: keywordSpace.leadingDistance,
                    trailingDistance: keywordSpace.trailingDistance,
                });
            }
            // 如果该节点有子节点，继续递归遍历
            if (child.getChildren().length > 0) {
                this.loopNode(targetFile, sourceFile, child, alloct); // 递归时传递 alloct
            }
        }
        // 返回结果
        return alloct;
    }
    checkKeywordSpacing(node, sourceCode) {
        let keywordSpace = {
            beforeSpace: false,
            afterSpace: false,
            lineFirst: false,
            isLeadingCharNormal: false,
            isTrailingCharNormal: false,
            leadingDistance: 0,
            trailingDistance: 0,
        };
        // 获取关键字前一个字符
        const leadingTrivia = sourceCode.substring(node.getStart() - 1, node.getStart());
        // 获取关键字后一个字符
        const trailingTrivia = sourceCode.substring(node.getEnd(), node.getEnd() + 1);
        // 判断关键字前是否有空格
        if (leadingTrivia === ' ') {
            keywordSpace.beforeSpace = true;
        }
        // 判断关键字后是否有空格
        if (trailingTrivia === ' ') {
            keywordSpace.afterSpace = true;
        }
        // 获取当前关键字所在行的起始位置
        const lineStart = sourceCode.lastIndexOf('\n', node.getStart()) + 1;
        // 获取该行的内容
        const lineContent = sourceCode.substring(lineStart, node.getStart());
        // 判断当前关键字是否是本行第一个
        const isFirstInLine = lineContent.trim().length === 0; // 如果该行只有空格，则当前关键字是第一个
        if (isFirstInLine) {
            keywordSpace.lineFirst = true;
        }
        const { leadingChar, leadingDistance } = this.getPreviousNonSpaceCharacter(sourceCode, node.getStart());
        const { trailingChar, trailingDistance } = this.getNextNonSpaceCharacter(sourceCode, node.getEnd());
        // 判断前后最近字符是否为常规字符
        let isLeadingCharNormal = leadingChar ? this.isNormalCharacter(leadingChar) : false;
        let isTrailingCharNormal = trailingChar ? this.isNormalCharacter(trailingChar) : false;
        if (leadingChar && leadingChar === '<') {
            isLeadingCharNormal = !isLeadingCharNormal;
            isTrailingCharNormal = !isTrailingCharNormal;
        }
        if (leadingChar && (leadingChar === ';' || leadingChar === '\r' || leadingChar === '{')) {
            isLeadingCharNormal = !isLeadingCharNormal;
        }
        if (trailingChar && (trailingChar === ';' || trailingChar === '\r')) {
            isTrailingCharNormal = !isTrailingCharNormal;
        }
        keywordSpace.isLeadingCharNormal =
            isLeadingCharNormal || leadingChar === '(';
        keywordSpace.isTrailingCharNormal = isTrailingCharNormal;
        keywordSpace.leadingDistance = leadingDistance;
        keywordSpace.trailingDistance = trailingDistance;
        return keywordSpace;
    }
    // 获取前一个非空格字符和它与关键字的距离
    getPreviousNonSpaceCharacter(sourceCode, index) {
        let i = index - 1;
        // 向前遍历直到找到一个非空格字符
        while (i >= 0) {
            const char = sourceCode[i];
            if (char !== ' ' && char !== '\n') {
                return { leadingChar: char, leadingDistance: index - i - 1 }; // 返回字符和它与关键字的距离
            }
            i--;
        }
        return { leadingChar: null, leadingDistance: 0 }; // 如果没有找到非空格字符，返回null和0距离
    }
    // 获取下一个非空格字符和它与关键字的距离
    getNextNonSpaceCharacter(sourceCode, index) {
        let i = index;
        while (i < sourceCode.length) {
            const char = sourceCode[i];
            if (char !== ' ' && char !== '\n') {
                return { trailingChar: char, trailingDistance: i - index }; // 返回字符和它与关键字的距离
            }
            i++;
        }
        return { trailingChar: null, trailingDistance: 0 }; // 如果没有找到非空格字符，返回null和0距离
    }
    // 判断是否是常规字符（字母、数字、下划线）
    isNormalCharacter(char) {
        return /^[a-zA-Z0-9_]$/.test(char);
    }
    deleteBorderSpaces(sourceCode, keyWord, beforeNum, after) {
        const keyIndex = sourceCode.indexOf(keyWord);
        if (keyIndex === -1) {
            return sourceCode; // 关键字不存在，直接返回原字符串
        }
        // 计算去掉空格后的起始索引（防止越界）
        let startIndex = keyIndex;
        while (beforeNum > 0 &&
            startIndex > 0 &&
            sourceCode[startIndex - 1] === ' ') {
            startIndex--;
            beforeNum--;
        }
        // 计算去掉空格后的结束索引（防止越界）
        let endIndex = keyIndex + keyWord.length;
        while (after > 0 &&
            endIndex < sourceCode.length &&
            sourceCode[endIndex] === ' ') {
            endIndex++;
            after--;
        }
        // 重新拼接字符串，确保只去掉指定数量的空格
        return (sourceCode.substring(0, startIndex) +
            keyWord +
            sourceCode.substring(endIndex));
    }
    checkIndexSignature(node) {
        // 如果当前节点是索引签名声明，直接返回 true
        if (lib_1.ts.isIndexSignatureDeclaration(node)) {
            return true;
        }
        // 获取当前节点的子节点
        const children = node.getChildren();
        // 遍历子节点并递归检查
        for (const child of children) {
            // 如果在子节点中找到索引签名声明，立刻返回 true
            if (this.checkIndexSignature(child)) {
                return true;
            }
        }
        // 如果没有找到索引签名声明，返回 false
        return false;
    }
    addIssueReport(arkFilePath, line, startCol, endCol, name, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, arkFilePath, this.metaData.ruleDocPath, true, false, false);
        this.defects.push(defect);
        return defect;
    }
    ruleFix(pos, end, text) {
        return { range: [pos, end], text: text };
    }
    reportSortedIssues() {
        if (this.issueMap.size === 0) {
            return;
        }
        const sortedIssues = Array.from(this.issueMap.entries()).sort(([keyA], [keyB]) => Utils_1.Utils.sortByLineAndColumn(keyA, keyB));
        this.issues = [];
        sortedIssues.forEach(([_, issue]) => {
            DefectsList_1.RuleListUtil.push(issue.defect);
            this.issues.push(issue);
        });
    }
    //装配报错信息
    processKeyword(keyWordCollect, targetFilePath) {
        for (let keyword of keyWordCollect) {
            if (!keyword.isDefectBefore && !keyword.isDefectAfter) {
                continue;
            }
            if (keyword.isDefectBefore && !keyword.isLeadingCharNormal) {
                if (keyword.before) {
                    const message = `Expected space(s) before '${keyword.name}'.`;
                    const text = keyword.node.getText();
                    this.execFix(keyword, targetFilePath, message, ` `, false, true);
                }
                else {
                    const parentText = keyword.node.parent?.getFullText();
                    const fixText = this.deleteBorderSpaces(parentText, keyword.name, keyword.leadingDistance ?? 0, 0);
                    const message = `Unexpected space(s) before '${keyword.name}'.`;
                    this.execFix(keyword, targetFilePath, message, ``, true, true);
                }
            }
            if (keyword.isDefectAfter && !keyword.isTrailingCharNormal) {
                if (keyword.after) {
                    const message = `Expected space(s) after  '${keyword.name}'.`;
                    const text = keyword.node.getText();
                    this.execFix(keyword, targetFilePath, message, ` `, false, false, true);
                }
                else {
                    const message = `Unexpected space(s) after  '${keyword.name}'.`;
                    const parentText = keyword.node.parent?.getText();
                    const fixText = this.deleteBorderSpaces(parentText, keyword.name, 0, keyword.trailingDistance ?? 0);
                    this.execFix(keyword, targetFilePath, message, ``, true, false, true);
                }
            }
        }
    }
    execFix(keyword, targetFilePath, message, text, isParent, isBefore, needEnd = false) {
        const defect = this.addIssueReport(targetFilePath, keyword.lineNo, keyword.colStrNo, needEnd ? keyword.colEndNo : keyword.colStrNo, keyword.name, message);
        let rangeStart = keyword.node.getStart();
        let rangeEnd = keyword.node.getEnd();
        if (isBefore && isParent) {
            rangeStart = this.getPreviousSiblingBefore(keyword.node).getEnd();
        }
        if (!isBefore && isParent) {
            rangeEnd = this.getPreviousSiblingEnd(keyword.node).getStart();
        }
        if (isBefore) {
            rangeEnd = keyword.node.getStart();
        }
        else {
            rangeStart = keyword.node.getEnd();
        }
        let fix = this.ruleFix(rangeStart, rangeEnd, `${text}`);
        defect.fixable = true;
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
    getPreviousSiblingBefore(node) {
        if (!node.parent) {
            return node;
        }
        const parent = node.parent;
        const children = parent.getChildren();
        const index = children.indexOf(node);
        if (index > 0) {
            return children[index - 1]; // 获取前一个兄弟节点
        }
        return node; // 没有前一个兄弟节点
    }
    getPreviousSiblingEnd(node) {
        if (!node.parent) {
            return node;
        }
        const parent = node.parent;
        const children = parent.getChildren();
        const index = children.indexOf(node);
        if (index > 0) {
            return children[index + 1]; // 获取前一个兄弟节点
        }
        return node; // 没有前一个兄弟节点
    }
}
exports.KeywordSpacingCheck = KeywordSpacingCheck;
