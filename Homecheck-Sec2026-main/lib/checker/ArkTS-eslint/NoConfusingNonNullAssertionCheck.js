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
exports.NoConfusingNonNullAssertionCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoConfusingNonNullAssertionCheck');
class NoConfusingNonNullAssertionCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-confusing-non-null-assertion.md',
        description: 'Confusing combinations of non-null assertion and equal test like "a! == b", which looks very similar to not equal "a !== b',
    };
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcher];
    }
    check = (targetField) => {
        const filePath = targetField.getFilePath();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        this.checkConfusingNonNullAssertion(sourceFile).forEach((item) => {
            this.addIssueReport(item.line, item.character, item.endCol, filePath, item.message);
        });
    };
    checkConfusingNonNullAssertion(sourceFile) {
        const results = [];
        const visit = (node) => {
            if (lib_1.ts.isBinaryExpression(node)) {
                this.handleBinaryExpression(node, sourceFile, results);
            }
            lib_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return results;
    }
    getNextToken(token, sourceFile) {
        if (!token) {
            return undefined;
        }
        const scanner = lib_1.ts.createScanner(lib_1.ts.ScriptTarget.Latest, false, lib_1.ts.LanguageVariant.Standard, sourceFile.text);
        scanner.setTextPos(token.end);
        while (true) {
            const tokenSyntaxKind = scanner.scan();
            if (tokenSyntaxKind === lib_1.ts.SyntaxKind.EndOfFileToken) {
                break;
            }
            const nextTokenStart = scanner.getTokenPos();
            const nextTokenEnd = scanner.getTextPos();
            const nextTokenText = sourceFile.text.substring(nextTokenStart, nextTokenEnd);
            if (!/\s/.test(nextTokenText) && !this.isComment(nextTokenText)) {
                return this.findNodeAtPosition(sourceFile, nextTokenStart, nextTokenEnd);
            }
        }
        return undefined;
    }
    findNodeAtPosition(sourceFile, start, end) {
        let result = undefined;
        lib_1.ts.forEachChild(sourceFile, node => {
            if (node.pos <= start && node.end >= end) {
                result = node;
            }
        });
        return result;
    }
    isComment(text) {
        return /\/\*[\s\S]*?\*\/|\/\/.*/.test(text);
    }
    handleBinaryExpression(node, sourceFile, results) {
        const operator = node.operatorToken.getText();
        if (!this.isTargetOperator(operator)) {
            return;
        }
        const isAssign = operator === '=';
        const leftHandFinalToken = node.left.getLastToken();
        const tokenAfterLeft = this.getNextToken(leftHandFinalToken, sourceFile);
        if (this.hasConfusingExclamation(leftHandFinalToken, tokenAfterLeft)) {
            this.processExpression(node, sourceFile, results, isAssign);
        }
    }
    isTargetOperator(operator) {
        return ['==', '===', '='].includes(operator);
    }
    hasConfusingExclamation(leftHandFinalToken, tokenAfterLeft) {
        return leftHandFinalToken?.kind === lib_1.ts.SyntaxKind.ExclamationToken &&
            tokenAfterLeft?.kind !== lib_1.ts.SyntaxKind.CloseParenToken;
    }
    processExpression(node, sourceFile, results, isAssign) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { character: endChar } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        // 修改检测逻辑：检查左侧表达式是否包含非空断言
        const result = this.containsNonNullAssertion(node.left)
            ? this.createPrimaryExpressionResult(line, character, endChar, isAssign)
            : this.createFallbackResult(line, character, endChar);
        results.push(result);
    }
    // 新增辅助方法：递归检查表达式中的非空断言
    containsNonNullAssertion(node) {
        if (lib_1.ts.isNonNullExpression(node)) {
            return true;
        }
        return node.getChildren().some(child => this.containsNonNullAssertion(child));
    }
    createPrimaryExpressionResult(line, char, endChar, isAssign) {
        return {
            line: line + 1,
            character: char + 1,
            endCol: endChar + 1,
            message: this.getPrimaryExpressionMessage(isAssign)
        };
    }
    createFallbackResult(line, char, endChar) {
        return {
            line: line + 1,
            character: char + 1,
            endCol: endChar + 1,
            message: 'Wrap up left hand to avoid putting non-null assertion "!" and "=" together.'
        };
    }
    getPrimaryExpressionMessage(isAssign) {
        return isAssign
            ? 'Confusing combinations of non-null assertion and equal test like "a! = b", which looks very similar to not equal "a != b".'
            : 'Confusing combinations of non-null assertion and equal test like "a! == b", which looks very similar to not equal "a !== b".';
    }
    async addIssueReport(line, startCol, endCol, filePath, description) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line, startCol, endCol, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoConfusingNonNullAssertionCheck = NoConfusingNonNullAssertionCheck;
