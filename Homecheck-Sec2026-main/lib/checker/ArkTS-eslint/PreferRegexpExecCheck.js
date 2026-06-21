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
exports.PreferRegexpExecCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_1 = require("../../model/Defects");
const gMetaData = {
    severity: 3,
    ruleDocPath: "docs/prefer-regexp-exec.md",
    description: "Use the `RegExp#exec()` method instead.",
};
class PreferRegexpExecCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    isQuotedStringRege = /^(['"]).*\1$/;
    registerMatchers() {
        return [{
                matcher: { matcherType: Matchers_1.MatcherTypes.FILE },
                callback: this.check,
            }];
    }
    check = (target) => {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const filePath = target.getFilePath();
        this.checkForRegExpExec(sourceFile).forEach((loc) => {
            this.addIssueReportNodeFix(sourceFile, loc, filePath);
        });
    };
    checkForRegExpExec(sourceFile) {
        const issues = [];
        this.traverseAST(sourceFile, (node) => {
            if (this.isMatchCall(node)) {
                this.processMatchCall(node, sourceFile, issues);
            }
        });
        return issues;
    }
    traverseAST(sourceFile, visitor) {
        const visitNode = (node) => {
            visitor(node);
            lib_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
    }
    isMatchCall(node) {
        return lib_1.ts.isCallExpression(node) &&
            node.arguments.length === 1 &&
            lib_1.ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'match';
    }
    processMatchCall(node, sourceFile, issues) {
        const expression = node.expression;
        if (!this.isStringType(expression.expression)) {
            return;
        }
        const regexArg = node.arguments[0];
        if (this.shouldReportIssue(regexArg)) {
            issues.push(this.createLocationInfo(node, expression, regexArg, sourceFile));
        }
    }
    shouldReportIssue(regexArg) {
        return this.isRegExpType(regexArg) && !this.checkGlobalFlag(regexArg);
    }
    createLocationInfo(node, expression, regexArg, sourceFile) {
        const pos = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
        const endPos = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, node.getEnd());
        const matchPos = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, expression.name.getStart());
        return {
            fileName: sourceFile.fileName,
            line: pos.line + 1,
            startCol: pos.character + 1,
            endCol: endPos.character + 1,
            Qualifier: expression.name.text,
            object: expression.expression.getText(sourceFile),
            argument: regexArg.getText(sourceFile),
            matchStartCol: matchPos.character + 1
        };
    }
    isRegExpType(argNode) {
        if (lib_1.ts.isStringLiteral(argNode)) {
            try {
                new RegExp(argNode.text);
                return true;
            }
            catch {
                return false;
            }
        }
        if (lib_1.ts.isRegularExpressionLiteral(argNode))
            return true;
        const resolveRegExpCreation = (node, depth = 0) => {
            if (depth > 5) {
                return false;
            }
            if (lib_1.ts.isNewExpression(node) && node.expression.getText() === 'RegExp') {
                return true;
            }
            if (lib_1.ts.isIdentifier(node)) {
                const declaration = this.findVariableDeclaration(node.text, node);
                return declaration ? this.checkRegExpDeclaration(declaration, depth + 1) : false;
            }
            if (lib_1.ts.isParenthesizedExpression(node)) {
                return resolveRegExpCreation(node.expression, depth + 1);
            }
            return false;
        };
        return resolveRegExpCreation(argNode);
    }
    checkRegExpDeclaration(declaration, depth) {
        if (lib_1.ts.isVariableDeclaration(declaration)) {
            return declaration.initializer ?
                this.checkRegExpInitializer(declaration.initializer, depth) :
                declaration.type?.getText() === 'RegExp';
        }
        if (lib_1.ts.isParameter(declaration)) {
            return false;
        }
        return false;
    }
    checkRegExpInitializer(initializer, depth) {
        if (lib_1.ts.isRegularExpressionLiteral(initializer)) {
            return true;
        }
        if (lib_1.ts.isNewExpression(initializer) &&
            initializer.expression.getText() === 'RegExp') {
            return true;
        }
        if (lib_1.ts.isIdentifier(initializer)) {
            return this.checkRegExpDeclaration(initializer, depth + 1);
        }
        if (lib_1.ts.isStringLiteral(initializer)) {
            return true;
        }
        return false;
    }
    checkGlobalFlag(regexArg) {
        // 处理正则表达式字面量
        if (lib_1.ts.isRegularExpressionLiteral(regexArg)) {
            return this.checkFlags(regexArg);
        }
        // 处理变量声明的情况
        if (lib_1.ts.isIdentifier(regexArg)) {
            return this.handleIdentifier(regexArg);
        }
        // 处理RegExp构造函数调用
        if (lib_1.ts.isCallExpression(regexArg) && this.isRegExpConstructorCall(regexArg)) {
            return this.handleCallExpression(regexArg);
        }
        // 处理new RegExp的情况
        if (lib_1.ts.isNewExpression(regexArg) && this.isRegExpNewExpression(regexArg)) {
            return this.handleNewExpression(regexArg);
        }
        return false;
    }
    checkFlags(node) {
        if (lib_1.ts.isParameter(node)) {
            return true;
        }
        const extractFlags = (n) => {
            if (lib_1.ts.isRegularExpressionLiteral(n)) {
                const text = n.getText();
                return text.slice(text.lastIndexOf('/') + 1);
            }
            if (lib_1.ts.isStringLiteral(n)) {
                try {
                    const parts = n.text.split('/');
                    return parts.length > 1 ? parts.pop() : '';
                }
                catch {
                    return '';
                }
            }
            return n.getText();
        };
        const hasG = lib_1.ts.isStringLiteral(node) ?
            node.text.includes('g') :
            extractFlags(node).includes('g');
        return hasG;
    }
    checkFlagsVariable(node) {
        if (lib_1.ts.isParameter(node)) {
            return true;
        }
        const extractFlags = (n) => {
            if (lib_1.ts.isRegularExpressionLiteral(n)) {
                const text = n.getText();
                return text.slice(text.lastIndexOf('/') + 1);
            }
            if (lib_1.ts.isStringLiteral(n)) {
                try {
                    const parts = n.text.split('/');
                    return parts.length > 1 ? parts.pop() : '';
                }
                catch {
                    return '';
                }
            }
            return n.getText();
        };
        const hasV = lib_1.ts.isStringLiteral(node) ?
            node.text.includes('g') :
            extractFlags(node).includes('g') || extractFlags(node).includes('v');
        return hasV;
    }
    handleIdentifier(regexArg) {
        const declaration = this.findVariableDeclaration(regexArg.text, regexArg);
        return declaration && lib_1.ts.isVariableDeclaration(declaration) ?
            this.checkFlagsVariable(declaration.initializer ?? declaration) :
            false;
    }
    handleCallExpression(expr) {
        const flagsNode = expr.arguments?.[1];
        return flagsNode ? this.checkFlags(flagsNode) : false;
    }
    handleNewExpression(expr) {
        const flagsNode = expr.arguments?.[1];
        return flagsNode && lib_1.ts.isStringLiteral(flagsNode) ?
            flagsNode.text.includes('g') :
            false;
    }
    isRegExpConstructorCall(expr) {
        return lib_1.ts.isIdentifier(expr.expression) &&
            expr.expression.text === 'RegExp';
    }
    isRegExpNewExpression(expr) {
        return expr.expression.getText() === 'RegExp' &&
            (expr.arguments?.length ?? 0) >= 2;
    }
    findVariableDeclaration(varName, currentNode) {
        let scopeNode = currentNode;
        while (scopeNode) {
            const declaration = this.findInCurrentScope(varName, scopeNode);
            if (declaration) {
                return declaration;
            }
            ;
            scopeNode = this.getParentScope(scopeNode);
        }
        return undefined;
    }
    findInCurrentScope(varName, scopeNode) {
        let declaration;
        const deepSearch = (node) => {
            this.checkFunctionParameters(node, varName, d => declaration = d);
            this.checkVariableDeclarations(node, varName, d => declaration = d);
            lib_1.ts.forEachChild(node, deepSearch);
        };
        deepSearch(scopeNode);
        return declaration;
    }
    checkFunctionParameters(node, varName, onFound) {
        if (!lib_1.ts.isFunctionLike(node)) {
            return;
        }
        node.parameters.forEach(param => {
            if (lib_1.ts.isIdentifier(param.name) && param.name.text === varName) {
                onFound(param);
            }
        });
    }
    checkVariableDeclarations(node, varName, onFound) {
        if (!lib_1.ts.isVariableStatement(node)) {
            return;
        }
        node.declarationList.declarations.forEach(decl => {
            if (lib_1.ts.isIdentifier(decl.name) && decl.name.text === varName) {
                onFound(decl);
            }
        });
    }
    getParentScope(node) {
        let parent = node.parent;
        while (parent) {
            if (lib_1.ts.isBlock(parent) ||
                lib_1.ts.isFunctionLike(parent) ||
                lib_1.ts.isSourceFile(parent)) {
                return parent;
            }
            parent = parent.parent;
        }
        return undefined;
    }
    ruleFix(sourceFile, loc) {
        const [start, end] = this.getFixRange(sourceFile, loc);
        let fixText = '';
        if (!this.isSlashWrappedString(loc.argument)) {
            if (this.isQuotedString(loc.argument)) {
                let arg = this.escapeSlashesInQuotedString(loc.argument);
                fixText = `/${arg}/.exec(${loc.object})`;
            }
            else {
                fixText = `${loc.argument}.exec(${loc.object})`;
            }
        }
        else if (this.isSlashWrappedString(loc.argument)) {
            fixText = `${loc.argument}.exec(${loc.object})`;
        }
        return { range: [start, end], text: fixText };
    }
    escapeSlashesInQuotedString(str) {
        const content = str.slice(1, -1);
        const escapedContent = content.replace(/(?<!\\)\//g, '\\/');
        return `${escapedContent}`;
    }
    isSlashWrappedString(str) {
        return /^\/.+\/$/.test(str);
    }
    isQuotedString(str) {
        let isQuotedString = this.isQuotedStringRege.test(str);
        return isQuotedString;
    }
    getFixRange(sourceFile, loc) {
        const startPosition = sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.startCol - 1);
        const endPosition = sourceFile.getPositionOfLineAndCharacter(loc.line - 1, loc.endCol - 1);
        return [startPosition, endPosition];
    }
    isStringType(expr) {
        if (lib_1.ts.isStringLiteral(expr)) {
            return true;
        }
        if (lib_1.ts.isTemplateExpression(expr)) {
            return true;
        }
        ;
        if (lib_1.ts.isIdentifier(expr)) {
            const declaration = this.findVariableDeclaration(expr.text, expr);
            return declaration ? this.checkStringDeclaration(declaration) : false;
        }
        return false;
    }
    checkStringDeclaration(decl) {
        if (lib_1.ts.isVariableDeclaration(decl)) {
            return decl.initializer ?
                lib_1.ts.isStringLiteral(decl.initializer) :
                /(^|&\s*)string($|\s*&)/.test(this.resolveTypeAlias(decl.type?.getText() || '', decl)) ||
                    /^('.*'|".*")(\s*\|\s*('.*'|".*"))*$/.test(decl.type?.getText() || '');
        }
        if (lib_1.ts.isParameter(decl)) {
            const typeText = decl.type?.getText() || '';
            const resolvedType = this.resolveTypeAlias(typeText, decl);
            return /(^|&\s*)string($|\s*&)/.test(resolvedType) ||
                /^(string|('.*'|".*")(\s*\|\s*('.*'|".*"))*)$/.test(resolvedType);
        }
        return false;
    }
    resolveTypeAlias(typeName, node) {
        let actualType = typeName;
        const sourceFile = node.getSourceFile();
        const findTypeDeclaration = (root) => {
            lib_1.ts.forEachChild(root, child => {
                if (lib_1.ts.isTypeParameterDeclaration(child) && child.name.text === typeName) {
                    actualType = child.constraint?.getText(sourceFile) || typeName;
                }
                else if (lib_1.ts.isTypeAliasDeclaration(child) && child.name.text === typeName) {
                    actualType = child.type.getText(sourceFile);
                }
                findTypeDeclaration(child);
            });
        };
        if (sourceFile) {
            findTypeDeclaration(sourceFile);
        }
        if (actualType !== typeName && !/\bstring\b/.test(actualType)) {
            return this.resolveTypeAlias(actualType, node);
        }
        return actualType;
    }
    addIssueReportNodeFix(sourceFile, loc, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(loc.line, loc.matchStartCol, loc.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        let fix = this.ruleFix(sourceFile, loc);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.PreferRegexpExecCheck = PreferRegexpExecCheck;
