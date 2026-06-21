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
exports.ExplicitModuleBoundaryTypesCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ExplicitModuleBoundaryTypesCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/explicit-module-boundary-types.md",
    description: "Require explicit return and argument types on exported functions' and classes' public class methods",
};
const defaultOptions = {
    allowArgumentsExplicitlyTypedAsAny: false,
    allowDirectConstAssertionInArrowFunctions: true,
    allowedNames: [],
    allowHigherOrderFunctions: true,
    allowTypedFunctionExpressions: true,
};
class ExplicitModuleBoundaryTypesCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
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
        const targetName = target.getName();
        if (targetName && this.getFileExtension(targetName) === '.ets') {
            return;
        }
        if (target instanceof arkanalyzer_1.ArkFile) {
            const code = target.getCode();
            if (!code) {
                return;
            }
            const filePath = target.getFilePath();
            const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
            // 构建符号表
            this.buildSymbolTable(sourceFile);
            const missingReturnTypes = this.checkExplicitBoundaryType(sourceFile);
            missingReturnTypes.forEach(info => {
                this.addIssueReportNode(info, filePath);
            });
        }
    };
    getFileExtension(filePath) {
        const lastDotIndex = filePath.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return '';
        }
        return filePath.substring(lastDotIndex);
    }
    checkExplicitBoundaryType(sourceFile) {
        const result = [];
        const Options = this.rule && this.rule.option[0] ? this.rule.option[0] : defaultOptions;
        const visit = (node) => {
            // 特殊情况处理
            if (Options.allowDirectConstAssertionInArrowFunctions && arkanalyzer_1.ts.isArrowFunction(node) && arkanalyzer_1.ts.isDeleteExpression(node)) {
                return;
            }
            if (Options.allowTypedFunctionExpressions && arkanalyzer_1.ts.isTypeOfExpression(node)) {
                return;
            }
            if (Options.allowedNames && Options.allowedNames.length !== 0 && this.checkMethodNameNode(node, Options.allowedNames)) {
                return;
            }
            // 检查类声明
            if (arkanalyzer_1.ts.isClassDeclaration(node)) {
                this.checkClassDeclaration(node, sourceFile, Options, result);
            }
            // 检查函数声明
            if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isMethodDeclaration(node)) {
                this.checkFunctionDeclaration(node, sourceFile, Options, result);
            }
            if (arkanalyzer_1.ts.isVariableDeclaration(node)) {
                this.checkVariableDeclaration(node, sourceFile, Options, result);
            }
            if (arkanalyzer_1.ts.isConstructorDeclaration(node)) {
                this.checkConstructorDeclaration(node, sourceFile, Options, result);
            }
            if (arkanalyzer_1.ts.isExportAssignment(node) && node.expression) {
                this.checkExportAssignment(node.expression, sourceFile, Options, result);
            }
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return result;
    }
    checkExportAssignment(expression, sourceFile, Options, result) {
        if ((arkanalyzer_1.ts.isArrowFunction(expression) || arkanalyzer_1.ts.isFunctionExpression(expression))) {
            // 检查是否是高阶函数（返回另一个函数）
            if (this.isHigherOrderFunction(expression) && Options.allowHigherOrderFunctions) {
                return; // 如果是高阶函数且配置允许，则跳过检查
            }
            // 检查返回类型
            if (!expression.type) {
                // 获取开始位置，对于箭头函数使用箭头符号位置
                let startPos = expression.getStart();
                if (arkanalyzer_1.ts.isArrowFunction(expression) && expression.equalsGreaterThanToken) {
                    startPos = expression.equalsGreaterThanToken.getStart();
                }
                this.addIssue(result, sourceFile, startPos, 'Missing return type on function.');
            }
            // 检查参数类型
            for (const param of expression.parameters) {
                if (!param.type) {
                    this.addIssue(result, sourceFile, param.getStart(), this.checkArgument(param.name.getText()));
                }
            }
        }
    }
    // 检查函数是否是高阶函数（返回另一个函数）
    isHigherOrderFunction(node) {
        // 检查函数体是否是块
        if (arkanalyzer_1.ts.isBlock(node.body)) {
            // 查找 return 语句
            return this.isHigherOrderFunctionStatement(node.body);
        }
        else {
            // 如果函数体是表达式（箭头函数的简写形式）
            const bodyExpr = node.body;
            // 检查表达式是否是函数
            if ((arkanalyzer_1.ts.isFunctionExpression(bodyExpr) || arkanalyzer_1.ts.isArrowFunction(bodyExpr))) {
                // 检查函数是否有明确的返回类型
                return bodyExpr.type !== undefined;
            }
        }
        return false;
    }
    isHigherOrderFunctionStatement(node) {
        for (const statement of node.statements) {
            if (arkanalyzer_1.ts.isReturnStatement(statement) && statement.expression) {
                const returnExpr = statement.expression;
                // 检查返回值是否是函数
                if ((arkanalyzer_1.ts.isFunctionExpression(returnExpr) || arkanalyzer_1.ts.isArrowFunction(returnExpr))) {
                    // 检查返回的函数是否有明确的返回类型
                    return returnExpr.type !== undefined;
                }
            }
        }
        return false;
    }
    checkMethodNameNode(node, allowedNames) {
        // 检查 node 是否是 MethodDeclaration 或 PropertyDeclaration 类型
        if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isArrowFunction(node) || arkanalyzer_1.ts.isFunctionExpression(node) ||
            arkanalyzer_1.ts.isMethodSignature(node) || arkanalyzer_1.ts.isMethodDeclaration(node)) {
            const methodName = node.name?.getText(); // 安全访问 name 属性
            if (methodName && allowedNames.includes(methodName)) {
                return true; // 如果方法名在允许列表中，则跳过检查
            }
        }
        return false;
    }
    hasModifiers(node) {
        return 'modifiers' in node;
    }
    isExported(node) {
        if (this.hasModifiers(node)) {
            if (arkanalyzer_1.ts.getModifiers(node)?.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword)) {
                return true;
            }
        }
        if (arkanalyzer_1.ts.isClassDeclaration(node)) {
            const className = node.name?.getText();
            if (className && this.symbolTable.has(className)) {
                return true;
            }
        }
        // 检查是否是函数声明
        if (arkanalyzer_1.ts.isFunctionDeclaration(node)) {
            const functionName = node.name?.getText();
            if (functionName && this.symbolTable.has(functionName)) {
                return true;
            }
        }
        return this.isExportedOther(node);
    }
    isExportedOther(node) {
        // 检查是否是变量声明（包括箭头函数和函数表达式）
        if (arkanalyzer_1.ts.isVariableDeclaration(node)) {
            const initializer = node.initializer;
            if (!initializer) {
                return false;
            }
            if (arkanalyzer_1.ts.isArrowFunction(initializer) || arkanalyzer_1.ts.isFunctionExpression(initializer)) {
                const functionName = node.name.getText();
                if (functionName && this.symbolTable.has(functionName)) {
                    return true;
                }
            }
        }
        if (arkanalyzer_1.ts.isCallExpression(node)) {
            const expression = node.expression;
            // 检查是否是箭头函数或函数表达式
            if (arkanalyzer_1.ts.isArrowFunction(expression) || arkanalyzer_1.ts.isFunctionExpression(expression)) {
                // 获取函数名
                const functionName = this.getFunctionName(expression);
                // 如果函数名存在且在符号表中，检查该函数是否被导出
                if (functionName && this.symbolTable.has(functionName)) {
                    return true;
                }
            }
        }
        return false;
    }
    getFunctionName(node) {
        // 如果是箭头函数，尝试从父节点获取名称
        if (arkanalyzer_1.ts.isArrowFunction(node)) {
            const parent = node.parent;
            if (arkanalyzer_1.ts.isVariableDeclaration(parent)) {
                return parent.name.getText();
            }
        }
        // 如果是函数表达式，尝试从父节点获取名称
        if (arkanalyzer_1.ts.isFunctionExpression(node)) {
            const parent = node.parent;
            if (arkanalyzer_1.ts.isVariableDeclaration(parent)) {
                return parent.name.getText();
            }
        }
        // 如果是函数声明，直接获取名称
        if (arkanalyzer_1.ts.isFunctionDeclaration(node)) {
            return node.name?.getText();
        }
        return undefined;
    }
    isPrivateOrProtected(node) {
        if (this.hasModifiers(node)) {
            const isPrivate = !!arkanalyzer_1.ts.getModifiers(node)?.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PrivateKeyword);
            const isProtected = !!arkanalyzer_1.ts.getModifiers(node)?.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ProtectedKeyword);
            return isPrivate || isProtected; // 跳过私有和保护方法的检查
        }
        return false;
    }
    isParentExported(node) {
        if (this.isExported(node)) {
            return true;
        }
        if (node.parent) {
            return this.isParentExported(node.parent);
        }
        return false;
    }
    // 辅助函数：判断函数是否有显式的返回类型注解
    hasExplicitReturnType(node) {
        // 如果函数有返回类型注解，或者函数体中返回的是一个有明确类型的函数，则返回 true
        if (node.type) {
            return true; // 显式返回类型注解
        }
        // 如果函数体中返回的是一个函数表达式或箭头函数，检查其是否有类型注解
        if (!node.body) {
            return false;
        }
        for (const statement of node.body.statements) {
            if (arkanalyzer_1.ts.isReturnStatement(statement) && statement.expression) {
                if (arkanalyzer_1.ts.isFunctionExpression(statement.expression) || arkanalyzer_1.ts.isArrowFunction(statement.expression)) {
                    return !!statement.expression.type; // 返回的函数有类型注解
                }
            }
        }
        return false;
    }
    hasAsExpression(node) {
        if (!node.body) {
            return false;
        }
        // 检查函数体是否是一个块（Block）
        if (arkanalyzer_1.ts.isBlock(node.body)) {
            for (const statement of node.body.statements) {
                // 检查是否是 return 语句
                if (arkanalyzer_1.ts.isReturnStatement(statement) && statement.expression && arkanalyzer_1.ts.isAsExpression(statement.expression)) {
                    // 检查返回值是否是一个 AsExpression
                    return true;
                }
            }
        }
        // 检查函数体是否是一个表达式（例如箭头函数的简写形式）
        if (!arkanalyzer_1.ts.isBlock(node.body)) {
            // 直接检查表达式是否是一个 AsExpression
            if (arkanalyzer_1.ts.isAsExpression(node.body)) {
                return true;
            }
        }
        return false;
    }
    checkConstructorDeclaration(node, sourceFile, Options, result) {
        const isSelfExported = this.isExported(node);
        for (const param of node.parameters) {
            if (!param.type && isSelfExported) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(param.name.getStart());
                result.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    character: character + 1,
                    description: this.checkArgument(param.name.getText())
                });
            }
        }
    }
    /**
   * 检查类声明中的方法和属性是否符合显式类型要求。
   */
    checkClassDeclaration(node, sourceFile, Options, result) {
        // 检查类是否被导出
        const isDefaultExport = !!sourceFile.statements.find(stmt => arkanalyzer_1.ts.isExportAssignment(stmt) &&
            stmt.expression &&
            (arkanalyzer_1.ts.isIdentifier(stmt.expression) &&
                node.name &&
                stmt.expression.text === node.name.text));
        // 检查类是否有export关键字或是否是默认导出
        const isClassExported = this.isExported(node) || isDefaultExport;
        if (!isClassExported) {
            return; // 如果类没有被导出，直接返回，不检查其成员
        }
        // 遍历类成员
        for (const member of node.members) {
            // 特殊情况处理
            if (Options.allowDirectConstAssertionInArrowFunctions && arkanalyzer_1.ts.isArrowFunction(member) && arkanalyzer_1.ts.isDeleteExpression(member)) {
                continue;
            }
            if (Options.allowTypedFunctionExpressions && arkanalyzer_1.ts.isTypeOfExpression(member)) {
                continue;
            }
            if (Options.allowedNames && Options.allowedNames.length !== 0 && this.checkMethodName(member, Options.allowedNames)) {
                continue;
            }
            if (this.isPrivateOrProtected(member)) {
                continue;
            }
            if (member.name && arkanalyzer_1.ts.isPrivateIdentifier(member.name)) {
                continue;
            }
            this.checkClassAccessorDeclaration(member, sourceFile, Options, result);
            // 方法
            if (arkanalyzer_1.ts.isMethodDeclaration(member) && this.hasModifiers(member)) {
                this.checkClassMethodDeclaration(member, sourceFile, Options, result);
            }
            if (arkanalyzer_1.ts.isVariableDeclaration(member)) {
                this.checkClassVariableDeclaration(member, sourceFile, Options, result);
            }
            if (arkanalyzer_1.ts.isPropertyDeclaration(member)) {
                this.checkClassPropertyDeclaration(member, sourceFile, Options, result);
            }
            if (arkanalyzer_1.ts.isConstructorDeclaration(member)) {
                this.checkClassConstructorDeclaration(member, sourceFile, Options, result);
            }
        }
    }
    buildSymbolTable(sourceFile) {
        const visit = (node) => {
            if (arkanalyzer_1.ts.isExportSpecifier(node)) {
                // 处理 export { test, fn, arrowFn, Test }
                const name = node.name.getText();
                this.symbolTable.set(name, node);
            }
            else if (arkanalyzer_1.ts.isExportDeclaration(node)) {
                // 处理 export { test, fn }
                this.buildSymbolTableExportClause(node);
            }
            else if (arkanalyzer_1.ts.isExportAssignment(node)) {
                // 处理 export default xxx
                this.buildSymbolTabletExportAssignment(node);
            }
            // 递归遍历子节点
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    buildSymbolTableExportClause(node) {
        if (node.exportClause) {
            if (arkanalyzer_1.ts.isNamedExports(node.exportClause)) {
                node.exportClause.elements.forEach((specifier) => {
                    const name = specifier.name.getText();
                    this.symbolTable.set(name, specifier);
                });
            }
        }
    }
    buildSymbolTabletExportAssignment(node) {
        if (node.expression) {
            // 处理 export default { bar }
            if (arkanalyzer_1.ts.isObjectLiteralExpression(node.expression)) {
                this.buildSymbolTabletObjectLiteralExpression(node.expression);
            }
            // 处理 export default [foo]
            else if (arkanalyzer_1.ts.isArrayLiteralExpression(node.expression)) {
                this.buildSymbolTabletArrayLiteralExpression(node.expression);
            }
            // 处理 export default ClassName
            else if (arkanalyzer_1.ts.isIdentifier(node.expression)) {
                const name = node.expression.text;
                this.symbolTable.set(name, node);
            }
        }
    }
    buildSymbolTabletObjectLiteralExpression(expression) {
        for (const property of expression.properties) {
            if (arkanalyzer_1.ts.isPropertyAssignment(property) && arkanalyzer_1.ts.isIdentifier(property.name)) {
                const name = property.name.text;
                this.symbolTable.set(name, property);
            }
            else if (arkanalyzer_1.ts.isShorthandPropertyAssignment(property)) {
                const name = property.name.text;
                this.symbolTable.set(name, property);
            }
        }
    }
    buildSymbolTabletArrayLiteralExpression(expression) {
        for (const element of expression.elements) {
            if (arkanalyzer_1.ts.isIdentifier(element)) {
                const name = element.text;
                this.symbolTable.set(name, element);
            }
            else if (arkanalyzer_1.ts.isObjectLiteralExpression(element)) {
                this.buildSymbolTabletObjectLiteralExpression(element);
            }
        }
    }
    checkMethodName(member, allowedNames) {
        // 检查 node 是否是 MethodDeclaration 或 PropertyDeclaration 类型
        if (arkanalyzer_1.ts.isFunctionDeclaration(member) || arkanalyzer_1.ts.isArrowFunction(member) || arkanalyzer_1.ts.isFunctionExpression(member) ||
            arkanalyzer_1.ts.isMethodSignature(member) || arkanalyzer_1.ts.isMethodDeclaration(member)) {
            const methodName = member.name?.getText(); // 安全访问 name 属性
            if (methodName && allowedNames.includes(methodName)) {
                return true; // 如果方法名在允许列表中，则跳过检查
            }
        }
        return false;
    }
    checkClassMethodDeclaration(member, sourceFile, Options, result) {
        // 检查是否是私有或保护方法，如果是则跳过检查
        if (this.isPrivateOrProtected(member)) {
            return; // 跳过私有和保护方法的检查
        }
        // 检查返回类型
        if (!member.type) {
            this.addIssue(result, sourceFile, member.getStart(), 'Missing return type on function.');
        }
        // 检查参数类型
        for (const param of member.parameters) {
            if (!param.type) {
                this.addIssue(result, sourceFile, param.getStart(), this.checkArgument(param.name.getText()));
            }
        }
    }
    checkClassConstructorDeclaration(member, sourceFile, Options, result) {
        // 检查构造函数的参数类型注解
        for (const param of member.parameters) {
            // 检查是否缺少类型注解
            if (!param.type) {
                let startNumber = param.name.getStart();
                if (param.dotDotDotToken) {
                    startNumber = param.getStart();
                    this.addIssue(result, sourceFile, startNumber, this.checkDotArgument(param.name.getText()));
                }
                else {
                    this.addIssue(result, sourceFile, startNumber, this.checkArgument(param.name.getText()));
                }
            }
        }
    }
    checkClassPropertyDeclaration(member, sourceFile, Options, result) {
        // 检查类属性中的函数表达式 
        if (member.initializer &&
            (arkanalyzer_1.ts.isArrowFunction(member.initializer) || arkanalyzer_1.ts.isFunctionExpression(member.initializer))) {
            const func = member.initializer;
            // 检查返回类型注解
            if (!func.type) {
                this.addIssue(result, sourceFile, member.getStart(), 'Missing return type on function.');
            }
            // 检查参数类型注解
            for (const param of func.parameters) {
                if (!param.type) {
                    this.addIssue(result, sourceFile, param.getStart(), this.checkArgument(param.name.getText()));
                }
            }
        }
    }
    checkClassAccessorDeclaration(member, sourceFile, Options, result) {
        // 检查 getter 方法
        if (arkanalyzer_1.ts.isGetAccessorDeclaration(member)) {
            if (!member.type) {
                this.addIssue(result, sourceFile, member.getStart(), 'Missing return type on function.');
            }
        }
        // 检查 setter 方法
        if (arkanalyzer_1.ts.isSetAccessorDeclaration(member)) {
            const param = member.parameters[0];
            if (!param.type) {
                this.addIssue(result, sourceFile, param.getStart(), this.checkArgument(param.name.getText()));
            }
        }
    }
    /**
 * 检查类声明中的方法和属性是否符合显式类型要求。
 */
    checkClassVariableDeclaration(member, sourceFile, Options, result) {
        const initializer = member.initializer;
        if (initializer && arkanalyzer_1.ts.isArrowFunction(initializer)) {
            for (const param of initializer.parameters) {
                if (!param.type) {
                    this.addIssue(result, sourceFile, param.getStart(), this.checkArgument(param.name.getText()));
                }
                if (param.type &&
                    param.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword &&
                    !Options.allowArgumentsExplicitlyTypedAsAny) {
                    this.addIssue(result, sourceFile, param.getStart(), this.checkNonAnyArgument(param.name.getText()));
                }
            }
            if (!initializer.type) {
                if (Options.allowDirectConstAssertionInArrowFunctions && this.hasAsExpression(initializer)) {
                    return;
                }
                this.addIssue(result, sourceFile, initializer.equalsGreaterThanToken?.getStart() || initializer.getStart(), 'Missing return type on function.');
            }
        }
    }
    /**
   * 检查函数声明是否符合显式类型要求。
   */
    checkFunctionDeclaration(node, sourceFile, Options, result) {
        // 如果是方法声明，检查是否是私有方法或在非导出类中
        if (arkanalyzer_1.ts.isMethodDeclaration(node)) {
            // 检查是否是私有或保护方法
            const isPrivate = !!arkanalyzer_1.ts.getModifiers(node)?.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PrivateKeyword);
            const isProtected = !!arkanalyzer_1.ts.getModifiers(node)?.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ProtectedKeyword);
            if (isPrivate || isProtected) {
                return; // 跳过私有和保护方法的检查
            }
            let parent = node.parent;
            if (arkanalyzer_1.ts.isClassDeclaration(parent)) {
                // 检查类是否被导出
                const isClassExported = this.isExported(parent);
                if (!isClassExported) {
                    return; // 如果类没有被导出，跳过对其方法的检查
                }
            }
        }
        // 检查函数是否被导出
        const isFunctionExported = this.isExported(node);
        if (node.body && this.hasAsExpression(node) && Options.allowDirectConstAssertionInArrowFunctions) {
            return;
        }
        if (!isFunctionExported) {
            return;
        }
        this.checkFunctionDeclarationNode(node, sourceFile, Options, result, isFunctionExported);
    }
    checkFunctionDeclarationNode(node, sourceFile, Options, result, isFunctionExported) {
        // 检查返回类型注解
        if (!node.type) {
            // 如果函数返回的是另一个函数，且返回的函数有明确的类型注解，则不报错
            if (!node.body || !this.hasExplicitReturnType(node)) {
                this.checkFunctionDeclarationNodeBody(node, sourceFile, result);
            }
        }
        // 检查参数类型注解
        for (const param of node.parameters) {
            if (!param.type && !param.initializer) {
                let startNumber = param.name.getStart();
                if (param.dotDotDotToken) {
                    startNumber = param.getStart();
                    this.addIssue(result, sourceFile, startNumber, this.checkDotArgument(param.name.getText()));
                }
                else {
                    this.addIssue(result, sourceFile, startNumber, this.checkArgument(param.name.getText()));
                }
            }
            if (param.type && isFunctionExported && param.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword &&
                !Options.allowArgumentsExplicitlyTypedAsAny) {
                if (param.dotDotDotToken) {
                    this.addIssue(result, sourceFile, param.name.getStart() - 3, this.checkDotAnyArgument(param.name.getText()));
                }
                else {
                    this.addIssue(result, sourceFile, param.name.getStart(), this.checkNonAnyArgument(param.name.getText()));
                }
            }
        }
    }
    checkFunctionDeclarationNodeBody(node, sourceFile, result) {
        if (node.modifiers) {
            // 检查是否包含 export 修饰符
            const exportModifier = node.modifiers.find(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword);
            const asyncModifier = node.modifiers.find(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.AsyncKeyword);
            // 如果是 export async function，则错误位置在 export 和 async 之间
            if (exportModifier && asyncModifier) {
                const pos = exportModifier.end + 1;
                this.addIssue(result, sourceFile, pos, 'Missing return type on function.');
                return;
            }
            // 如果只有 export 修饰符
            if (exportModifier) {
                this.addIssue(result, sourceFile, node.modifiers.end + 1, 'Missing return type on function.');
            }
            else {
                this.addIssue(result, sourceFile, node.getStart(), 'Missing return type on function.');
            }
        }
        else {
            this.addIssue(result, sourceFile, node.getStart(), 'Missing return type on function.');
        }
    }
    checkVariableDeclaration(node, sourceFile, Options, result) {
        const initializer = node.initializer;
        const isSelfExported = this.isParentExported(node);
        if (!isSelfExported) {
            return;
        }
        if (initializer && (arkanalyzer_1.ts.isArrowFunction(initializer) || arkanalyzer_1.ts.isFunctionExpression(initializer))) {
            for (const param of initializer.parameters) {
                if (!param.type) {
                    this.addIssue(result, sourceFile, param.getStart(), this.checkArgument(param.name.getText()));
                }
                if (param.type && param.type.kind === arkanalyzer_1.ts.SyntaxKind.AnyKeyword &&
                    !Options.allowArgumentsExplicitlyTypedAsAny) {
                    this.addIssue(result, sourceFile, param.name.getStart(), this.checkNonAnyArgument(param.name.getText()));
                }
            }
            if (!initializer.type) {
                if (Options.allowDirectConstAssertionInArrowFunctions && this.hasAsExpression(initializer)) {
                    return;
                }
                let startNumber = initializer.getStart();
                if (arkanalyzer_1.ts.isArrowFunction(initializer)) {
                    startNumber = initializer.equalsGreaterThanToken?.getStart();
                }
                this.addIssue(result, sourceFile, startNumber, 'Missing return type on function.');
            }
        }
        else if (initializer && arkanalyzer_1.ts.isObjectLiteralExpression(initializer)) {
            // 检查对象字面量
            this.checkObjectLiteralExpression(initializer, sourceFile, Options, result);
        }
    }
    checkObjectLiteralExpression(initializer, sourceFile, Options, result) {
        // 遍历对象字面量的属性
        for (const property of initializer.properties) {
            if (arkanalyzer_1.ts.isPropertyAssignment(property)) {
                this.checkObjectLiteralExpressionProperty(property, sourceFile, Options, result);
            }
            else if (arkanalyzer_1.ts.isMethodDeclaration(property)) {
                // 检查简写方法声明，如 { func2() { return 0; } }
                this.checkObjectLiteralMethodDeclaration(property, sourceFile, Options, result);
            }
        }
    }
    // 检查对象字面量中的简写方法
    checkObjectLiteralMethodDeclaration(method, sourceFile, Options, result) {
        // 检查方法是否有返回类型
        if (!method.type) {
            this.addIssue(result, sourceFile, method.name.getStart(), 'Missing return type on function.');
        }
        // 检查参数类型
        for (const param of method.parameters) {
            if (!param.type) {
                this.addIssue(result, sourceFile, param.getStart(), this.checkArgument(param.name.getText()));
            }
        }
    }
    checkObjectLiteralExpressionProperty(property, sourceFile, Options, result) {
        const name = property.name;
        const value = property.initializer || property;
        // 检查属性值是否为函数表达式或箭头函数
        if (value && (arkanalyzer_1.ts.isFunctionExpression(value) || arkanalyzer_1.ts.isArrowFunction(value))) {
            const func = value;
            // 检查函数表达式的返回类型注解
            if (!func.type && !Options.allowTypedFunctionExpressions) {
                this.addIssue(result, sourceFile, func.parent.getStart(), 'Missing return type on function.');
            }
            // 检查函数参数的类型注解
            for (const param of func.parameters) {
                if (!param.type) {
                    this.addIssue(result, sourceFile, param.getStart(), this.checkArgument(param.name.getText()));
                }
            }
        }
    }
    checkDotAnyArgument(arg) {
        // 去除首尾空格
        const trimmedArg = arg.trim();
        // 检查是否是对象模式（以 '{' 开头，以 '}' 结尾）
        if (trimmedArg.startsWith('{') && trimmedArg.endsWith('}')) {
            return 'Rest argument should be typed with a non-any type.';
        }
        // 检查是否是数组模式（以 '[' 开头，以 ']' 结尾）
        if (trimmedArg.startsWith('[') && trimmedArg.endsWith(']')) {
            return 'Rest argument should be typed with a non-any type.';
        }
        // 其他情况（普通变量）
        return `Argument '${trimmedArg}' should be typed with a non-any type.`;
    }
    checkDotArgument(arg) {
        // 去除首尾空格
        const trimmedArg = arg.trim();
        // 检查是否是对象模式（以 '{' 开头，以 '}' 结尾）
        if (trimmedArg.startsWith('{') && trimmedArg.endsWith('}')) {
            return 'Rest argument should be typed.';
        }
        // 检查是否是数组模式（以 '[' 开头，以 ']' 结尾）
        if (trimmedArg.startsWith('[') && trimmedArg.endsWith(']')) {
            return 'Rest argument should be typed.';
        }
        // 其他情况（普通变量）
        return `Argument '${trimmedArg}' should be typed.`;
    }
    checkNonAnyArgument(arg) {
        // 去除首尾空格
        const trimmedArg = arg.trim();
        // 检查是否是对象模式（以 '{' 开头，以 '}' 结尾）
        if (trimmedArg.startsWith('{') && trimmedArg.endsWith('}')) {
            return 'Object pattern argument should be typed with a non-any type.';
        }
        // 检查是否是数组模式（以 '[' 开头，以 ']' 结尾）
        if (trimmedArg.startsWith('[') && trimmedArg.endsWith(']')) {
            return 'Array pattern argument should be typed with a non-any type.';
        }
        // 其他情况（普通变量）
        return `Argument '${trimmedArg}' should be typed with a non-any type.`;
    }
    checkArgument(arg) {
        // 去除首尾空格
        const trimmedArg = arg.trim();
        // 检查是否是对象模式（以 '{' 开头，以 '}' 结尾）
        if (trimmedArg.startsWith('{') && trimmedArg.endsWith('}')) {
            return 'Object pattern argument should be typed.';
        }
        // 检查是否是数组模式（以 '[' 开头，以 ']' 结尾）
        if (trimmedArg.startsWith('[') && trimmedArg.endsWith(']')) {
            return 'Array pattern argument should be typed.';
        }
        // 其他情况（普通变量）
        return `Argument '${trimmedArg}' should be typed.`;
    }
    /**
    * 添加问题报告。
    */
    addIssue(result, sourceFile, pos, description) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
        result.push({
            fileName: sourceFile.fileName,
            line: line + 1,
            character: character + 1,
            description: description,
        });
    }
    addIssueReportNode(loc, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (loc.description) {
            this.metaData.description = loc.description;
        }
        let defect = new Defects_1.Defects(loc.line, loc.character, loc.character, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.ExplicitModuleBoundaryTypesCheck = ExplicitModuleBoundaryTypesCheck;
