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
exports.PreferReadonlyCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PreferReadonly');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/prefer-readonly.md',
    description: 'Require private members to be marked as `readonly` if they are never modified outside of the constructor'
};
class PreferReadonlyCheck {
    defaultOption = { onlyInlineLambdas: false };
    option = this.defaultOption;
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    ;
    check = (arkFile) => {
        if (this.rule?.option?.[0]) {
            const ruleOption = this.rule.option[0];
            this.option.onlyInlineLambdas = ruleOption.onlyInlineLambdas ?? this.defaultOption.onlyInlineLambdas;
        }
        const astRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const processClassNode = (node) => {
            const classScope = new ClassScope(node);
            this.processClassAst(node, arkFile, classScope);
            this.checkUnmodifiedMembers(classScope, arkFile);
        };
        const processVariableStatement = (statement) => {
            statement.declarationList.declarations.forEach(declaration => {
                if (declaration.initializer && arkanalyzer_1.ts.isClassExpression(declaration.initializer)) {
                    processClassNode(declaration.initializer);
                }
            });
        };
        const processFunctionDeclaration = (declaration) => {
            this.visitFunctionDeclaration(declaration, arkFile);
        };
        astRoot.statements.forEach(child => {
            if (arkanalyzer_1.ts.isClassDeclaration(child) || arkanalyzer_1.ts.isClassExpression(child)) {
                processClassNode(child);
            }
            else if (arkanalyzer_1.ts.isVariableStatement(child)) {
                processVariableStatement(child);
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(child)) {
                processFunctionDeclaration(child);
            }
        });
    };
    visitFunctionDeclaration(node, arkFile) {
        if (node.body) {
            for (let statement of node.body.statements) {
                this.visitStatement(statement, arkFile);
            }
            ;
        }
        ;
    }
    ;
    processClassAst(node, arkFile, classScope) {
        // 循环遍历class的成员
        for (let member of node.members) {
            if (arkanalyzer_1.ts.isPropertyDeclaration(member)) {
                this.processPropertyDeclaration(member, classScope, arkFile);
            }
            else if (arkanalyzer_1.ts.isConstructorDeclaration(member)) {
                this.processConstructorDeclaration(member, classScope);
            }
            else if (arkanalyzer_1.ts.isMethodDeclaration(member)) {
                this.visitMethodDeclaration(member, classScope, arkFile);
            }
            else if (arkanalyzer_1.ts.isClassExpression(member)) {
                // 为嵌套类创建新的作用域
                let nestedClassScope = new ClassScope(member);
                this.processClassAst(member, arkFile, nestedClassScope);
                // 立即检查嵌套类的未修改成员
                this.checkUnmodifiedMembers(nestedClassScope, arkFile);
            }
            else if (arkanalyzer_1.ts.isSetAccessor(member)) {
                // 处理 setter 中的修改
                this.visitSetAccessor(member, classScope);
            }
            ;
        }
        ;
    }
    ;
    checkUnmodifiedMembers(classScope, arkFile) {
        classScope.finalizeUnmodifiedPrivateNonReadonlys().forEach(violatingNode => {
            try {
                this.processViolatingNode(violatingNode, arkFile);
            }
            catch (error) {
                logger.error(`Error processing violating node: ${error}`);
            }
        });
    }
    ;
    processViolatingNode(violatingNode, arkFile) {
        const { esNode, nameNode } = this.getEsNodesFromViolatingNode(violatingNode, arkFile);
        const isConstructorParam = this.isConstructorParameter(violatingNode);
        const { memberName, typeInfo } = this.getMemberInfo(violatingNode, nameNode, isConstructorParam);
        const errorMessager = `Member '${memberName}${typeInfo}' is never reassigned; mark it as \`readonly\`.`;
        const defect = isConstructorParam
            ? this.createDefect(nameNode, memberName, errorMessager)
            : this.createDefect(esNode, memberName, errorMessager);
        const fixValue = this.generateFixCode(esNode, nameNode.getText());
        const ruleFix = this.createFix(nameNode, fixValue);
        this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
    }
    ;
    /**判断节点是否是构造函数参数*/
    isConstructorParameter(node) {
        return arkanalyzer_1.ts.isParameter(node) && arkanalyzer_1.ts.isConstructorDeclaration(node.parent);
    }
    ;
    /** 获取成员名称和类型信息*/
    getMemberInfo(node, nameNode, isConstructorParam) {
        let typeInfo = '';
        let optionalMark = '';
        // 获取类型信息和可选标记
        if (arkanalyzer_1.ts.isPropertyDeclaration(node)) {
            if (node.questionToken) {
                optionalMark = '?';
            }
            ;
        }
        else if (arkanalyzer_1.ts.isParameterPropertyDeclaration(node, node.parent)) {
            if (node.type && isConstructorParam) {
                typeInfo = ': ' + node.type.getText();
            }
            ;
            if (node.questionToken) {
                optionalMark = '?';
            }
            ;
        }
        ;
        // 处理成员名称
        let memberName = nameNode.getText();
        if (arkanalyzer_1.ts.isArrayBindingPattern(nameNode)) {
            memberName = `[${nameNode.elements.map(el => el.getText()).join(', ')}]`;
        }
        ;
        // 添加可选标记
        memberName = memberName + optionalMark;
        return { memberName, typeInfo };
    }
    ;
    generateFixCode(esNode, code) {
        let fixKeyword = '';
        if (arkanalyzer_1.ts.isPropertyDeclaration(esNode) || esNode.getText().startsWith('private ')) {
            // 普通属性声明情况
            fixKeyword = 'readonly ' + code;
        }
        else if (arkanalyzer_1.ts.isParameter(esNode)) {
            // 参数属性情况
            const modifiers = esNode.modifiers || [];
            let hasPrivate = false;
            let hasReadonly = false;
            for (const mod of modifiers) {
                if (mod.kind === arkanalyzer_1.ts.SyntaxKind.PrivateKeyword) {
                    hasPrivate = true;
                }
                else if (mod.kind === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword) {
                    hasReadonly = true;
                }
                ;
            }
            ;
            if (hasPrivate && !hasReadonly) {
                // 替换第一个 private 关键字为 private readonly
                fixKeyword = esNode.getText().replace(/private\s+/, 'private readonly ');
            }
            ;
        }
        ;
        return fixKeyword;
    }
    ;
    /*** 处理class 中嵌套Method的语句*/
    visitMethodDeclaration(node, classScope, arkFile) {
        if (node.body) {
            for (let statement of node.body.statements) {
                if (arkanalyzer_1.ts.isReturnStatement(statement)) {
                    if (statement.expression && arkanalyzer_1.ts.isClassExpression(statement.expression)) {
                        // 为返回语句中的类创建新的作用域
                        let nestedClassScope = new ClassScope(statement.expression);
                        this.processClassAst(statement.expression, arkFile, nestedClassScope);
                        // 立即检查嵌套类的未修改成员
                        this.checkUnmodifiedMembers(nestedClassScope, arkFile);
                    }
                    ;
                }
                else if (arkanalyzer_1.ts.isClassExpression(statement)) {
                    // 为嵌套类创建新的作用域
                    let nestedClassScope = new ClassScope(statement);
                    this.processClassAst(statement, arkFile, nestedClassScope);
                    // 立即检查嵌套类的未修改成员
                    this.checkUnmodifiedMembers(nestedClassScope, arkFile);
                }
                else if (arkanalyzer_1.ts.isExpressionStatement(statement)) {
                    this.processMethodBody(statement, classScope);
                }
                ;
            }
            ;
        }
        ;
    }
    ;
    processMethodBody(statement, classScope) {
        this.checkCallbackDepth(statement, classScope);
    }
    ;
    checkCallbackDepth(methodAst, classScope) {
        this.checkNode(methodAst, classScope);
    }
    ;
    isInConstructorScope = (node) => {
        let current = node;
        while (current) {
            if (arkanalyzer_1.ts.isConstructorDeclaration(current)) {
                return true;
            }
            ;
            // 检查是否在构造函数中的函数表达式、箭头函数或访问器中
            if (arkanalyzer_1.ts.isFunctionExpression(current) || arkanalyzer_1.ts.isArrowFunction(current) ||
                arkanalyzer_1.ts.isGetAccessor(current) || arkanalyzer_1.ts.isSetAccessor(current)) {
                const parent = this.findConstructorParent(current);
                return !!parent;
            }
            ;
            current = current.parent;
        }
        ;
        return false;
    };
    /**检查节点是否在 setter 上下文中*/
    isInSetterContext = (node) => {
        let current = node;
        while (current) {
            if (arkanalyzer_1.ts.isSetAccessor(current)) {
                return true;
            }
            ;
            current = current.parent;
        }
        ;
        return false;
    };
    checkNode = (node, classScope) => {
        // 处理 setter 中的赋值
        this.handleSetterAssignment(node, classScope);
        // 处理一元运算符
        if (this.isNonModifyingUnaryExpression(node)) {
            return;
        }
        ;
        // 处理赋值表达式
        if (arkanalyzer_1.ts.isBinaryExpression(node) && this.isAssignmentExpression(node)) {
            this.handleAssignmentExpression(node, classScope);
            return;
        }
        ;
        // 处理删除操作
        this.handleDeleteExpression(node, classScope);
        // 处理前置或后置递增/递减操作
        this.handleUnaryIncrementExpression(node, classScope);
        // 递归处理子节点
        arkanalyzer_1.ts.forEachChild(node, (childNode) => this.checkNode(childNode, classScope));
    };
    /**
     * 处理 setter 中的赋值表达式
     */
    handleSetterAssignment(node, classScope) {
        if (this.isInSetterContext(node) && arkanalyzer_1.ts.isBinaryExpression(node) && this.isAssignmentExpression(node)) {
            if (arkanalyzer_1.ts.isPropertyAccessExpression(node.left) &&
                node.left.expression.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword) {
                classScope.addMutateModification(node.left);
            }
            ;
        }
        ;
    }
    ;
    /** 检查是否是非修改性的一元表达式*/
    isNonModifyingUnaryExpression(node) {
        if (arkanalyzer_1.ts.isPrefixUnaryExpression(node)) {
            const operand = node.operand;
            // 一元运算符不会修改值，所以不需要标记为修改
            if (node.operator === arkanalyzer_1.ts.SyntaxKind.MinusToken || node.operator === arkanalyzer_1.ts.SyntaxKind.PlusToken) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    /**
     * 处理赋值表达式
     */
    handleAssignmentExpression(node, classScope) {
        // 处理数组解构赋值
        if (arkanalyzer_1.ts.isArrayLiteralExpression(node.left)) {
            this.processArrayDestructuring(node.left, classScope, this.isInConstructorScope(node));
            return;
        }
        ;
        if (arkanalyzer_1.ts.isPropertyAccessExpression(node.left)) {
            this.handlePropertyAccessAssignment(node.left, classScope);
        }
        // 处理对象解构赋值
        else if (arkanalyzer_1.ts.isObjectLiteralExpression(node.left)) {
            this.processObjectLiteralProperties(node.left.properties, classScope, this.isInConstructorScope(node));
        }
        ;
    }
    ;
    /**
     * 处理属性访问赋值
     */
    handlePropertyAccessAssignment(leftExpr, classScope) {
        // 检查是否是对象属性的修改
        if (this.isObjectPropertyAccess(leftExpr)) {
            return;
        }
        ;
        // 检查是否是静态成员访问
        if (this.isStaticMemberAccess(leftExpr)) {
            classScope.addMutateModification(leftExpr);
            return;
        }
        ;
        // 检查是否是当前类的属性访问
        if (this.isInConstructorScope(leftExpr)) {
            classScope.addConstructorModification(leftExpr);
        }
        else {
            // 在 setter 中的修改也应该被标记为修改
            classScope.addMutateModification(leftExpr);
        }
        ;
    }
    ;
    /**
     * 处理删除表达式
     */
    handleDeleteExpression(node, classScope) {
        if (arkanalyzer_1.ts.isDeleteExpression(node)) {
            const deleteExpression = node.expression;
            if (arkanalyzer_1.ts.isPropertyAccessExpression(deleteExpression)) {
                classScope.addMutateModification(deleteExpression);
            }
            ;
        }
        ;
    }
    ;
    /**
     * 处理前置或后置递增/递减操作
     */
    handleUnaryIncrementExpression(node, classScope) {
        if (arkanalyzer_1.ts.isPrefixUnaryExpression(node) || arkanalyzer_1.ts.isPostfixUnaryExpression(node)) {
            if ('operand' in node && arkanalyzer_1.ts.isPropertyAccessExpression(node.operand)) {
                if (this.isInConstructorScope(node)) {
                    classScope.addConstructorModification(node.operand);
                }
                else {
                    classScope.addMutateModification(node.operand);
                }
                ;
            }
            ;
        }
        ;
    }
    ;
    processObjectLiteralProperties(properties, classScope, isInConstructor) {
        properties.forEach(property => {
            if (arkanalyzer_1.ts.isSpreadAssignment(property)) {
                this.handleSpreadAssignment(property, classScope, isInConstructor);
            }
            else if (arkanalyzer_1.ts.isPropertyAssignment(property)) {
                this.handlePropertyAssignment(property, classScope, isInConstructor);
            }
            ;
        });
    }
    ;
    handleSpreadAssignment(property, classScope, isInConstructor) {
        const spreadExpression = property.expression;
        if (arkanalyzer_1.ts.isPropertyAccessExpression(spreadExpression)) {
            if (isInConstructor) {
                classScope.addConstructorModification(spreadExpression);
            }
            else {
                classScope.addMutateModification(spreadExpression);
            }
            ;
        }
        ;
    }
    ;
    handlePropertyAssignment(property, classScope, isInConstructor) {
        const initializer = property.initializer;
        if (arkanalyzer_1.ts.isPropertyAccessExpression(initializer)) {
            if (isInConstructor) {
                classScope.addConstructorModification(initializer);
            }
            else {
                classScope.addMutateModification(initializer);
            }
            ;
        }
        ;
    }
    ;
    processArrayDestructuring(arrayLiteral, classScope, isInConstructor) {
        arrayLiteral.elements.forEach(element => {
            if (arkanalyzer_1.ts.isSpreadElement(element)) {
                // 处理展开运算符 [...this.value]
                const spreadExpression = element.expression;
                if (arkanalyzer_1.ts.isPropertyAccessExpression(spreadExpression)) {
                    if (isInConstructor) {
                        classScope.addConstructorModification(spreadExpression);
                    }
                    else {
                        classScope.addMutateModification(spreadExpression);
                    }
                    ;
                }
                ;
            }
            else if (arkanalyzer_1.ts.isPropertyAccessExpression(element)) {
                // 处理普通数组解构 [this.value]
                if (isInConstructor) {
                    classScope.addConstructorModification(element);
                }
                else {
                    classScope.addMutateModification(element);
                }
                ;
            }
            ;
        });
    }
    ;
    isObjectPropertyAccess(node) {
        return node.expression.kind !== arkanalyzer_1.ts.SyntaxKind.ThisKeyword && arkanalyzer_1.ts.isPropertyAccessExpression(node.expression);
    }
    ;
    findConstructorParent(node) {
        let current = node;
        while (current) {
            if (arkanalyzer_1.ts.isConstructorDeclaration(current)) {
                return current;
            }
            ;
            current = current.parent;
        }
        ;
        return undefined;
    }
    ;
    visitStatement(statement, arkFile) {
        if (arkanalyzer_1.ts.isReturnStatement(statement)) {
            if (statement.expression && arkanalyzer_1.ts.isClassExpression(statement.expression)) {
                let nestedClassScope = new ClassScope(statement.expression);
                this.processClassAst(statement.expression, arkFile, nestedClassScope);
                this.checkUnmodifiedMembers(nestedClassScope, arkFile);
            }
            ;
        }
        else if (arkanalyzer_1.ts.isClassExpression(statement)) {
            let nestedClassScope = new ClassScope(statement);
            this.processClassAst(statement, arkFile, nestedClassScope);
            this.checkUnmodifiedMembers(nestedClassScope, arkFile);
        }
        ;
    }
    ;
    getEsNodesFromViolatingNode(violatingNode, arkFile) {
        if (arkanalyzer_1.ts.isPropertyDeclaration(violatingNode)) {
            return {
                esNode: violatingNode,
                nameNode: violatingNode.name
            };
        }
        else if (arkanalyzer_1.ts.isParameterPropertyDeclaration(violatingNode, violatingNode.parent)) {
            return {
                esNode: violatingNode,
                nameNode: violatingNode.name
            };
        }
        else if (arkanalyzer_1.ts.isVariableDeclaration(violatingNode)) {
            return {
                esNode: violatingNode,
                nameNode: violatingNode.name
            };
        }
        else {
            // 如果不是上述类型，可以抛出错误或处理其他情况
            throw new Error('Unexpected node type in getEsNodesFromViolatingNode');
        }
        ;
    }
    ;
    processPropertyDeclaration(node, classScope, arkFile) {
        // 检查是否是私有成员（包括 private 修饰符和私有标识符 #）
        const isPrivate = arkanalyzer_1.ts.isPrivateIdentifier(node.name) || this.checkModifiers(node, 'private');
        //const isStatic = this.checkModifiers(node, 'static');
        // 如果既不是私有成员也不是静态私有成员，则返回
        if (!isPrivate) {
            return;
        }
        ;
        //配置options
        const initializer = node.initializer;
        if (initializer) {
            if (this.option.onlyInlineLambdas && !arkanalyzer_1.ts.isArrowFunction(initializer)) {
                return;
            }
            ;
        }
        ;
        //如果private 让 Readonly修饰了直接抛弃掉
        if (this.checkModifiers(node, 'Readonly')) {
            return;
        }
        ;
        // 如果字段带有 accessor 修饰符，则跳过处理
        if (this.checkModifiers(node, 'accessor')) {
            return;
        }
        ;
        classScope.addDeclaredVariable(node);
    }
    ;
    processConstructorDeclaration(node, classScope) {
        if (arkanalyzer_1.ts.isConstructorDeclaration(node)) {
            //循环遍历构造成员，检查里面是不是有 private 或者#
            for (let parameter of node.parameters) {
                // 检查是否是参数属性声明（带有访问修饰符的参数）
                if (arkanalyzer_1.ts.isParameterPropertyDeclaration(parameter, parameter.parent)) {
                    const initializer = parameter.initializer;
                    if (this.option.onlyInlineLambdas && initializer && !arkanalyzer_1.ts.isArrowFunction(initializer)) {
                        continue;
                    }
                    ;
                    // 检查参数是否有 private 修饰符
                    if (this.checkModifiers(parameter, 'private')) {
                        // 添加到声明变量中，无论是否为数组绑定模式
                        classScope.addDeclaredVariable(parameter);
                    }
                    ;
                }
                ;
            }
            ;
            //循环遍历构造成员，检查里面是不是有 this.#xxx = xxx;
            if (node.body) {
                this.processConstructorStatements(node.body.statements, classScope);
            }
            ;
        }
        ;
    }
    ;
    processConstructorStatements(statements, classScope) {
        for (const statement of statements) {
            // 处理函数表达式和箭头函数
            if (arkanalyzer_1.ts.isExpressionStatement(statement)) {
                const expr = statement.expression;
                if (arkanalyzer_1.ts.isCallExpression(expr) &&
                    (arkanalyzer_1.ts.isFunctionExpression(expr.expression) || arkanalyzer_1.ts.isArrowFunction(expr.expression))) {
                    this.processConstructorBody(expr.expression.body, classScope);
                }
                ;
            }
            // 处理对象字面量中的访问器和方法
            else if (arkanalyzer_1.ts.isVariableStatement(statement)) {
                const declarations = statement.declarationList.declarations;
                for (const decl of declarations) {
                    if (decl.initializer && arkanalyzer_1.ts.isObjectLiteralExpression(decl.initializer)) {
                        for (const prop of decl.initializer.properties) {
                            if (arkanalyzer_1.ts.isGetAccessorDeclaration(prop) || arkanalyzer_1.ts.isSetAccessorDeclaration(prop) ||
                                arkanalyzer_1.ts.isMethodDeclaration(prop)) {
                                this.processConstructorBody(prop.body, classScope);
                            }
                            ;
                        }
                        ;
                    }
                    ;
                }
                ;
            }
            ;
            // 处理其他语句
            this.processConstructorBody(statement, classScope);
        }
        ;
    }
    ;
    processConstructorBody(node, classScope) {
        this.checkCallbackDepth(node, classScope);
    }
    ;
    /**判断是不是有修改语句符号 */
    isAssignmentExpression(node) {
        return (arkanalyzer_1.ts.isBinaryExpression(node) && arkanalyzer_1.ts.isBinaryExpression(node) &&
            (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.PlusEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.MinusEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AsteriskEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.SlashEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.PercentEqualsToken));
    }
    ;
    checkModifiers(node, flag) {
        const nodeModifiers = arkanalyzer_1.ts.canHaveModifiers(node)
            ? arkanalyzer_1.ts.getModifiers(node)
            : undefined;
        const modifierKinds = new Set(nodeModifiers?.map((modifier) => modifier.kind));
        if (flag === 'private' && modifierKinds.has(arkanalyzer_1.ts.SyntaxKind.PrivateKeyword)) {
            return true;
        }
        ;
        if (flag === 'Readonly' && modifierKinds.has(arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword)) {
            return true;
        }
        ;
        if (flag === 'accessor' && modifierKinds.has(arkanalyzer_1.ts.SyntaxKind.AccessorKeyword)) {
            return true;
        }
        ;
        return false;
    }
    ;
    isStaticMemberAccess(node) {
        const expr = node.expression;
        if (!arkanalyzer_1.ts.isIdentifier(expr)) {
            return false;
        }
        ;
        // 获取标识符的声明
        const symbol = expr.getSourceFile().locals?.get(arkanalyzer_1.ts.escapeLeadingUnderscores(expr.text));
        if (!symbol) {
            return false;
        }
        ;
        // 检查是否是类声明
        const declarations = symbol.declarations;
        if (!declarations || declarations.length === 0) {
            return false;
        }
        ;
        // 检查是否是类名访问
        const isClass = declarations.some(decl => arkanalyzer_1.ts.isClassDeclaration(decl) || arkanalyzer_1.ts.isClassExpression(decl));
        if (!isClass) {
            return false;
        }
        ;
        // 检查访问的属性是否是静态成员
        const propertyName = node.name.text;
        for (const decl of declarations) {
            if (arkanalyzer_1.ts.isClassLike(decl)) {
                for (const member of decl.members) {
                    if (arkanalyzer_1.ts.isPropertyDeclaration(member) &&
                        member.name &&
                        (arkanalyzer_1.ts.isIdentifier(member.name) && member.name.text === propertyName ||
                            arkanalyzer_1.ts.isPrivateIdentifier(member.name) && member.name.text === propertyName) &&
                        this.checkModifiers(member, 'static')) {
                        return true;
                    }
                    ;
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    createDefect(node, keyword, errMesaging) {
        const warnInfo = this.getLineAndColumn(node);
        const filePath = warnInfo.filePath;
        let lineNum = warnInfo.line;
        let startColum = warnInfo.startCol;
        let endColumn = warnInfo.endCol;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(lineNum, startColum, endColumn, errMesaging, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.defects.push(defect);
        DefectsList_1.RuleListUtil.push(defect);
        return defect;
    }
    ;
    createFix(child, code) {
        return { range: [child.getStart(), child.getEnd()], text: code };
    }
    ;
    getLineAndColumn(node) {
        const sourceFile = node.getSourceFile();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const endCharacter = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).character;
        return {
            line: line + 1,
            startCol: character + 1,
            endCol: endCharacter + 1,
            filePath: sourceFile.fileName
        };
    }
    ;
    /** 处理 setter 中的修改情况*/
    visitSetAccessor(node, classScope) {
        if (node.body) {
            // 遍历 setter 中的语句，检查是否有对类成员的修改
            for (const statement of node.body.statements) {
                this.checkNode(statement, classScope);
            }
            ;
        }
        ;
    }
    ;
}
exports.PreferReadonlyCheck = PreferReadonlyCheck;
;
class ClassScope {
    classDeclaration;
    privateModifiableMembers = new Map(); // 私有可修改成员
    constructorModifications = new Set(); // 构造函数中的修改
    mutateModifications = new Set(); // mutate 方法中的修改
    memberInitialValues = new Map(); // 存储成员初始值
    constructor(classDeclaration) {
        this.classDeclaration = classDeclaration;
    }
    addDeclaredVariable(node) {
        // 处理普通的属性声明
        if (arkanalyzer_1.ts.isPropertyDeclaration(node)) {
            const { name, modifiers, initializer } = node;
            if (!name || !(arkanalyzer_1.ts.isIdentifier(name) || arkanalyzer_1.ts.isPrivateIdentifier(name))) {
                return;
            }
            const hasReadonly = modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword);
            if (hasReadonly) {
                return;
            }
            ;
            const memberName = name.text;
            this.privateModifiableMembers.set(node.getText(), node);
            if (initializer) {
                this.memberInitialValues.set(memberName, initializer.getText());
            }
            ;
            return;
        }
        ;
        // 处理构造函数参数属性
        if (arkanalyzer_1.ts.isParameter(node) && arkanalyzer_1.ts.isConstructorDeclaration(node.parent)) {
            const { modifiers, name, initializer } = node;
            const isPrivate = modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.PrivateKeyword);
            const hasReadonly = modifiers?.some(mod => mod.kind === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword);
            if (!isPrivate || hasReadonly) {
                return;
            }
            ;
            if (arkanalyzer_1.ts.isIdentifier(name)) {
                const memberName = name.text;
                this.privateModifiableMembers.set(node.getText(), node);
                if (initializer) {
                    this.memberInitialValues.set(memberName, initializer.getText());
                }
                ;
            }
            else if (arkanalyzer_1.ts.isArrayBindingPattern(name)) {
                this.privateModifiableMembers.set(node.getText(), node);
            }
            ;
        }
        ;
    }
    ;
    addConstructorModification(node) {
        if (node.name && (arkanalyzer_1.ts.isIdentifier(node.name) || arkanalyzer_1.ts.isPrivateIdentifier(node.name))) {
            const memberName = node.name.text;
            // 检查是否在方法声明、对象字面量方法或函数表达式内部
            let current = node;
            while (current.parent) {
                if (arkanalyzer_1.ts.isMethodDeclaration(current.parent) ||
                    arkanalyzer_1.ts.isFunctionExpression(current.parent) ||
                    arkanalyzer_1.ts.isArrowFunction(current.parent) ||
                    arkanalyzer_1.ts.isMethodDeclaration(current.parent) ||
                    arkanalyzer_1.ts.isObjectLiteralExpression(current.parent)) {
                    // 如果在这些位置内部，将其视为构造函数外的修改
                    this.mutateModifications.add(memberName);
                    return;
                }
                ;
                current = current.parent;
            }
            ;
            // 获取赋值表达式的右侧值
            let parent = node.parent;
            if (arkanalyzer_1.ts.isBinaryExpression(parent) && parent.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
                const newValue = parent.right.getText();
                const initialValue = this.memberInitialValues.get(memberName);
                // 即使值相同，也不认为是真正的修改，这样可以上报建议使用 readonly
                if (initialValue === undefined || (initialValue !== undefined && newValue === initialValue)) {
                    // 不添加到 constructorModifications，这样就会被认为是未修改的
                    return;
                }
                ;
                this.constructorModifications.add(memberName);
            }
            else {
                // 如果不是简单的赋值，保守起见认为是修改
                this.constructorModifications.add(memberName);
            }
            ;
        }
        ;
    }
    ;
    addMutateModification(node) {
        if (node.name && (arkanalyzer_1.ts.isIdentifier(node.name) || arkanalyzer_1.ts.isPrivateIdentifier(node.name))) {
            const memberName = node.name.text;
            // 检查表达式是否是this关键字访问
            const isThisAccess = arkanalyzer_1.ts.isPropertyAccessExpression(node) &&
                node.expression.kind === arkanalyzer_1.ts.SyntaxKind.ThisKeyword;
            // 如果是通过this访问的属性，则标记为修改
            if (isThisAccess) {
                this.mutateModifications.add(memberName);
                return;
            }
            ;
            // 检查是否是修改其他类实例的属性
            const expression = node.expression;
            if (arkanalyzer_1.ts.isIdentifier(expression)) {
                // 查找最近的方法声明
                let current = node;
                while (current) {
                    if (arkanalyzer_1.ts.isMethodDeclaration(current)) {
                        // 检查是否是参数
                        const isParameter = current.parameters.some(param => arkanalyzer_1.ts.isIdentifier(param.name) && param.name.text === expression.text &&
                            param.type && arkanalyzer_1.ts.isTypeReferenceNode(param.type) &&
                            arkanalyzer_1.ts.isIdentifier(param.type.typeName) &&
                            param.type.typeName.text !== this.classDeclaration.name?.text);
                        if (isParameter) {
                            return; // 如果是其他类型的参数，不记录这个修改
                        }
                        ;
                    }
                    ;
                    current = current.parent;
                }
                ;
            }
            ;
            this.mutateModifications.add(memberName);
        }
        ;
    }
    ;
    isStaticMember(node) {
        const nodeModifiers = arkanalyzer_1.ts.canHaveModifiers(node) ? arkanalyzer_1.ts.getModifiers(node) : undefined;
        const modifierKinds = new Set(nodeModifiers?.map((modifier) => modifier.kind));
        return modifierKinds.has(arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
    }
    ;
    finalizeUnmodifiedPrivateNonReadonlys() {
        // 创建一个结果集合，用于存储未修改的成员
        const result = [];
        // 遍历所有私有可修改成员
        this.privateModifiableMembers.forEach((node) => {
            if (this.shouldIncludeNode(node)) {
                result.push(node);
            }
            ;
        });
        return result;
    }
    ;
    shouldIncludeNode(node) {
        let shouldInclude = true;
        if (arkanalyzer_1.ts.isPropertyDeclaration(node) && (arkanalyzer_1.ts.isIdentifier(node.name) || arkanalyzer_1.ts.isPrivateIdentifier(node.name))) {
            const memberName = node.name.text;
            shouldInclude = !this.isMemberModified(memberName);
        }
        else if (arkanalyzer_1.ts.isParameter(node) && arkanalyzer_1.ts.isIdentifier(node.name)) {
            const memberName = node.name.text;
            shouldInclude = !this.isMemberModified(memberName);
        }
        else if (arkanalyzer_1.ts.isParameter(node) && arkanalyzer_1.ts.isArrayBindingPattern(node.name)) {
            shouldInclude = this.checkArrayBindingPattern(node.name);
        }
        ;
        return shouldInclude;
    }
    ;
    isMemberModified(memberName) {
        return this.constructorModifications.has(memberName) || this.mutateModifications.has(memberName);
    }
    ;
    checkArrayBindingPattern(name) {
        for (const element of name.elements) {
            if (arkanalyzer_1.ts.isBindingElement(element) && arkanalyzer_1.ts.isIdentifier(element.name)) {
                const elementName = element.name.text;
                if (this.isMemberModified(elementName)) {
                    return false;
                }
                ;
            }
            ;
        }
        ;
        return true;
    }
    ;
}
;
