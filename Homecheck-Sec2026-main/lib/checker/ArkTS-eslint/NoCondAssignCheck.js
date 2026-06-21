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
exports.NoCondAssignCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoCondAssignCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-cond-assign.md",
    description: "Disallow assignment operators in conditional expressions.",
};
class NoCondAssignCheck {
    defects = [];
    issues = [];
    metaData = gMetaData;
    rule;
    defualtOption = "except-parens";
    option = this.defualtOption;
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
     * 判断 TypeScript 代码中条件表达式的合法性，并返回不合法的行列号和错误信息
     * @param sourceFile 要检查的 TypeScript 代码
     * @param mode 检查模式，"always" 表示任何赋值都是错误的，其他模式表示仅当赋值括在括号中时才允许
     * @returns 包含不合法条件表达式位置和错误信息的对象数组
     */
    checkConditionValidity(sourceFile, mode) {
        const invalidPositions = [];
        this.traverseNodes(sourceFile, mode, invalidPositions);
        return invalidPositions;
    }
    traverseNodes(sourceFile, mode, invalidPositions) {
        const checkNode = (node) => {
            if (this.isConditionalStatement(node)) {
                const condition = this.getCondition(node);
                if (!condition) {
                    return;
                }
                if (mode === 'always' && this.containsEqualsSign(condition)) {
                    const containsEqualsSignNode = this.findContainsEqualsSignNode(condition);
                    this.addInvalidPosition(sourceFile, containsEqualsSignNode, invalidPositions, `Unexpected assignment within a '${this.getConditionalType(node)}' statement`);
                }
                else if (this.isInvalidAssignment(condition)) {
                    const containsEqualsSignNode = this.findContainsEqualsSignNode(condition);
                    this.addInvalidPosition(sourceFile, containsEqualsSignNode, invalidPositions, 'Expected a conditional expression and instead saw an assignment');
                }
            }
            arkanalyzer_1.ts.forEachChild(node, checkNode);
        };
        checkNode(sourceFile);
    }
    findContainsEqualsSignNode(node) {
        if (arkanalyzer_1.ts.isBinaryExpression(node) &&
            (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.PlusEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.MinusEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AsteriskEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.SlashEqualsToken)) {
            return node;
        }
        let cNode = node;
        const findNode = (node) => {
            if (arkanalyzer_1.ts.isBinaryExpression(node) &&
                (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken ||
                    node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.PlusEqualsToken ||
                    node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.MinusEqualsToken ||
                    node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AsteriskEqualsToken ||
                    node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.SlashEqualsToken)) {
                cNode = node;
                return;
            }
            arkanalyzer_1.ts.forEachChild(node, findNode);
        };
        arkanalyzer_1.ts.forEachChild(cNode, findNode);
        return cNode;
    }
    isConditionalStatement(node) {
        return arkanalyzer_1.ts.isIfStatement(node) ||
            arkanalyzer_1.ts.isForStatement(node) ||
            arkanalyzer_1.ts.isWhileStatement(node) ||
            arkanalyzer_1.ts.isConditionalExpression(node) ||
            arkanalyzer_1.ts.isDoStatement(node);
    }
    getCondition(node) {
        if (arkanalyzer_1.ts.isIfStatement(node) || arkanalyzer_1.ts.isWhileStatement(node) || arkanalyzer_1.ts.isDoStatement(node)) {
            return node.expression;
        }
        else if (arkanalyzer_1.ts.isForStatement(node) || arkanalyzer_1.ts.isConditionalExpression(node)) {
            return node.condition;
        }
        return undefined;
    }
    containsEqualsSign(condition) {
        const conditionText = condition.getText();
        const equalsRegex = /(?<![=!])=(?!=)/;
        return equalsRegex.test(conditionText);
    }
    isInvalidAssignment(condition) {
        if (arkanalyzer_1.ts.isConditionalExpression(condition.parent) && arkanalyzer_1.ts.isParenthesizedExpression(condition)) {
            const realCondition = condition.expression;
            return (arkanalyzer_1.ts.isBinaryExpression(realCondition) &&
                (realCondition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken ||
                    realCondition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.PlusEqualsToken ||
                    realCondition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.MinusEqualsToken ||
                    realCondition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AsteriskEqualsToken ||
                    realCondition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.SlashEqualsToken));
        }
        return (arkanalyzer_1.ts.isBinaryExpression(condition) &&
            (condition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken ||
                condition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.PlusEqualsToken ||
                condition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.MinusEqualsToken ||
                condition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AsteriskEqualsToken ||
                condition.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.SlashEqualsToken) &&
            !arkanalyzer_1.ts.isParenthesizedExpression(condition.parent));
    }
    addInvalidPosition(sourceFile, node, invalidPositions, message) {
        const { line: startLine, character: startCol } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine, character: endCol } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        invalidPositions.push({
            line: startLine + 1,
            startCol: startCol + 1,
            endCol: endCol + 1,
            message,
        });
    }
    getConditionalType(node) {
        if (arkanalyzer_1.ts.isIfStatement(node)) {
            return 'if';
        }
        if (arkanalyzer_1.ts.isForStatement(node)) {
            return 'for';
        }
        if (arkanalyzer_1.ts.isWhileStatement(node)) {
            return 'while';
        }
        if (arkanalyzer_1.ts.isDoStatement(node)) {
            return 'do...while';
        }
        return 'unknown';
    }
    check = (target) => {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (this.rule.option && this.rule.option && this.rule.option[0]) {
            this.option = this.rule.option[0];
        }
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const myInvalidPositions = this.checkConditionValidity(sourceFile, this.option);
        myInvalidPositions.forEach(pos => {
            this.addIssueReport(pos, severity, target.getFilePath());
        });
    };
    addIssueReport(pos, severity, filePath) {
        let defects = new Defects_1.Defects(pos.line, pos.startCol, pos.endCol, pos.message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
}
exports.NoCondAssignCheck = NoCondAssignCheck;
