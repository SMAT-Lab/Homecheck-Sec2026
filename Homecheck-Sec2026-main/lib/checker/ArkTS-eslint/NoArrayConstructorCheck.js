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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoArrayConstructorCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
class NoArrayConstructorCheck {
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-array-constructor.md',
        description: 'The array literal notation [] is preferable'
    };
    defects = [];
    issues = [];
    rule;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    ;
    check = (target) => {
        if (target instanceof lib_1.ArkFile) {
            this.checkArray(target);
        }
    };
    checkArray(arkFile) {
        const methodAst = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const visitNode = (node) => {
            if (lib_1.ts.isArrowFunction(node) || lib_1.ts.isFunctionDeclaration(node)) { // 过滤特殊语句
                const hasArrayParam = node.parameters.some(param => {
                    return lib_1.ts.isIdentifier(param.name) && param.name.text === 'Array';
                });
                // 直接返回，因为这里的 Array 是参数，不是全局的 Array 构造函数
                if (hasArrayParam) {
                    return;
                }
                ;
            }
            if (lib_1.ts.isNewExpression(node) || lib_1.ts.isCallExpression(node)) {
                this.checkNewAndCallExpression(node, methodAst, arkFile);
            }
            ;
            lib_1.ts.forEachChild(node, visitNode);
        };
        lib_1.ts.forEachChild(methodAst, visitNode);
    }
    ;
    checkNewAndCallExpression(node, methodAst, arkFile) {
        const callee = node.expression;
        // 跳过泛型检测 new Array<Foo>() 或 Array<Foo>()
        if ((lib_1.ts.isNewExpression(node) || lib_1.ts.isCallExpression(node)) &&
            node.typeArguments && // 检测泛型参数
            lib_1.ts.isIdentifier(callee) &&
            callee.text === 'Array') {
            return;
        }
        ;
        if (lib_1.ts.isCallExpression(node) &&
            node.questionDotToken &&
            (lib_1.ts.isIdentifier(callee) || lib_1.ts.isPropertyAccessExpression(callee))) {
            //跳过 Array?.(x, y);
            if (node.arguments.length > 1) {
                return;
            }
            ;
        }
        if (lib_1.ts.isParenthesizedExpression(callee)) {
            const innerExpression = callee.expression;
            if (lib_1.ts.isIdentifier(innerExpression) && innerExpression.text === 'Array') {
                this.createIssue(node, methodAst, arkFile);
            }
            ;
        }
        else if (lib_1.ts.isIdentifier(callee) && callee.text === 'Array') {
            this.checkGlobalArray(node, methodAst, arkFile);
        }
    }
    ;
    checkGlobalArray(node, methodAst, arkFile) {
        const callee = node.expression;
        const isGlobalArray = !this.isInLocalScope(callee, methodAst);
        if (isGlobalArray) {
            if (!node.arguments || node.arguments.length === 0) {
                if (lib_1.ts.isArrowFunction(node) || lib_1.ts.isFunctionDeclaration(node)) {
                    return;
                }
                ;
                this.createIssue(node, methodAst, arkFile);
            }
            else if (node.arguments.length === 1) {
                const arg = node.arguments[0];
                if ((lib_1.ts.isSpreadElement(arg) && arg.getText().includes('...'))) {
                    this.createIssue(node, methodAst, arkFile);
                }
            }
            else {
                this.createIssue(node, methodAst, arkFile); // Array(x, y, z) 或 new Array(x, y, z)，多个参数
            }
        }
    }
    ;
    createIssue(node, methodAst, arkFile) {
        const start = node.getStart(methodAst);
        const { line, character } = methodAst.getLineAndCharacterOfPosition(start);
        const issue = {
            line: line + 1,
            column: character + 1,
            columnEnd: character + 1 + (node.getEnd() - start),
            message: `The array literal notation [] is preferable`,
            filePath: arkFile.getFilePath()
        };
        this.addIssueReport(issue);
    }
    ;
    isInLocalScope(node, sourceFile) {
        let current = node.parent;
        while (current) {
            if (lib_1.ts.isNewExpression(current)) {
                if (current.expression.getText() === 'Array' && current.arguments === undefined) {
                    return false;
                }
                ;
            }
            ;
            if (lib_1.ts.isVariableDeclaration(current) && current.name === node) {
                return true;
            }
            if (lib_1.ts.isFunctionDeclaration(current) || lib_1.ts.isModuleDeclaration(current)) {
                break;
            }
            current = current.parent;
        }
        return false;
    }
    ;
    addIssueReport(issue) {
        this.metaData.description = issue.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defects = new Defects_1.Defects(issue.line, issue.column, issue.columnEnd, this.metaData.description, severity, this.rule.ruleId, issue.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
    ;
}
exports.NoArrayConstructorCheck = NoArrayConstructorCheck;
