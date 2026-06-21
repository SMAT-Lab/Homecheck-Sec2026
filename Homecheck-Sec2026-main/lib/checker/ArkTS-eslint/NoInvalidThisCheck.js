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
exports.NoInvalidThisCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoInvalidThisCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-invalid-this.md",
    description: "Disallow `this` keywords outside of classes or class-like objects",
};
class NoInvalidThisCheck {
    codeFix(arkFile, fixKey) {
        throw new Error("Method not implemented.");
    }
    issues = [];
    defects = [];
    metaData = gMetaData;
    rule;
    defaultOption = { "capIsConstructor": true };
    option = this.defaultOption;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (target) => {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (this.rule && this.rule.option && this.rule.option[0]) {
            this.option = this.rule.option[0];
            if (this.option.capIsConstructor === undefined) {
                this.option.capIsConstructor = true;
            }
        }
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const findThisReturnNode = (node) => {
            if (this.nodeContainsThisKeyword(node)) {
                if (!this.isThisValid(node)) {
                    const pos = this.getLineAndColumn(node, 'this');
                    const message = "Unexpected 'this'.";
                    this.addIssueReport(pos, severity, message);
                }
            }
            arkanalyzer_1.ts.forEachChild(node, findThisReturnNode);
        };
        arkanalyzer_1.ts.forEachChild(sourceFile, findThisReturnNode);
    };
    /**
     * this关键字是否在有效的上下文中
     * @param node
     * @returns
     */
    isThisValid(node) {
        if (this.isNodeInTopLevel(node.parent)) {
            return true;
        }
        if (this.isNodeInClassFieldInitializer(node)) {
            return true;
        }
        if (this.isNodeInClassStaticBlock(node)) {
            return true;
        }
        if (this.isValidFunctionContext(node)) {
            return true;
        }
        if (this.isConstructorFunction(node)) {
            return true;
        }
        if (this.isThisInFunctionWithThisParam(node)) {
            return true;
        }
        if (this.isNodeInObjectMethod(node)) {
            return true;
        }
        if (this.isNodeInTryCatchInTopLevel(node)) {
            return true;
        }
        return false;
    }
    // 在try...catch...,在顶层作用域中
    isNodeInTryCatchInTopLevel(node) {
        let current = node;
        while (current) {
            if ((arkanalyzer_1.ts.isTryStatement(current) ||
                arkanalyzer_1.ts.isForStatement(current) ||
                arkanalyzer_1.ts.isForOfStatement(current) ||
                arkanalyzer_1.ts.isForInStatement(current)) &&
                this.isNodeInTopLevel(current)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    // 在顶层作用域中
    isNodeInTopLevel(node) {
        let current = node;
        while (current) {
            if (arkanalyzer_1.ts.isBlock(current)) {
                return false;
            }
            current = current.parent;
        }
        return true;
    }
    // 在类字段初始化器中
    isNodeInClassFieldInitializer(node) {
        let current = node;
        while (current) {
            if (arkanalyzer_1.ts.isPropertyDeclaration(current) && current.initializer === node) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    // 在类静态块中
    isNodeInClassStaticBlock(node) {
        let current = node;
        while (current) {
            if (arkanalyzer_1.ts.isClassStaticBlockDeclaration(current)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    // 在类方法中
    isValidFunctionContext(node) {
        if (!node.parent) {
            return false;
        }
        if (this.checkCallApplyBindContext(node)) {
            return true;
        }
        if (this.checkArrayMethodContext(node)) {
            return true;
        }
        if (this.checkJsDocThisTag(node)) {
            return true;
        }
        return this.isValidFunctionContext(node.parent);
    }
    // 提取 call/apply/bind 逻辑
    checkCallApplyBindContext(node) {
        if (!arkanalyzer_1.ts.isCallExpression(node)) {
            return false;
        }
        const propAccess = node.expression;
        if (!['call', 'apply', 'bind'].includes(propAccess?.name?.escapedText?.toString() ?? '')) {
            return false;
        }
        return !this.isNullOrUndefinedArg(node.arguments[0]);
    }
    // 提取数组方法逻辑
    checkArrayMethodContext(node) {
        if (!arkanalyzer_1.ts.isCallExpression(node) || !arkanalyzer_1.ts.isPropertyAccessExpression(node.expression)) {
            return false;
        }
        const arrayMethods = ['forEach', 'map', 'filter', 'reduce', 'some', 'every', 'from', 'find', 'findIndex'];
        const methodName = node.expression.name.escapedText?.toString();
        if (!arrayMethods.includes(methodName ?? '') || node.arguments.length <= 1) {
            return false;
        }
        if (methodName === 'from' && node.arguments.length < 3) {
            return false;
        }
        return !this.isNullOrUndefinedArg(node.arguments[node.arguments.length - 1]);
    }
    // 提取 JSDoc 检查逻辑
    checkJsDocThisTag(node) {
        if (!arkanalyzer_1.ts.isFunctionDeclaration(node) && !arkanalyzer_1.ts.isFunctionExpression(node)) {
            return false;
        }
        // 官方 JSDoc 标签检查
        const hasOfficialTag = arkanalyzer_1.ts.getJSDocTags(node).some(tag => tag.tagName?.kind === arkanalyzer_1.ts.SyntaxKind.Identifier && tag.tagName.escapedText === 'this');
        if (hasOfficialTag) {
            return true;
        }
        // 非标准注释检查
        return this.checkNonStandardThisTag(node);
    }
    // 通用参数校验方法
    isNullOrUndefinedArg(arg) {
        return arg?.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword ||
            arg?.kind === arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword ||
            arg?.getText() === 'undefined' ||
            arg?.kind === arkanalyzer_1.ts.SyntaxKind.VoidKeyword ||
            arkanalyzer_1.ts.isVoidExpression(arg);
    }
    // 非标准注释检查方法
    checkNonStandardThisTag(node) {
        const leadingComments = arkanalyzer_1.ts.getLeadingCommentRanges(node.getSourceFile().text, node.pos);
        return leadingComments?.some(comment => node.getSourceFile().text.substring(comment.pos, comment.end).includes('@this')) ?? false;
    }
    /**
     * 判断 ts.Node 是否在对象的方法中
     * @param {ts.Node} node - 要检查的节点
     * @returns {boolean} 如果 node 在对象的方法中，则返回 true；否则返回 false
     */
    isNodeInObjectMethod(node) {
        let current = node;
        let isInMethod = false;
        let isArrowFunction = false;
        while (current) {
            // 检查是否为对象的方法
            if (arkanalyzer_1.ts.isMethodDeclaration(current) || arkanalyzer_1.ts.isMethodSignature(current)) {
                return true;
            }
            // 检查是否为 getter 或 setter
            if (arkanalyzer_1.ts.isGetAccessor(current) || arkanalyzer_1.ts.isSetAccessor(current)) {
                return true;
            }
            if (arkanalyzer_1.ts.isPropertyAssignment(current) && arkanalyzer_1.ts.isArrowFunction(current.initializer)) {
                isInMethod = true;
            }
            if (arkanalyzer_1.ts.isPropertyDeclaration(current) && current.initializer && arkanalyzer_1.ts.isArrowFunction(current.initializer)) {
                isInMethod = true;
            }
            // 检查是否为函数表达式
            if (arkanalyzer_1.ts.isFunctionExpression(current) || arkanalyzer_1.ts.isFunctionDeclaration(current)) {
                if (arkanalyzer_1.ts.isBlock(current.parent)) {
                    return false;
                }
                if (arkanalyzer_1.ts.isReturnStatement(current.parent)) {
                    if (!this.isNodeType(current.parent, arkanalyzer_1.ts.SyntaxKind.ParenthesizedExpression)) {
                        return false;
                    }
                }
                if (arkanalyzer_1.ts.isNewExpression(current.parent)) {
                    return false;
                }
                isInMethod = true;
            }
            if (arkanalyzer_1.ts.isArrowFunction(current)) {
                if (arkanalyzer_1.ts.isBlock(current.parent)) {
                    return false;
                }
                if (arkanalyzer_1.ts.isReturnStatement(current.parent)) {
                    return false;
                }
                isArrowFunction = true;
            }
            // 检查是否为对象的属性赋值或属性声明
            if (arkanalyzer_1.ts.isPropertyAssignment(current) || arkanalyzer_1.ts.isPropertyDeclaration(current)) {
                if (isArrowFunction || isInMethod) {
                    return true;
                }
            }
            // 检查是否为二进制表达式，且左边为对象的属性
            if (arkanalyzer_1.ts.isBinaryExpression(current) && arkanalyzer_1.ts.isPropertyAccessExpression(current.left)) {
                if (isArrowFunction || isInMethod) {
                    return true;
                }
            }
            current = current.parent;
        }
        return false;
    }
    isNodeType(node, kind) {
        if (!node) {
            return false;
        }
        if (node?.kind === kind) {
            return true;
        }
        else {
            return this.isNodeType(node.parent, kind);
        }
    }
    /**
     * 判断 this 关键字是否在函数中，且函数的参数中有 this 参数
     * @param node
     * @returns
     */
    isThisInFunctionWithThisParam(node) {
        let current = node;
        while (current) {
            if (arkanalyzer_1.ts.isFunctionLike(current)) {
                const parameters = current.parameters;
                for (const param of parameters) {
                    if (param.name.getText() === 'this') {
                        return true;
                    }
                }
            }
            current = current.parent;
        }
        return false;
    }
    /**
     * 是否构造函数声明
     * @param node
     * @returns
     */
    isConstructorFunction(node) {
        let current = node;
        while (current) {
            if (arkanalyzer_1.ts.isConstructorDeclaration(current)) {
                return true;
            }
            if (this.option.capIsConstructor && (arkanalyzer_1.ts.isFunctionDeclaration(current) || arkanalyzer_1.ts.isFunctionExpression(current))) {
                const name = (current.name && current.name.text) || '';
                const parent = current.parent;
                if (name && /^[A-Z]/.test(name)) {
                    return true;
                }
                if (parent && arkanalyzer_1.ts.isVariableDeclaration(parent) && parent.name && /^[A-Z]/.test(parent.name.getText())) {
                    return true;
                }
                if (parent && arkanalyzer_1.ts.isBinaryExpression(parent) && parent.left && /^[A-Z]/.test(parent.left.getText())) {
                    return true;
                }
                if (parent && arkanalyzer_1.ts.isParameter(parent) && parent.name && /^[A-Z]/.test(parent.name.getText())) {
                    return true;
                }
            }
            current = current.parent;
        }
        return false;
    }
    nodeContainsThisKeyword(node) {
        if (node && node?.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
            return true;
        }
        return false;
    }
    addIssueReport(pos, severity, message) {
        let defects = new Defects_1.Defects(pos.line, pos.startCol, pos.startCol + 4, message, severity, this.rule.ruleId, pos.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
    getLineAndColumn(node, text) {
        const sourceFile = node.getSourceFile();
        const nodeText = node.getText();
        const textIndex = nodeText.indexOf(text);
        if (textIndex !== -1) {
            const { line: textLine, character: textCharacter } = sourceFile.getLineAndCharacterOfPosition(node.getStart() + textIndex);
            return {
                line: textLine + 1,
                startCol: textCharacter + 1,
                filePath: sourceFile.fileName
            };
        }
        return { line: -1, startCol: -1, filePath: '' };
    }
}
exports.NoInvalidThisCheck = NoInvalidThisCheck;
