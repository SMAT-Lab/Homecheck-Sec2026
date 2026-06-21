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
exports.UseIsNaNCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'UseIsNaNCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/use-isnan.md',
    description: 'Require calls to `isNaN()` when checking for `NaN`',
};
function isSpecificId(node, name) {
    return arkanalyzer_1.ts.isIdentifier(node) && node.text === name;
}
function isSpecificMemberAccess(node, objectName, propertyName) {
    return (arkanalyzer_1.ts.isPropertyAccessExpression(node) &&
        arkanalyzer_1.ts.isIdentifier(node.expression) && node.expression.text === objectName &&
        arkanalyzer_1.ts.isIdentifier(node.name) && node.name.text === propertyName) ||
        (arkanalyzer_1.ts.isElementAccessExpression(node) &&
            arkanalyzer_1.ts.isIdentifier(node.expression) && node.expression.text === objectName &&
            arkanalyzer_1.ts.isStringLiteral(node.argumentExpression) && node.argumentExpression.text === propertyName);
}
function isNaNIdentifier(node) {
    if (arkanalyzer_1.ts.isParenthesizedExpression(node)) {
        let express = node.expression;
        if (arkanalyzer_1.ts.isBinaryExpression(express)) {
            return isNaNIdentifier(express.right);
        }
        return isNaNIdentifier(express);
    }
    return isSpecificId(node, 'NaN') || isSpecificMemberAccess(node, 'Number', 'NaN');
}
function containsNaN(node) {
    if (isNaNIdentifier(node)) {
        return true;
    }
    if (arkanalyzer_1.ts.isParenthesizedExpression(node)) {
        return containsNaN(node.expression);
    }
    if (arkanalyzer_1.ts.isBinaryExpression(node) && node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.CommaToken) {
        return containsNaN(node.right);
    }
    if (arkanalyzer_1.ts.isCommaListExpression(node)) {
        return node.elements.some(element => containsNaN(element));
    }
    return false;
}
class ReportBean {
    line;
    character;
    message;
    sourceCode;
}
const operator = /^(?:[<>]|[!=]=)=?$/u;
class UseIsNaNCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    defalutOptions = [{ enforceForSwitchCase: true, enforceForIndexOf: false }];
    options;
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
     * 检查 TypeScript 代码中是否正确使用 isNaN 或 Number.isNaN 来检查 NaN
     * @param code 要检查的 TypeScript 代码
     * @returns 包含错误位置的对象数组
     */
    checkUseIsNaN(sourceFile) {
        const errorPositions = [];
        this.checkNode(sourceFile, sourceFile, errorPositions);
        return errorPositions;
    }
    checkNode(node, sourceFile, errorPositions) {
        const enforceForIndexOf = this.options.enforceForIndexOf ?? false;
        const enforceForSwitchCase = this.options.enforceForSwitchCase ?? true;
        if (arkanalyzer_1.ts.isBinaryExpression(node)) {
            const left = node.left;
            const right = node.right;
            if ((isNaNIdentifier(left) || isNaNIdentifier(right)) && operator.test(node.operatorToken.getText())) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                errorPositions.push({
                    line: line + 1, character: character + 1,
                    message: 'Use the isNaN function to compare with NaN', sourceCode: node.getText()
                });
            }
        }
        if (enforceForSwitchCase && arkanalyzer_1.ts.isSwitchStatement(node)) {
            this.checkSwitchCase(node, sourceFile, errorPositions);
        }
        if (enforceForIndexOf && arkanalyzer_1.ts.isCallExpression(node)) {
            this.checkEnforceForIndexOf(node, sourceFile, errorPositions);
        }
        arkanalyzer_1.ts.forEachChild(node, (node) => this.checkNode(node, sourceFile, errorPositions));
    }
    checkSwitchCase(node, sourceFile, errorPositions) {
        if (isNaNIdentifier(node.expression)) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            errorPositions.push({
                line: line + 1, character: character + 1,
                message: "'switch(NaN)' can never match a case clause. Use Number.isNaN instead of the switch", sourceCode: node.getText()
            });
        }
        for (const switchCase of node.caseBlock.clauses) {
            if (switchCase.expression && isNaNIdentifier(switchCase.expression)) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(switchCase.getStart());
                errorPositions.push({
                    line: line + 1, character: character + 1,
                    message: "'case NaN' can never match. Use Number.isNaN before the switch", sourceCode: node.getText()
                });
            }
        }
    }
    checkEnforceForIndexOf(node, sourceFile, errorPositions) {
        const expression = node.expression;
        const callee = arkanalyzer_1.ts.isParenthesizedExpression(expression) ? expression.expression : expression;
        if (arkanalyzer_1.ts.isPropertyAccessExpression(callee) || arkanalyzer_1.ts.isElementAccessExpression(callee)) {
            const methodName = arkanalyzer_1.ts.isPropertyAccessExpression(callee) ? callee.name.text :
                arkanalyzer_1.ts.isElementAccessExpression(callee) && arkanalyzer_1.ts.isStringLiteral(callee.argumentExpression) ?
                    callee.argumentExpression.text : null;
            if (methodName) {
                this.checkIndexOf(methodName, node, sourceFile, errorPositions);
            }
        }
    }
    checkIndexOf(methodName, node, sourceFile, errorPositions) {
        if (['indexOf', 'lastIndexOf'].includes(methodName) &&
            (node.arguments.length > 0 && node.arguments.length <= 2 && isNaNIdentifier(node.arguments[0]))) {
            this.checkIndexOfTraversal(methodName, node, sourceFile, errorPositions);
        }
    }
    checkIndexOfTraversal(methodName, node, sourceFile, errorPositions) {
        for (const arg of node.arguments) {
            if (containsNaN(arg)) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                errorPositions.push({
                    line: line + 1, character: character + 1,
                    message: `Array prototype method '${methodName}' cannot find NaN.`, sourceCode: node.getText()
                });
                break;
            }
        }
    }
    getOption = (rule) => {
        let option = this.defalutOptions[0];
        if (rule && rule.option[0]) {
            option = rule.option[0];
        }
        return option;
    };
    check = (target) => {
        // Assuming getCode() returns the code as a string
        // 检查整个文件中是否使用了 isNaN 或 Number.isNaN
        this.options = this.getOption(this.rule);
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const errorPositions = this.checkUseIsNaN(sourceFile);
        for (const position of errorPositions) {
            this.addIssueReport(target, position.line, position.character, position.sourceCode, position.message);
        }
    };
    addIssueReport(arkFile, lineNum, startColum, code, message) {
        let filePath = arkFile.getFilePath();
        let endColum = startColum + code.length - 1;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(lineNum, startColum, endColum, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.UseIsNaNCheck = UseIsNaNCheck;
