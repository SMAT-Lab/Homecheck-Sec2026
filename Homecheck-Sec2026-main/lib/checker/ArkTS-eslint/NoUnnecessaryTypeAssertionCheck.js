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
exports.NoUnnecessaryTypeAssertionCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnnecessaryTypeAssertionCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-unnecessary-type-assertion.md",
    description: "Disallow type assertions that do not change the type of an expression.",
};
const defaultOptions = {};
class NoUnnecessaryTypeAssertionCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    options = defaultOptions;
    asRoot;
    filePath;
    symbolTable = new Map();
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (target) => {
        if (target instanceof arkanalyzer_1.ArkFile) {
            const code = target.getCode();
            if (!code) {
                return;
            }
            this.filePath = target.getFilePath();
            this.asRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
            // 构建符号表
            this.buildSymbolTable(this.asRoot);
            this.options = this.rule && this.rule.option && this.rule.option[0] ? this.rule.option[0] : defaultOptions;
            const LocationInfos = this.checksNonNullExpression(this.asRoot, target);
            // 输出结果
            LocationInfos.forEach(loc => {
                this.addIssueReportNodeFix(loc, this.filePath);
            });
            const stmts = target.getDefaultClass().getDefaultArkMethod()?.getCfg()?.getStmts();
            if (!stmts) {
                return;
            }
            for (const stmt of stmts) {
                const origText = stmt.getOriginalText() ?? '';
                const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('methodName', origText);
                const LocationInfos = this.checkTypeAssertion(sourceFile, stmt);
                // 输出结果
                LocationInfos.forEach(loc => {
                    this.addIssueReportNodeFix(loc, this.filePath);
                });
            }
        }
    };
    buildSymbolTable(sourceFile) {
        const visit = (node) => {
            if (arkanalyzer_1.ts.isTypeAliasDeclaration(node)) {
                const name = node.name.getText();
                const type = node.type;
                // 存储类型别名定义
                this.symbolTable.set(name, type);
            }
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    checkTypeAssertion(sourceFile, stmt) {
        const locationInfos = [];
        const visit = (node) => {
            if (arkanalyzer_1.ts.isTypeAssertionExpression(node) || arkanalyzer_1.ts.isAsExpression(node)) {
                this.checkExpression(stmt, node, locationInfos);
            }
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return locationInfos;
    }
    checkExpression(stmt, node, results) {
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            const isRedundant = this.getConstrainedTypeOfArkAssignStmt(stmt, node);
            if (isRedundant) {
                this.addUnnecessaryAssertion(results, node);
            }
        }
    }
    getConstrainedTypeOfArkAssignStmt(stmt, node) {
        let nodeType = null;
        if (arkanalyzer_1.ts.isTypeAssertionExpression(node) || arkanalyzer_1.ts.isAsExpression(node)) {
            const { type } = node;
            nodeType = this.symbolTable.get(type.getText());
        }
        if (stmt.getRightOp() instanceof arkanalyzer_1.ArkNewExpr) {
            return false;
        }
        if (stmt.getRightOp() instanceof arkanalyzer_1.ArkCastExpr) {
            return false;
        }
        const rightOpType = stmt.getRightOp().getType();
        if (this.options.typesToIgnore &&
            (!this.options.typesToIgnore.includes(rightOpType.getTypeString()) ||
                !this.options.typesToIgnore.includes(nodeType?.getText() || ''))) {
            return false;
        }
        if (rightOpType.getTypeString() === 'unknown') {
            return false;
        }
        if (rightOpType.getTypeString() === 'any') {
            return false;
        }
        if (nodeType) {
            if (nodeType.getText() === rightOpType.getTypeString()) {
                return true;
            }
        }
        return false;
    }
    checksNonNullExpression(sourceFile, arkFile) {
        const locationInfos = [];
        const visit = (node) => {
            // 检查非空断言表达式
            if (arkanalyzer_1.ts.isNonNullExpression(node)) {
                // 首先尝试我们的全面检查方法
                this.checkAllTypesOfNonNullAssertions(node, sourceFile, locationInfos);
                //  嵌套非空断言和可选链与非空断言组合
                this.checkNestedNonNullExpression(node, sourceFile, arkFile, locationInfos);
                this.checkParenthesizedNonNullExpression(node, sourceFile, arkFile, locationInfos);
                this.checkOptionalChainingWithNonNull(node, sourceFile, arkFile, locationInfos);
            }
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return locationInfos;
    }
    addUnnecessaryAssertion(locationInfos, node) {
        let start = 0;
        let end = 0;
        const fileText = this.asRoot.getFullText();
        const index = fileText.indexOf(node.getText());
        if (index === -1) {
            return;
        }
        const { line, character } = this.asRoot.getLineAndCharacterOfPosition(index);
        const leftKeywordLength = node.getChildAt(0).getText().length;
        const endCharacter = character + node.getText().length;
        if (arkanalyzer_1.ts.isAsExpression(node)) {
            start = index + leftKeywordLength;
            end = start + node.getText().length - leftKeywordLength;
        }
        if (arkanalyzer_1.ts.isTypeAssertionExpression(node)) {
            const typeNode = node.type;
            start = index;
            end = start + typeNode.getEnd() - typeNode.getStart() + 2;
        }
        locationInfos.push({
            fileName: this.asRoot.fileName,
            line: line + 1,
            startCol: character + 1,
            endCol: endCharacter + 1,
            start: start,
            end: end,
            assertionName: 'as',
            description: 'This assertion is unnecessary since it does not change the type of the expression.'
        });
    }
    addNonNullExpression(locationInfos, sourceFile, exclamationNode) {
        if (this.options.typesToIgnore && this.options.typesToIgnore.includes(exclamationNode.getText())) {
            return;
        }
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(exclamationNode.getStart());
        const endCharacter = character + exclamationNode.getWidth();
        locationInfos.push({
            fileName: sourceFile.fileName,
            line: line + 1,
            startCol: character + 1,
            endCol: endCharacter + 1,
            start: exclamationNode.getEnd(),
            end: exclamationNode.getEnd() + 1,
            assertionName: exclamationNode.getText(),
            description: 'This assertion is unnecessary since it does not change the type of the expression.'
        });
    }
    checkNestedNonNullExpression(node, sourceFile, target, locationInfos) {
        if (arkanalyzer_1.ts.isNonNullExpression(node.expression)) {
            // 只有当表达式不可能为null/undefined时，才报告嵌套的非空断言错误
            // 例如：如果变量类型为 number | null，那么第一个!是必须的，但第二个!就是多余的
            // 获取最内层的表达式
            let innerExpression = node.expression.expression;
            while (arkanalyzer_1.ts.isNonNullExpression(innerExpression)) {
                innerExpression = innerExpression.expression;
            }
            // 检查最内层表达式是否可能为null/undefined
            if (this.isNullableExpression(innerExpression)) {
                // 如果可能为null/undefined，那么第一个!是必要的，但后续的!是多余的
                this.addNonNullExpression(locationInfos, sourceFile, node.expression);
            }
            else {
                // 如果不可能为null/undefined，那么所有的!都是多余的
                this.addNonNullExpression(locationInfos, sourceFile, node.expression);
            }
        }
    }
    checkParenthesizedNonNullExpression(node, sourceFile, target, locationInfos) {
        if (arkanalyzer_1.ts.isParenthesizedExpression(node.expression) &&
            arkanalyzer_1.ts.isNonNullExpression(node.expression.expression)) {
            // 获取括号内非空断言的表达式
            let innerExpression = node.expression.expression.expression;
            while (arkanalyzer_1.ts.isNonNullExpression(innerExpression)) {
                innerExpression = innerExpression.expression;
            }
            // 检查最内层表达式是否可能为null/undefined
            if (this.isNullableExpression(innerExpression)) {
                // 如果可能为null/undefined，那么第一个!是必要的，但后续的!是多余的
                this.addNonNullExpression(locationInfos, sourceFile, node.expression);
            }
            else {
                // 如果不可能为null/undefined，那么所有的!都是多余的
                this.addNonNullExpression(locationInfos, sourceFile, node.expression);
            }
        }
    }
    checkOptionalChainingWithNonNull(node, sourceFile, target, locationInfos) {
        let parent = node.parent;
        // 检查是否是可选参数（带有?:）的非空断言
        if (this.isOptionalParameterNonNullAssertion(node)) {
            // 如果是可选参数上的非空断言，则不报错
            return;
        }
        // 检查是否是属性访问表达式的一部分，且前面有可选链
        // 针对 obj?.bar!?.n 这种情况
        if (this.isPropertyAfterOptionalChain(node)) {
            return;
        }
        // 获取最内层表达式
        let innerExpr = node.expression;
        while (arkanalyzer_1.ts.isNonNullExpression(innerExpr)) {
            innerExpr = innerExpr.expression;
        }
        // 检查表达式是否可能为null/undefined
        const isNullable = this.isNullableExpression(innerExpr);
        // 对于非可选链情况，检查非空断言是否是应用在不可能为null/undefined的表达式上
        // 如果是普通非空断言（如 x!），且x不是可选参数或可空类型，则报错
        if (!isNullable) {
            this.addNonNullExpression(locationInfos, sourceFile, node.expression);
        }
    }
    // 检查表达式是否可能为null或undefined
    isNullableExpression(expression) {
        // 处理括号表达式
        if (arkanalyzer_1.ts.isParenthesizedExpression(expression)) {
            return this.isNullableExpression(expression.expression);
        }
        // 处理非空断言表达式 - 递归检查内部表达式
        if (arkanalyzer_1.ts.isNonNullExpression(expression)) {
            return this.isNullableExpression(expression.expression);
        }
        // 字面量表达式（数字、字符串、布尔值）不可能为null/undefined
        if (arkanalyzer_1.ts.isLiteralExpression(expression)) {
            // 除了null字面量，其他字面量都不可能为null/undefined
            return expression.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword ||
                expression.kind === arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword;
        }
        // 对象字面量和数组字面量不可能为null/undefined
        if (arkanalyzer_1.ts.isObjectLiteralExpression(expression) ||
            arkanalyzer_1.ts.isArrayLiteralExpression(expression)) {
            return false;
        }
        // 对于标识符，查找其声明
        if (arkanalyzer_1.ts.isIdentifier(expression)) {
            const identifier = expression;
            // 查找此标识符的声明
            let current = expression;
            while (current && current.parent) {
                current = current.parent;
                if (this.isNullableIdentifier(current, identifier)) {
                    return true;
                }
            }
        }
        // 检查属性访问表达式
        if (arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
            // 如果基对象可能为null/undefined，属性访问也可能为null/undefined
            return this.isNullableExpression(expression.expression);
        }
        // 默认情况，保守地认为可能为null/undefined
        return true;
    }
    isNullableIdentifier(current, identifier) {
        // 检查变量声明
        if (arkanalyzer_1.ts.isVariableDeclaration(current) && arkanalyzer_1.ts.isIdentifier(current.name) && current.name.text === identifier.text) {
            // 检查变量声明的类型
            if (current.type) {
                const typeText = current.type.getText();
                // 如果类型包含null、undefined或是联合类型，认为可能为null
                return typeText.includes('null') || typeText.includes('undefined') || typeText.includes('|');
            }
            // 如果没有显式类型，看初始值
            if (current.initializer) {
                // 数字、字符串、布尔值、对象字面量、数组字面量不可能为null/undefined
                if (arkanalyzer_1.ts.isLiteralExpression(current.initializer) && current.initializer.kind !== arkanalyzer_1.ts.SyntaxKind.NullKeyword &&
                    current.initializer.kind !== arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword) {
                    return false;
                }
                // 对象字面量和数组字面量不可能为null/undefined
                if (arkanalyzer_1.ts.isObjectLiteralExpression(current.initializer) || arkanalyzer_1.ts.isArrayLiteralExpression(current.initializer)) {
                    return false;
                }
                // 检查初始值是否为null或undefined
                return current.initializer.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword ||
                    (arkanalyzer_1.ts.isIdentifier(current.initializer) && current.initializer.text === 'undefined');
            }
            // 没有类型和初始值的情况（例如：let x;）
            // 可能是undefined，因为没有初始化
            if (!current.type && !current.initializer) {
                return true;
            }
            // 如果是const声明但没有类型标注，检查初始值
            if (arkanalyzer_1.ts.isVariableDeclarationList(current.parent) &&
                current.parent.flags & arkanalyzer_1.ts.NodeFlags.Const) {
                // const变量必须有初始值，所以如果运行到这里，
                // 说明initializer的类型不是我们检查的那几种
                // 保守地认为仍然可能是nullable的
                return true;
            }
        }
        return this.isNullableIdentifierOther(current, identifier);
    }
    isNullableIdentifierOther(current, identifier) {
        // 检查参数声明
        if (arkanalyzer_1.ts.isParameter(current) && arkanalyzer_1.ts.isIdentifier(current.name) && current.name.text === identifier.text) {
            // 如果是可选参数，认为可能为null
            if (current.questionToken) {
                return true;
            }
            // 如果有类型标注，检查类型
            if (current.type) {
                const typeText = current.type.getText();
                return typeText.includes('null') || typeText.includes('undefined') || typeText.includes('|');
            }
        }
        // 检查导入声明
        if (arkanalyzer_1.ts.isImportSpecifier(current) && arkanalyzer_1.ts.isIdentifier(current.name) && current.name.text === identifier.text) {
            // 导入的标识符，无法确定类型，保守地认为可能为null
            return true;
        }
        return false;
    }
    // 新增方法：检查是否是可选链访问后的属性上的非空断言
    isPropertyAfterOptionalChain(node) {
        // 处理node.expression是括号表达式的情况
        if (arkanalyzer_1.ts.isParenthesizedExpression(node.expression)) {
            // 创建一个新的非空断言节点，使用括号内的表达式
            return this.isPropertyAfterOptionalChain({
                kind: arkanalyzer_1.ts.SyntaxKind.NonNullExpression,
                expression: node.expression.expression
            });
        }
        // 检查表达式是否是属性访问
        if (arkanalyzer_1.ts.isPropertyAccessExpression(node.expression)) {
            const propAccess = node.expression;
            // 检查表达式的对象是否是括号表达式
            if (arkanalyzer_1.ts.isParenthesizedExpression(propAccess.expression)) {
                // 如果是括号表达式，递归检查括号内的表达式
                const innerExpr = propAccess.expression.expression;
                if (arkanalyzer_1.ts.isPropertyAccessExpression(innerExpr) && innerExpr.questionDotToken) {
                    return true;
                }
            }
            // 检查属性访问的对象是否有可选链
            if (arkanalyzer_1.ts.isPropertyAccessExpression(propAccess.expression) && propAccess.expression.questionDotToken) {
                return true;
            }
        }
        return false;
    }
    // 新增一个辅助方法来检查是否是可选参数（带有?:）上的非空断言
    isOptionalParameterNonNullAssertion(node) {
        // 检查表达式是否是标识符（变量名）或者是括号表达式
        const expression = node.expression;
        // 处理括号表达式 (bar)!
        if (arkanalyzer_1.ts.isParenthesizedExpression(expression)) {
            // 创建一个新的NonNullExpression节点，使用括号内的表达式
            const innerExpression = expression.expression;
            // 递归检查括号内的表达式
            return this.isParameterOptional(innerExpression);
        }
        return this.isParameterOptional(expression);
    }
    // 检查表达式是否是可选参数
    isParameterOptional(expression) {
        // 处理括号表达式，递归检查内部表达式
        if (arkanalyzer_1.ts.isParenthesizedExpression(expression)) {
            return this.isParameterOptional(expression.expression);
        }
        // 检查是否是标识符（变量名）
        if (arkanalyzer_1.ts.isIdentifier(expression)) {
            const identifier = expression;
            // 查找此标识符的声明
            // 遍历所有祖先节点，查找可能的参数声明
            let current = expression;
            while (current) {
                if (this.isParameterOptionalIdentifier(current, identifier)) {
                    return true;
                }
                current = current.parent;
            }
        }
        // 检查属性访问的情况，例如 obj.prop!?.something
        if (arkanalyzer_1.ts.isPropertyAccessExpression(expression)) {
            const propAccess = expression;
            if (arkanalyzer_1.ts.isIdentifier(propAccess.expression)) {
                // 如果属性的基对象是可选参数，也应该允许这种组合
                // 检查标识符是否是可选参数
                return this.isParameterOptional(propAccess.expression);
            }
        }
        return false;
    }
    isParameterOptionalIdentifier(current, identifier) {
        // 检查函数声明/表达式等
        if (arkanalyzer_1.ts.isFunctionDeclaration(current) || arkanalyzer_1.ts.isFunctionExpression(current) ||
            arkanalyzer_1.ts.isMethodDeclaration(current) || arkanalyzer_1.ts.isArrowFunction(current)) {
            // 检查参数列表
            for (const param of current.parameters) {
                // 检查是否是可选参数（有问号标记）
                if (param.questionToken &&
                    arkanalyzer_1.ts.isIdentifier(param.name) &&
                    param.name.text === identifier.text) {
                    return true;
                }
                // 检查是否有默认值（也视为可选）
                if (param.initializer &&
                    arkanalyzer_1.ts.isIdentifier(param.name) &&
                    param.name.text === identifier.text) {
                    return true;
                }
                // 添加对解构参数的检查
                if (arkanalyzer_1.ts.isObjectBindingPattern(param.name) || arkanalyzer_1.ts.isArrayBindingPattern(param.name)) {
                    return this.isParameterOptionalBindingPattern(param, param.name, identifier);
                }
            }
        }
        return false;
    }
    isParameterOptionalBindingPattern(param, paramName, identifier) {
        for (const element of paramName.elements) {
            if (arkanalyzer_1.ts.isBindingElement(element) &&
                arkanalyzer_1.ts.isIdentifier(element.name) &&
                element.name.text === identifier.text) {
                // 如果是解构参数中的元素，并且父参数有questionToken或者有默认值，则认为是可选的
                if (param.questionToken || element.initializer || param.initializer) {
                    return true;
                }
            }
        }
        return false;
    }
    // 综合检查所有类型的非空断言
    checkAllTypesOfNonNullAssertions(node, sourceFile, locationInfos) {
        const expression = node.expression;
        // 检查是否是可选参数加可选链的组合
        const isOptionalParamWithChaining = this.isOptionalParameterWithChaining(node);
        if (isOptionalParamWithChaining) {
            // 如果是，不报错，这是有效的组合
            return;
        }
        // 1. 直接检查各种字面量
        if (arkanalyzer_1.ts.isLiteralExpression(expression) &&
            expression.kind !== arkanalyzer_1.ts.SyntaxKind.NullKeyword &&
            expression.kind !== arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword) {
            // 字面量上的非空断言是不必要的
            this.addNonNullExpression(locationInfos, sourceFile, expression);
            return;
        }
        // 2. 检查对象和数组字面量
        if (arkanalyzer_1.ts.isObjectLiteralExpression(expression) ||
            arkanalyzer_1.ts.isArrayLiteralExpression(expression)) {
            // 对象和数组字面量上的非空断言是不必要的
            this.addNonNullExpression(locationInfos, sourceFile, expression);
            return;
        }
        // 3. 检查二元表达式
        if (arkanalyzer_1.ts.isBinaryExpression(expression)) {
            // 二元表达式上的非空断言是不必要的
            this.addNonNullExpression(locationInfos, sourceFile, expression);
            return;
        }
        // 4. 检查标识符（变量名）
        if (arkanalyzer_1.ts.isIdentifier(expression)) {
            this.checkAllTypesOfNonNullAssertionsIdentifier(node, expression, sourceFile, locationInfos);
        }
    }
    checkAllTypesOfNonNullAssertionsIdentifier(node, expression, sourceFile, locationInfos) {
        const identifier = expression;
        // 4.1 检查函数参数
        const paramInfo = this.findParameterInfo(identifier, sourceFile);
        if (paramInfo) {
            const { parameter, hasNonNullableType, isOptional } = paramInfo;
            // 如果是可选参数，非空断言可能是必要的，检查父节点
            if (isOptional) {
                // 如果父节点有可选链，这是一个有效的组合
                const parent = node.parent;
                const hasOptionalChaining = parent && ((arkanalyzer_1.ts.isPropertyAccessExpression(parent) && !!parent.questionDotToken) ||
                    (arkanalyzer_1.ts.isElementAccessExpression(parent) && !!parent.questionDotToken) ||
                    (arkanalyzer_1.ts.isCallExpression(parent) && !!parent.questionDotToken));
                if (hasOptionalChaining) {
                    return; // 不报错
                }
                // 即使没有可选链，可选参数上的非空断言也是有效的
                return;
            }
            // 如果参数类型不可能为 null 或 undefined，且不是可选参数，那么非空断言是不必要的
            if (hasNonNullableType) {
                this.addNonNullExpression(locationInfos, sourceFile, expression);
                return;
            }
        }
        // 4.2 检查变量声明
        const declarationInfo = this.findVariableDeclarationInfo(identifier, sourceFile);
        if (declarationInfo) {
            const { declaration, isConst, hasLiteralInitializer } = declarationInfo;
            // 如果是常量且初始化为字面量，那么非空断言是不必要的
            if (isConst && hasLiteralInitializer) {
                this.addNonNullExpression(locationInfos, sourceFile, expression);
                return;
            }
            // 如果变量有类型标注，但不包含null或undefined，那么非空断言也是不必要的
            if (declaration.type) {
                const typeText = declaration.type.getText();
                if (!typeText.includes('null') && !typeText.includes('undefined') && !typeText.includes('|')) {
                    this.addNonNullExpression(locationInfos, sourceFile, expression);
                    return;
                }
            }
        }
    }
    // 新增辅助方法：检查是否是可选参数与可选链结合的情况
    isOptionalParameterWithChaining(node) {
        // 获取表达式
        let expr = node.expression;
        let identifier = null;
        // 处理带括号的情况，如 (bar!)?.n
        if (arkanalyzer_1.ts.isParenthesizedExpression(expr)) {
            expr = expr.expression;
        }
        // 获取标识符
        if (arkanalyzer_1.ts.isIdentifier(expr)) {
            identifier = expr;
        }
        if (!identifier) {
            return false;
        }
        // 检查是否是可选参数
        const paramInfo = this.findParameterInfo(identifier, node.getSourceFile());
        if (!paramInfo || !paramInfo.isOptional) {
            return false;
        }
        // 检查父节点是否有可选链
        const parent = node.parent;
        const hasOptionalChaining = parent && ((arkanalyzer_1.ts.isPropertyAccessExpression(parent) && !!parent.questionDotToken) ||
            (arkanalyzer_1.ts.isElementAccessExpression(parent) && !!parent.questionDotToken) ||
            (arkanalyzer_1.ts.isCallExpression(parent) && !!parent.questionDotToken));
        return !!hasOptionalChaining; // 确保返回布尔值
    }
    findParameterInfoDeclaration(node, current) {
        let found = false;
        // 向上查找，确认当前标识符是否在参数的函数体内
        while (current) {
            if (arkanalyzer_1.ts.isFunctionDeclaration(current) || arkanalyzer_1.ts.isFunctionExpression(current) ||
                arkanalyzer_1.ts.isMethodDeclaration(current) || arkanalyzer_1.ts.isArrowFunction(current)) {
                found = this.findParameterInfoDeclarationParam(node, current);
                if (found) {
                    break;
                }
            }
            current = current.parent;
        }
        return found;
    }
    findParameterInfoDeclarationParam(node, current) {
        let found = false;
        // 检查这个函数的参数中是否包含我们找到的参数
        for (const param of current.parameters) {
            if (param === node) {
                found = true;
                break;
            }
        }
        return found;
    }
    // 查找参数信息
    findParameterInfo(identifier, sourceFile) {
        // 遍历整个源文件查找参数声明
        const visit = (node) => {
            // 如果是参数，检查名称是否匹配
            if (arkanalyzer_1.ts.isParameter(node) && arkanalyzer_1.ts.isIdentifier(node.name) && node.name.text === identifier.text) {
                // 检查这个参数是否属于当前的上下文
                let current = identifier;
                if (this.findParameterInfoDeclaration(node, current)) {
                    return node;
                }
            }
            return arkanalyzer_1.ts.forEachChild(node, visit);
        };
        const parameter = visit(sourceFile);
        if (!parameter) {
            return null;
        }
        // 检查参数是否是可选的
        const isOptional = !!parameter.questionToken || !!parameter.initializer;
        // 检查参数类型是否可能为 null 或 undefined
        let hasNonNullableType = false;
        if (parameter.type) {
            const typeText = parameter.type.getText();
            // 如果类型不包含 null、undefined 或联合类型，则认为是不可为空的类型
            hasNonNullableType = !typeText.includes('null') && !typeText.includes('undefined') && !typeText.includes('|');
        }
        return { parameter, hasNonNullableType, isOptional };
    }
    // 查找变量声明信息
    findVariableDeclarationInfo(identifier, sourceFile) {
        // 遍历整个源文件查找声明
        const visit = (node) => {
            if (arkanalyzer_1.ts.isVariableDeclaration(node) &&
                arkanalyzer_1.ts.isIdentifier(node.name) &&
                node.name.text === identifier.text) {
                return node;
            }
            return arkanalyzer_1.ts.forEachChild(node, visit);
        };
        const declaration = visit(sourceFile);
        if (!declaration) {
            return null;
        }
        // 检查是否是const声明
        const isConst = arkanalyzer_1.ts.isVariableDeclarationList(declaration.parent) &&
            (declaration.parent.flags & arkanalyzer_1.ts.NodeFlags.Const) !== 0;
        // 检查初始化器是否是字面量
        let hasLiteralInitializer = this.infoHasLiteralInitializer(declaration, sourceFile);
        return { declaration, isConst, hasLiteralInitializer };
    }
    infoHasLiteralInitializer(declaration, sourceFile) {
        if (!declaration.initializer) {
            return false;
        }
        // 直接是字面量
        if (arkanalyzer_1.ts.isLiteralExpression(declaration.initializer) &&
            declaration.initializer.kind !== arkanalyzer_1.ts.SyntaxKind.NullKeyword &&
            declaration.initializer.kind !== arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword) {
            return true;
        }
        // 对象或数组字面量
        else if (arkanalyzer_1.ts.isObjectLiteralExpression(declaration.initializer) ||
            arkanalyzer_1.ts.isArrayLiteralExpression(declaration.initializer)) {
            return true;
        }
        // 是另一个标识符
        else if (arkanalyzer_1.ts.isIdentifier(declaration.initializer)) {
            // 递归查找这个标识符的声明
            const nestedInfo = this.findVariableDeclarationInfo(declaration.initializer, sourceFile);
            if (nestedInfo && nestedInfo.isConst && nestedInfo.hasLiteralInitializer) {
                return true;
            }
        }
        return false;
    }
    // 创建修复对象 
    ruleFix(loc) {
        return { range: [loc.start, loc.end], text: '' };
    }
    addIssueReportNodeFix(loc, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (loc.description) {
            this.metaData.description = loc.description;
        }
        let defect = new Defects_1.Defects(loc.line, loc.startCol, loc.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        const fixKey = loc.line + ':' + loc.startCol + ':' + loc.endCol + ':' + loc.start + ':' + loc.end;
        let fix = this.ruleFix(loc);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.NoUnnecessaryTypeAssertionCheck = NoUnnecessaryTypeAssertionCheck;
