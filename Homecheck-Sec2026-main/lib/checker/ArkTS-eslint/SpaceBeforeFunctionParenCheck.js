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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceBeforeFunctionParenCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
class SpaceBeforeFunctionParenCheck {
    issues = [];
    rule;
    defects = [];
    sourceFile;
    defaultOptions = [
        {
            anonymous: 'never',
            named: 'never',
            asyncArrow: 'never',
        }
    ];
    errors = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/space-before-function-paren.md',
        description: 'Enforce consistent spacing before function parenthesis',
    };
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    /**
      * 检测函数括号前的空格问题
      * @param code 代码字符串
      * @param options 规则配置选项
      * @returns 错误信息数组，包含行列号和消息
    */
    checkSpaceBeforeFunctionParen(targetField, options) {
        this.errors = [];
        let code = targetField.getCode();
        this.sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        const visitNode = (node) => {
            if (arkanalyzer_1.ts.isFunctionDeclaration(node)) {
                this.checkNamedFunction(node, code, options);
            }
            else if (arkanalyzer_1.ts.isFunctionExpression(node)) {
                this.checkFunctionExpression(node, !!node.name, code, options);
            }
            else if (arkanalyzer_1.ts.isArrowFunction(node)) {
                this.checkAsyncArrowFunction(node, code, options);
            }
            else if (arkanalyzer_1.ts.isMethodDeclaration(node) || arkanalyzer_1.ts.isGetAccessor(node) || arkanalyzer_1.ts.isSetAccessor(node)) {
                this.checkMethod(node, code, options);
            }
            else if (arkanalyzer_1.ts.isConstructorDeclaration(node)) {
                this.checkConstructor(node, code, options);
            }
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        arkanalyzer_1.ts.forEachChild(this.sourceFile, visitNode);
        return this.errors;
    }
    getParenPosition(node) {
        const openParen = node.getChildren().find(c => c.kind === arkanalyzer_1.ts.SyntaxKind.OpenParenToken);
        return openParen?.getStart() || null;
    }
    checkNamedFunction(node, code, options) {
        if (!node.name?.getText() && this.isGeneratorFunction(node)) {
            return;
        }
        if (options.named === 'ignore') {
            return;
        }
        if (!node.name) {
            const isExportDefault = node.modifiers?.some(m => m.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword &&
                node.modifiers?.some(m2 => m2.kind === arkanalyzer_1.ts.SyntaxKind.DefaultKeyword));
            if (!isExportDefault) {
                return;
            }
            const functionKeyword = node.getChildren().find(c => c.kind === arkanalyzer_1.ts.SyntaxKind.FunctionKeyword);
            if (!functionKeyword) {
                return;
            }
            const checkStart = functionKeyword.end;
            const parenPos = this.getParenPosition(node);
            if (!parenPos) {
                return;
            }
            const errorMessage = options.named === 'always'
                ? 'Missing space before function parentheses.'
                : 'Unexpected space before function parentheses.';
            this.checkSpace(node, code, checkStart, parenPos, options.named, errorMessage);
            return;
        }
        let checkStart;
        if (node.typeParameters && node.typeParameters.length > 0) {
            const lastTypeParam = node.typeParameters[node.typeParameters.length - 1];
            checkStart = lastTypeParam.getEnd();
            const closingAngle = this.findClosingAngleBracket(code, checkStart);
            if (closingAngle !== -1) {
                checkStart = closingAngle + 1;
            }
        }
        else {
            checkStart = node.name.end;
        }
        const parenPos = this.getParenPosition(node);
        if (!parenPos) {
            return;
        }
        const errorMessage = options.named === 'always'
            ? 'Missing space before function parentheses.'
            : 'Unexpected space before function parentheses.';
        this.checkSpace(node, code, checkStart, parenPos, options.named, errorMessage);
    }
    // 查找泛型参数后的右尖括号
    findClosingAngleBracket(code, startPos) {
        let pos = startPos;
        while (pos < code.length) {
            if (code[pos] === '>') {
                return pos;
            }
            pos++;
        }
        return -1;
    }
    checkAsyncArrowFunction(node, code, options) {
        if (options.asyncArrow === 'ignore') {
            return;
        }
        const asyncKeyword = node.modifiers?.find(m => m.kind === arkanalyzer_1.ts.SyntaxKind.AsyncKeyword);
        if (!asyncKeyword) {
            return;
        }
        const parenPos = this.getParenPosition(node);
        if (!parenPos) {
            return;
        }
        const errorMessage = options.asyncArrow === 'always'
            ? 'Missing space before function parentheses.'
            : 'Unexpected space before function parentheses.';
        this.checkSpace(node, code, asyncKeyword.end, parenPos, options.asyncArrow, errorMessage);
    }
    checkMethod(node, code, options) {
        if (options.named === 'ignore') {
            return;
        }
        let checkStart = node.name.end;
        // 新增：处理泛型参数
        if (node.typeParameters && node.typeParameters.length > 0) {
            const lastTypeParam = node.typeParameters[node.typeParameters.length - 1];
            checkStart = lastTypeParam.getEnd();
            const closingAngle = this.findClosingAngleBracketForMethod(code, checkStart);
            if (closingAngle !== -1) {
                checkStart = closingAngle + 1; // 调整检查起点到泛型闭合后
            }
        }
        const parenPos = this.getParenPosition(node);
        if (!parenPos) {
            return;
        }
        const errorMessage = options.named === 'always'
            ? 'Missing space before function parentheses.'
            : 'Unexpected space before function parentheses.';
        this.checkSpace(node, code, checkStart, parenPos, options.named, errorMessage);
    }
    findClosingAngleBracketForMethod(code, startPos) {
        let pos = startPos;
        let stack = 1; // 初始栈为1，匹配外层泛型
        while (pos < code.length) {
            const char = code[pos];
            if (char === '<') {
                stack++;
            }
            else if (char === '>') {
                stack--;
                if (stack === 0) {
                    return pos; // 返回最外层闭合的 '>'
                }
            }
            pos++;
        }
        return -1;
    }
    checkConstructor(node, code, options) {
        if (options.named === 'ignore') {
            return;
        }
        const constructorKeyword = node.getChildren().find(c => c.kind === arkanalyzer_1.ts.SyntaxKind.ConstructorKeyword);
        if (!constructorKeyword) {
            return;
        }
        const checkStart = node.typeParameters?.end || constructorKeyword.end;
        const parenPos = this.getParenPosition(node);
        if (!parenPos) {
            return;
        }
        const errorMessage = options.named === 'always'
            ? 'Missing space before function parentheses.'
            : 'Unexpected space before function parentheses.';
        this.checkSpace(node, code, checkStart, parenPos, options.named, errorMessage);
    }
    isGeneratorFunction(node) {
        return node.asteriskToken !== undefined;
    }
    checkFunctionExpression(node, isNamed, code, options) {
        if (!isNamed && this.isGeneratorFunction(node)) {
            return;
        }
        const option = isNamed ? options.named : options.anonymous;
        if (option === 'ignore') {
            return;
        }
        const checkStart = node.typeParameters?.end || (isNamed && node.name?.end) ||
            node.getChildren().find(c => c.kind === arkanalyzer_1.ts.SyntaxKind.FunctionKeyword)?.end;
        if (!checkStart) {
            return;
        }
        const parenPos = this.getParenPosition(node);
        if (!parenPos) {
            return;
        }
        const errorMessage = option === 'always'
            ? 'Missing space before function parentheses.'
            : 'Unexpected space before function parentheses.';
        this.checkSpace(node, code, checkStart, parenPos, option, errorMessage);
    }
    checkSpace(node, code, checkStart, parenPos, optionType, errorMessage) {
        if (optionType === 'ignore' || parenPos === -1) {
            return;
        }
        const spaceCheckStart = Math.max(checkStart, 0);
        const spaceCheckEnd = parenPos - 1;
        if (optionType === 'never') {
            this.checkNeverSpace(node, code, spaceCheckStart, spaceCheckEnd, errorMessage, optionType);
        }
        else if (optionType === 'always') {
            this.checkAlwaysSpace(node, code, spaceCheckStart, spaceCheckEnd, parenPos, errorMessage, optionType);
        }
    }
    checkNeverSpace(node, code, spaceCheckStart, spaceCheckEnd, errorMessage, optionType) {
        let hasInvalidSpace = false;
        let pos = spaceCheckStart;
        let firstSpacePos = -1;
        while (pos <= spaceCheckEnd) {
            const char = code[pos];
            // Check for whitespace
            if (/\s/.test(char)) {
                if (firstSpacePos === -1) {
                    firstSpacePos = pos;
                }
                hasInvalidSpace = true;
            }
            if (char === '/' && code[pos + 1] === '*') {
                if (firstSpacePos === -1) {
                    firstSpacePos = pos;
                }
                hasInvalidSpace = true;
                const commentEnd = code.indexOf('*/', pos + 2);
                if (commentEnd === -1) {
                    break;
                }
                pos = commentEnd + 2;
                continue;
            }
            if (char === '/' && code[pos + 1] === '/') {
                if (firstSpacePos === -1) {
                    firstSpacePos = pos;
                }
                hasInvalidSpace = true;
                const lineEnd = code.indexOf('\n', pos);
                pos = lineEnd === -1 ? spaceCheckEnd + 1 : lineEnd;
                continue;
            }
            pos++;
        }
        if (hasInvalidSpace && firstSpacePos !== -1) {
            this.addError(firstSpacePos, errorMessage, node, optionType);
        }
    }
    checkAlwaysSpace(node, code, spaceCheckStart, spaceCheckEnd, parenPos, errorMessage, optionType) {
        let hasWhitespace = false;
        let pos = spaceCheckStart;
        while (pos <= spaceCheckEnd) {
            const char = code[pos];
            if (/\s/.test(char)) {
                hasWhitespace = true;
                pos++;
                continue;
            }
            if (char === '/' && code[pos + 1] === '*') {
                const commentEnd = code.indexOf('*/', pos + 2);
                if (commentEnd === -1) {
                    break;
                }
                pos = commentEnd + 2;
                continue;
            }
            if (char === '/' && code[pos + 1] === '/') {
                const lineEnd = code.indexOf('\n', pos);
                pos = lineEnd === -1 ? spaceCheckEnd + 1 : lineEnd;
                continue;
            }
            break;
        }
        if (!hasWhitespace) {
            this.addError(parenPos, errorMessage, node, optionType);
        }
    }
    addError(pos, message, node, optionType) {
        const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(pos);
        this.errors.push({
            line: line + 1,
            character: character + 1,
            endCol: character + node.getText().length + 1,
            message,
            node,
            optionType
        });
    }
    check = (targetField) => {
        this.defaultOptions = this.getDefaultOption();
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = targetField.getFilePath();
        const myInvalidPositions = this.checkSpaceBeforeFunctionParen(targetField, this.defaultOptions[0]);
        const myInvalidPositionsNew = this.sortMyInvalidPositions(myInvalidPositions);
        myInvalidPositionsNew.forEach(pos => {
            this.addIssueReport(filePath, pos, severity);
        });
    };
    // 对错误位置进行排序并去重
    sortMyInvalidPositions(myInvalidPositions) {
        // 1. 先进行排序
        myInvalidPositions.sort((a, b) => a.line - b.line || a.character - b.character);
        // 2. 使用 reduce 进行去重
        const uniqueArrays = myInvalidPositions.reduce((acc, current) => {
            const lastItem = acc[acc.length - 1];
            // 检查是否与最后一个元素的三要素相同
            if (!lastItem ||
                lastItem.line !== current.line ||
                lastItem.character !== current.character ||
                lastItem.message !== current.message) {
                acc.push(current);
            }
            return acc;
        }, []);
        return uniqueArrays;
    }
    getDefaultOption() {
        let option;
        if (this.rule && this.rule.option && this.rule.option[0]) {
            if (typeof this.rule.option[0] === 'string') {
                let optionVal = this.rule.option[0];
                return [{ anonymous: optionVal, named: optionVal, asyncArrow: optionVal }];
            }
            else {
                option = this.rule.option;
                if (!option[0].anonymous) {
                    option[0].anonymous = 'never';
                }
                if (!option[0].named) {
                    option[0].named = 'never';
                }
                if (!option[0].asyncArrow) {
                    option[0].asyncArrow = 'never';
                }
                return option;
            }
        }
        return [{ anonymous: 'never', named: 'never', asyncArrow: 'never' }];
    }
    // 创建修复对象 
    ruleFix(pos, end, optionType) {
        let textStr = '';
        if (optionType === 'always') {
            textStr = ' (';
        }
        else if (optionType === 'never') {
            let textNew = this.sourceFile.getFullText().slice(pos, end);
            if (textNew.includes('\r\n')) {
                textStr = '';
            }
            else {
                textStr = textNew.trim();
            }
        }
        return { range: [pos, end], text: textStr };
    }
    addIssueReport(filePath, pos, severity) {
        // Create defect
        const defect = new Index_1.Defects(pos.line, pos.character, pos.endCol, pos.message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        // Generate fix
        const fix = this.generateFix(pos);
        // Add to issues collection
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    generateFix(pos) {
        // Check if the node is a function-like declaration
        if (!this.isFunctionLikeDeclaration(pos.node)) {
            return undefined;
        }
        // Get the positions for the fix based on option type
        const { stPos, stEnd } = pos.optionType === 'always'
            ? this.getAlwaysFixPositions(pos.node)
            : this.getNeverFixPositions(pos.node);
        // Create and return the fix
        return this.ruleFix(stPos, stEnd, pos.optionType);
    }
    isFunctionLikeDeclaration(node) {
        return arkanalyzer_1.ts.isFunctionDeclaration(node) ||
            arkanalyzer_1.ts.isFunctionExpression(node) ||
            arkanalyzer_1.ts.isArrowFunction(node) ||
            arkanalyzer_1.ts.isMethodDeclaration(node) ||
            arkanalyzer_1.ts.isGetAccessor(node) ||
            arkanalyzer_1.ts.isSetAccessor(node) ||
            arkanalyzer_1.ts.isConstructorDeclaration(node);
    }
    getAlwaysFixPositions(node) {
        if (node.parameters && node.parameters.length > 0) {
            return {
                stPos: node.parameters.pos - 1,
                stEnd: node.parameters.pos
            };
        }
        else {
            return {
                stPos: node.parameters ? node.parameters.pos - 1 : 0,
                stEnd: node.parameters ? node.parameters.end : 0
            };
        }
    }
    getNeverFixPositions(node) {
        if (node.name) {
            return {
                stPos: node.name.end,
                stEnd: node.parameters ? node.parameters.pos - 1 : 0
            };
        }
        else if (node.kind === arkanalyzer_1.ts.SyntaxKind.Constructor) {
            return {
                stPos: node.getStart() + 'constructor'.length,
                stEnd: node.parameters ? node.parameters.pos - 1 : 0
            };
        }
        else if (node.getText().startsWith('async')) {
            return {
                stPos: node.getStart() + 'async'.length,
                stEnd: node.parameters ? node.parameters.pos - 1 : 0
            };
        }
        else if (node.kind === arkanalyzer_1.ts.SyntaxKind.FunctionExpression) {
            return {
                stPos: node.getStart() + 'function'.length,
                stEnd: node.parameters ? node.parameters.pos - 1 : 0
            };
        }
        else {
            return {
                stPos: node.parameters ? node.parameters.pos - 1 : 0,
                stEnd: node.parameters ? node.parameters.pos - 1 : 0
            };
        }
    }
}
exports.SpaceBeforeFunctionParenCheck = SpaceBeforeFunctionParenCheck;
