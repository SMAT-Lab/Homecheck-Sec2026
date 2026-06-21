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
exports.NoExAssignCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
class NoExAssignCheck {
    CATCH_NAME = 'catch';
    THROW_NAME = 'throw ';
    rule;
    defects = [];
    issues = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-ex-assign.md',
        description: 'Disallow reassigning exceptions in `catch` clauses.',
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    check = (target) => {
        if (target instanceof arkanalyzer_1.ArkFile) {
            const myInvalidPositions = this.checkAction(target);
            myInvalidPositions.forEach((violation) => {
                violation.filePath = target.getFilePath();
                this.addIssueReport(violation);
            });
        }
    };
    checkAction(target) {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const violations = [];
        this.traverseNodes(sourceFile, (node) => {
            this.processCatchClause(node, violations, sourceFile);
        });
        return violations;
    }
    ;
    traverseNodes(node, callback) {
        if (!node) {
            return;
        }
        ;
        callback(node);
        arkanalyzer_1.ts.forEachChild(node, (child) => {
            this.traverseNodes(child, callback);
        });
    }
    ;
    processCatchClause(node, violations, sourceFile) {
        if (arkanalyzer_1.ts.isCatchClause(node)) {
            const { catchVariableText, destructuredVariables } = this.extractCatchVariables(node);
            node.block.statements.forEach((statement) => {
                this.checkStatement(statement, catchVariableText, destructuredVariables, sourceFile, violations);
            });
        }
    }
    ;
    extractCatchVariables(node) {
        const catchVariable = node.variableDeclaration?.name;
        const catchVariableText = catchVariable ? catchVariable.getText() : null;
        const destructuredVariables = new Set();
        if (catchVariable && arkanalyzer_1.ts.isObjectBindingPattern(catchVariable)) {
            for (const element of catchVariable.elements) {
                if (arkanalyzer_1.ts.isBindingElement(element) && arkanalyzer_1.ts.isIdentifier(element.name)) {
                    destructuredVariables.add(element.name.text);
                }
            }
        }
        else if (catchVariable && arkanalyzer_1.ts.isArrayBindingPattern(catchVariable)) {
            for (const element of catchVariable.elements) {
                if (arkanalyzer_1.ts.isBindingElement(element) && arkanalyzer_1.ts.isIdentifier(element.name)) {
                    destructuredVariables.add(element.name.text);
                }
            }
        }
        return { catchVariableText, destructuredVariables };
    }
    ;
    checkStatement(statement, catchVariableText, destructuredVariables, sourceFile, violations) {
        if (arkanalyzer_1.ts.isExpressionStatement(statement)) {
            const expression = statement.expression;
            let innerExpression = expression;
            if (arkanalyzer_1.ts.isParenthesizedExpression(expression)) {
                innerExpression = expression.expression;
            }
            // 例如：(e.g., ex = 0)
            this.checkIsExpression(innerExpression, catchVariableText, destructuredVariables, sourceFile, violations);
            // 例如： (e.g., [ex] = [])
            this.checkArrayDestructuring(innerExpression, catchVariableText, destructuredVariables, sourceFile, violations);
            //例如：({ x: ex = 0 } = {})
            this.checkObjectDestructuring(innerExpression, catchVariableText, destructuredVariables, sourceFile, violations);
        }
    }
    ;
    checkIsExpression(innerExpression, catchVariableText, destructuredVariables, sourceFile, violations) {
        if (arkanalyzer_1.ts.isBinaryExpression(innerExpression) && innerExpression.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            const left = innerExpression.left;
            if (arkanalyzer_1.ts.isIdentifier(left) && (left.text === catchVariableText || destructuredVariables.has(left.text))) {
                this.addViolation(left, sourceFile, violations);
            }
        }
    }
    ;
    checkArrayDestructuring(innerExpression, catchVariableText, destructuredVariables, sourceFile, violations) {
        if (arkanalyzer_1.ts.isBinaryExpression(innerExpression) && innerExpression.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            const left = innerExpression.left;
            this.checkArrayLiteralExpression(left, catchVariableText, destructuredVariables, sourceFile, violations);
        }
    }
    ;
    checkArrayLiteralExpression(left, catchVariableText, destructuredVariables, sourceFile, violations) {
        if (arkanalyzer_1.ts.isArrayLiteralExpression(left)) {
            left.elements.forEach((element) => {
                if (arkanalyzer_1.ts.isIdentifier(element) && (element.text === catchVariableText || destructuredVariables.has(element.text))) {
                    this.addViolation(element, sourceFile, violations);
                }
            });
        }
    }
    ;
    checkObjectDestructuring(innerExpression, catchVariableText, destructuredVariables, sourceFile, violations) {
        if (arkanalyzer_1.ts.isBinaryExpression(innerExpression) && innerExpression.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            const left = innerExpression.left;
            if (arkanalyzer_1.ts.isObjectLiteralExpression(left)) {
                left.properties.forEach((property) => {
                    this.checkObjectLiteralExpression(property, catchVariableText, destructuredVariables, sourceFile, violations);
                });
            }
        }
    }
    ;
    checkObjectLiteralExpression(property, catchVariableText, destructuredVariables, sourceFile, violations) {
        if (arkanalyzer_1.ts.isPropertyAssignment(property)) {
            const initializer = property.initializer;
            if (arkanalyzer_1.ts.isBinaryExpression(initializer) && initializer.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
                const leftIdentifier = initializer.left;
                if (arkanalyzer_1.ts.isIdentifier(leftIdentifier) && (leftIdentifier.text === catchVariableText ||
                    destructuredVariables.has(leftIdentifier.text))) {
                    this.addViolation(leftIdentifier, sourceFile, violations);
                }
            }
        }
    }
    ;
    addViolation(node, sourceFile, violations) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const endCharacter = node.getEnd();
        const endPosition = sourceFile.getLineAndCharacterOfPosition(endCharacter);
        violations.push({
            message: `Do not assign to the exception parameter`,
            line: line + 1,
            character: character + 1,
            endCharacter: endPosition.character + 1
        });
    }
    ;
    addIssueReport(violation) {
        this.metaData.description = violation.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(violation.line, violation.character, violation.endCharacter, this.metaData.description, severity, this.rule.ruleId, violation.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoExAssignCheck = NoExAssignCheck;
