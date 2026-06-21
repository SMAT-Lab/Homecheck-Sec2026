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
exports.FuncCallSpacingCheck = void 0;
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
const defaultOptions = ['never', { allowNewlines: false }]; //默认never
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'FuncCallSpacingCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/func-call-spacing.md',
    description: ' Unexpected whitespace between function name and paren.',
};
//要求或不允许函数标识符和它们的调用之间有空格
class FuncCallSpacingCheck {
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
        let options = this.rule.option || defaultOptions;
        let mergedOptions = [
            options[0] || defaultOptions[0],
            { ...defaultOptions[1], ...options[1] }, // 合并第二个部分，使用 defaultOptions 和 options[1]
        ]; //处理参数
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(targetFile);
        this.issueMap.clear();
        const sourceFileObject = lib_1.ts.getParseTreeNode(sourceFile);
        if (sourceFileObject === undefined) {
            return;
        }
        const targetFilePath = targetFile.getFilePath();
        this.loopNode(targetFilePath, sourceFile, sourceFileObject, mergedOptions);
        this.reportSortedIssues();
    };
    loopNode(targetFilePath, sourceFile, aNode, mergedOptions) {
        const children = aNode.getChildren();
        for (const child of children) {
            const callExpr = lib_1.ts.isCallExpression(child);
            const newExpr = lib_1.ts.isNewExpression(child);
            const chdLength = child.getChildren().length;
            if ((callExpr || newExpr) && (chdLength === 4 || chdLength === 5)) {
                const { nameConcent, openParenToken, syntaxList, closeParenToken } = this.extractCallExpressionParts(child);
                if (nameConcent) {
                    const methodName = nameConcent.getText();
                    const nodeText = child.getText();
                    const rangeNum = this.countCharactersAndNewlines(sourceFile, child, nameConcent, openParenToken); //获取空格数和换行符数
                    const startPosition = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, nameConcent.getEnd()); //获取位置信息
                    const rangeStart = child.getStart();
                    const rangeEnd = child.getEnd();
                    this.exceFix(nodeText, rangeStart, rangeEnd, mergedOptions, rangeNum, startPosition, targetFilePath, methodName);
                }
            }
            if (child.getChildCount() > 0) {
                this.loopNode(targetFilePath, sourceFile, child, mergedOptions);
            }
        }
    }
    extractCallExpressionParts(child) {
        const children = child.getChildren();
        let newKeyWord;
        let nameConcent;
        let openParenToken;
        let syntaxList;
        let closeParenToken;
        const callExpr = lib_1.ts.isCallExpression(child);
        const cdLength = children.length;
        if (callExpr) {
            // 情况 1: 没有 new 关键
            nameConcent = children[0];
            openParenToken = children[cdLength - 3];
            syntaxList = children[cdLength - 2];
            closeParenToken = children[cdLength - 1];
        }
        else {
            // 情况 2: 有 new 关键字
            newKeyWord = children[0];
            nameConcent = children[1];
            openParenToken = children[cdLength - 3];
            syntaxList = children[cdLength - 2];
            closeParenToken = children[cdLength - 1];
        }
        return { nameConcent, openParenToken, syntaxList, closeParenToken };
    }
    countCharactersAndNewlines(sourceFile, child, nameConcent, openParenToken) {
        // 确保范围有效
        const startIndex = sourceFile.getLineAndCharacterOfPosition(nameConcent.getEnd()); // 获取 nameConcent 的结束位置
        const endIndex = sourceFile.getLineAndCharacterOfPosition(openParenToken.getStart()); // 获取 openParenToken 的开始位置
        const newlineCount = endIndex.line - startIndex.line;
        const nameConcentText = nameConcent.getText();
        const fullText = child.getText();
        const startdex = fullText.lastIndexOf(nameConcentText) + nameConcentText.length;
        let charCount = 0;
        if (newlineCount > 0) {
            charCount = newlineCount + endIndex.character;
        }
        else {
            charCount = endIndex.character - startIndex.character;
        }
        // 统计字符数和换行符数
        const subString = fullText.substring(startdex, startdex + charCount).replace('?', '').replace('.', '');
        return [subString.length, newlineCount];
    }
    addIssueReport(arkFilePath, line, startCol, endCol, name, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line, endCol, endCol, message, severity, this.rule.ruleId, arkFilePath, this.metaData.ruleDocPath, true, false, false);
        this.defects.push(defect);
        return defect;
    }
    //处理格式化问题
    formatFnCall(code, addSpace) {
        if (addSpace) {
            // 在函数名和 '(' 之间添加空格，考虑换行符
            return code.replace(/(\w+)\s*\(\s*/g, '$1 (');
        }
        else {
            // 去除函数名和 '(' 之间的空格和换行符
            return code.replace(/(\w+)\s*\(\s*/g, '$1(');
        }
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
    exceFix(nodeText, rangeStart, rangeEnd, mergedOptions, rangeNum, startPosition, filePath, methodName) {
        if (mergedOptions.length > 0 &&
            mergedOptions[0] === 'never' &&
            rangeNum[0] > 0) {
            const defect = this.addIssueReport(filePath, startPosition.line + 1, startPosition.character, startPosition.character, methodName, 'Unexpected whitespace between function name and paren.');
            //1.修复含有空格
            if (rangeNum[1] === 0) {
                defect.fixable = true;
                this.addFixByText(nodeText, rangeStart, rangeEnd, defect, false);
            }
            else {
                this.issueMap.set(defect.fixKey, new Defects_1.IssueReport(defect, undefined));
            }
        }
        else if (mergedOptions.length > 0 &&
            mergedOptions[0] === 'always' &&
            rangeNum[0] === 0) {
            const defect = this.addIssueReport(filePath, startPosition.line + 1, startPosition.character + 1, startPosition.character + 1, methodName, 'Missing space between function name and paren.');
            this.addFixByText(nodeText, rangeStart, rangeEnd, defect, false);
        }
        else if (mergedOptions.length > 0 &&
            !mergedOptions[1]?.allowNewlines &&
            mergedOptions[0] === 'always' &&
            rangeNum[1] > 0) {
            const defect = this.addIssueReport(filePath, startPosition.line + 1, startPosition.character + 1, startPosition.character + 1, methodName, 'Unexpected newline between function name and paren.');
            this.addFixByText(nodeText, rangeStart, rangeEnd, defect, true);
        }
    }
    addFixByText(nodeText, rangeStart, rangeEnd, defect, format) {
        const fixText = this.formatFnCall(nodeText, format);
        let fix = this.ruleFix(rangeStart, rangeEnd, fixText);
        this.issueMap.set(defect.fixKey, { defect, fix });
    }
}
exports.FuncCallSpacingCheck = FuncCallSpacingCheck;
