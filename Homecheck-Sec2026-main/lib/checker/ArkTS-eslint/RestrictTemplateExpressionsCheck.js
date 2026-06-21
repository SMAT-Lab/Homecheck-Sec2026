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
exports.RestrictTemplateExpressionsCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
// 默认配置选项
const defaultOptions = {
    allowAny: true,
    allowBoolean: true,
    allowNullish: true,
    allowNumber: true,
    allowRegExp: true,
};
// 设置日志记录器
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'RestrictTemplateExpressionsCheck');
const strRegex = /^'[^']*'$|^"[^"]*"$/;
// 规则元数据
const gmetaData = {
    severity: 2,
    ruleDocPath: 'docs/restrict-template-expressions.md',
    description: 'Enforce template literal expressions to be of string type',
    messages: {
        invalidType: 'Invalid type "{{type}}" of template literal expression.'
    }
};
/**
 * 限制模板表达式类型的检查器
 * 该规则强制要求模板字符串表达式为字符串类型
 */
class RestrictTemplateExpressionsCheck {
    metaData = gmetaData;
    rule;
    defects = [];
    issues = [];
    globalStmt;
    globalArkMethod;
    rootNode;
    errorPositions = [];
    // 文件匹配器
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    // 记录已检查过的类型，避免递归检查无限循环
    checkedTypes = new Set();
    /**
     * 注册匹配器回调
     * @returns 匹配器回调
     */
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    /**
     * 获取规则配置选项
     * @returns 规则配置选项
     */
    getOptions() {
        if (this.rule && this.rule.option.length > 0) {
            return { ...defaultOptions, ...this.rule.option[0] };
        }
        return defaultOptions;
    }
    /**
     * 检查单个语句
     * @param stmt 语句
     */
    checkStatement(stmt) {
        // 获取语句的原始文本
        const originalText = stmt.getOriginalText();
        if (!originalText) {
            return;
        }
        // 检查语句是否包含模板字符串
        if (!this.containsTemplateString(originalText)) {
            return;
        }
        this.globalStmt = stmt;
        let tsNode = lib_1.AstTreeUtils.getASTNode('template', originalText);
        this.rootNode = tsNode.statements[0];
        this.checkAssignmentStatement(this.rootNode);
    }
    /**
     * 判断是否应该跳过检查该节点
     * @param node 要检查的节点
     * @returns 如果应该跳过则返回true
     */
    shouldSkipNode(node) {
        // 跳过 String.raw/valueOf 标签模板表达式
        if (lib_1.ts.isTaggedTemplateExpression(node) &&
            lib_1.ts.isPropertyAccessExpression(node.tag) &&
            lib_1.ts.isIdentifier(node.tag.expression) &&
            node.tag.expression.text === 'String' &&
            (node.tag.name.text === 'raw' || node.tag.name.text === 'valueOf')) {
            return true;
        }
        // 跳过嵌套在String()函数中的表达式
        if (lib_1.ts.isCallExpression(node) &&
            lib_1.ts.isIdentifier(node.expression) &&
            node.expression.text === 'String') {
            return true;
        }
        // 可以添加更多的条件来跳过其他类型的节点
        return false;
    }
    /**
     * 检查赋值语句
     * @param astree 表达式
     */
    checkAssignmentStatement(astree) {
        if (this.shouldSkipNode(astree)) {
            return;
        }
        if (lib_1.ts.isTemplateExpression(astree)) {
            this.checkExpressionForTemplates(astree);
            return;
        }
        astree.forEachChild(child => {
            this.checkAssignmentStatement(child);
        });
    }
    /**
     * 在表达式中查找并检查模板表达式
     * @param node 表达式
     */
    checkExpressionForTemplates(node) {
        // 检查各种类型的表达式
        if (lib_1.ts.isTaggedTemplateExpression(node)) {
            return;
        }
        node.templateSpans.forEach(span => {
            let type = this.getUnderlyingType(span.expression);
            if (type && !this.isInnerUnionOrIntersectionConformingTo(type)) {
                let typeString = this.getUnderlyingTypeString(type);
                this.report(span, typeString);
            }
        });
    }
    /**
     * 获取实际类型的字符串表示
     * @param type 类型
     * @returns 实际类型的字符串表示
     */
    getUnderlyingTypeString(type) {
        if (type instanceof lib_1.ClassType) {
            let className = type.getClassSignature().getClassName();
            let arkCls = this.globalArkMethod.getDeclaringArkFile().getClassWithName(className);
            if (!className.includes('%')) {
                return `${className}`;
            }
            if (arkCls) {
                let clsString = '{';
                arkCls.getFields().forEach(field => {
                    clsString += `${field.getName()}:${this.getUnderlyingTypeString(field.getType())};`;
                });
                clsString += '}';
                return clsString;
            }
            return type.toString();
        }
        if (type instanceof lib_1.FunctionType) {
            let subSignature = type.getMethodSignature().getMethodSubSignature();
            let params = subSignature.getParameters().map(param => {
                return `${param.getName()}:${this.getUnderlyingTypeString(param.getType())}`;
            }).join(',');
            return ` (${params}) => ${this.getUnderlyingTypeString(subSignature.getReturnType())}`;
        }
        if (type instanceof lib_1.IntersectionType) {
            return type.getTypes().map(t => this.getUnderlyingTypeString(t)).join('&');
        }
        if (type instanceof lib_1.UnionType) {
            return type.getTypes().map(t => this.getUnderlyingTypeString(t)).join('|');
        }
        if (type instanceof lib_1.UnknownType) {
            return 'any';
        }
        return type.toString();
    }
    /**
     * 报告错误
     * @param node 节点
     * @param type 类型
     */
    report(node, type) {
        if (!this.rootNode) {
            return;
        }
        let { line, character } = this.rootNode.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        let startLine = this.globalStmt.getOriginPositionInfo().getLineNo();
        let startCol = this.globalStmt.getOriginPositionInfo().getColNo();
        this.errorPositions.push({ line: line + startLine, colum: character + startCol, sourceCode: node.getText(), type: type });
    }
    /**
     * 获取表达式的实际类型
     * @param span 表达式
     * @returns 表达式的实际类型
     */
    getUnderlyingType(span) {
        if (lib_1.ts.isIdentifier(span)) {
            let type = this.getTypeByName(span.text);
            if (type instanceof lib_1.GenericType) {
                let constraint = type.getConstraint();
                let defaultType = type.getDefaultType();
                type = constraint ? constraint : defaultType ?? type;
            }
            if (type instanceof lib_1.AliasType) {
                type = type.getOriginalType();
            }
            if (lib_1.ts.isConditionalExpression(span.parent.parent.parent)) {
                return this.checkConditionalExpressionType(span, type);
            }
            return type;
        }
        if (lib_1.ts.isStringLiteral(span)) {
            return lib_1.StringType.getInstance();
        }
        if (lib_1.ts.isNumericLiteral(span)) {
            return new lib_1.UnclearReferenceType(span.getText());
        }
        return this.getUnderlyingTypeForExpression(span);
    }
    getUnderlyingTypeForExpression(span) {
        if (lib_1.ts.isCallExpression(span) && lib_1.ts.isPropertyAccessExpression(span.expression) &&
            lib_1.ts.isIdentifier(span.expression.expression) && span.expression.expression.text === 'Promise') {
            let types = span.arguments.map(arg => this.getUnderlyingType(arg));
            let filterTypes = types.filter(t => t !== undefined);
            return new lib_1.UnclearReferenceType('Promise', filterTypes.length > 0 ? filterTypes : [lib_1.VoidType.getInstance()]);
        }
        if (lib_1.ts.isPropertyAccessExpression(span) && lib_1.ts.isIdentifier(span.expression)) {
            return this.getUnderlyingTypeForPropertyAccessExpression(span);
        }
        if (lib_1.ts.isAsExpression(span)) {
            return this.getUnderlyingTypeForAsExpression(span);
        }
        if (lib_1.ts.isArrayLiteralExpression(span)) {
            let types = span.elements.map(arg => this.getUnderlyingTypeForArray(arg));
            let filterTypes = types.filter(t => t !== undefined);
            return this.getArrayElementType(filterTypes);
        }
        if (lib_1.ts.isNewExpression(span) && lib_1.ts.isIdentifier(span.expression)) {
            return new lib_1.UnclearReferenceType(span.expression.text);
        }
        if (lib_1.ts.isBinaryExpression(span)) {
            return this.getUnderTypeBinaryExpression(span);
        }
        if (lib_1.ts.isOmittedExpression(span)) {
            return lib_1.UndefinedType.getInstance();
        }
        return undefined;
    }
    getUnderlyingTypeForPropertyAccessExpression(span) {
        if (!lib_1.ts.isIdentifier(span.expression)) {
            return undefined;
        }
        let type = this.getTypeByName(span.expression.text);
        if (type instanceof lib_1.UnknownType || type === undefined) {
            return lib_1.AnyType.getInstance();
        }
        if (type instanceof lib_1.UnionType) {
            let classTypes = type.getTypes().map(ty => {
                if (!(ty instanceof lib_1.ClassType)) {
                    return ty;
                }
                let arkFile = this.globalArkMethod.getDeclaringArkClass().getDeclaringArkFile();
                let arkCls = arkFile.getClassWithName(ty.getClassSignature().getClassName());
                let field = arkCls?.getFieldWithName(span.name.text);
                if (field) {
                    return field.getType();
                }
                return ty;
            });
            return new lib_1.UnionType(classTypes);
        }
        return type;
    }
    getUnderlyingTypeForAsExpression(node) {
        if (node.type.kind === lib_1.ts.SyntaxKind.NumberKeyword) {
            return lib_1.NumberType.getInstance();
        }
        if (node.type.kind === lib_1.ts.SyntaxKind.StringKeyword) {
            return lib_1.StringType.getInstance();
        }
        if (node.type.kind === lib_1.ts.SyntaxKind.BooleanKeyword) {
            return lib_1.BooleanType.getInstance();
        }
        return undefined;
    }
    getUnderlyingTypeForArray(span) {
        if (lib_1.ts.isOmittedExpression(span)) {
            return lib_1.UndefinedType.getInstance();
        }
        if (lib_1.ts.isStringLiteral(span)) {
            return lib_1.StringType.getInstance();
        }
        if (lib_1.ts.isNumericLiteral(span)) {
            return lib_1.NumberType.getInstance();
        }
        return this.getUnderlyingType(span);
    }
    /**
     * 获取数组元素的类型
     * @param types 类型数组
     * @returns 数组元素的类型
     */
    getArrayElementType(types) {
        // 获取数组中每个元素的类型
        if (types.length === 0) {
            // 空数组，返回 any[] 类型
            return new lib_1.ArrayType(lib_1.AnyType.getInstance(), 1);
        }
        else if (types.length === 1) {
            // 只有一种类型，直接使用该类型作为数组元素类型
            return new lib_1.ArrayType(types[0], 1);
        }
        // 检查是否所有类型都相同
        const firstTypeString = types[0].getTypeString();
        const allSameType = types.every(t => t.getTypeString() === firstTypeString);
        if (allSameType) {
            // 所有元素类型相同，直接使用第一个类型
            return new lib_1.ArrayType(types[0], 1);
        }
        else {
            // 有多种类型，创建联合类型
            return new lib_1.ArrayType(new lib_1.UnionType(types), 1);
        }
    }
    /**
     * 获取二元表达式的类型
     * @param span 表达式
     * @returns 表达式的类型
     */
    getUnderTypeBinaryExpression(span) {
        // 获取左右两侧的类型
        let leftType = this.getUnderlyingType(span.left);
        let rightType = this.getUnderlyingType(span.right);
        // 特别处理逻辑或运算符 (||)
        if (span.operatorToken.kind === lib_1.ts.SyntaxKind.BarBarToken) {
            // 如果两边都有类型，创建联合类型
            if (leftType && rightType) {
                // 先检查两个类型是否相同，避免创建不必要的联合类型
                if (leftType.getTypeString() === rightType.getTypeString()) {
                    return leftType; // 如果类型相同，直接返回左侧类型
                }
                if ([leftType, rightType].some(t => t instanceof lib_1.StringType)) {
                    return [leftType, rightType].find(t => !(t instanceof lib_1.StringType));
                }
                // 类型不同，创建联合类型
                return new lib_1.UnionType([leftType, rightType]);
            }
            // 如果只有一边有类型，返回那一边的类型
            return leftType || rightType;
        }
        // 其他二元运算符（如+, -, *, / 等）
        const types = [];
        if (leftType && !this.hasType(types, leftType)) {
            types.push(leftType);
        }
        if (rightType && !this.hasType(types, rightType)) {
            types.push(rightType);
        }
        if (types.every(ty => /^\d+$/.test(ty.getTypeString()))) {
            return lib_1.NumberType.getInstance();
        }
        if (types.length === 1) {
            return types[0];
        }
        else if (types.length > 1) {
            // 有不同类型，创建联合类型
            return new lib_1.UnionType(types);
        }
        return undefined;
    }
    hasType(types, type) {
        return types.some(t => t.getTypeString() === type.getTypeString());
    }
    /**
     * 检查父节点
     * @param node 当前节点
     * @returns 父节点
     */
    checkParentNode(node) {
        node = node.parent;
        if (lib_1.ts.isSwitchStatement(node) || lib_1.ts.isConditionalExpression(node) || lib_1.ts.isIfStatement(node)) {
            return node;
        }
        node.forEachChild(child => this.checkParentNode(child));
        return undefined;
    }
    /**
     * 检查条件表达式中的类型
     * @param span 当前节点
     * @param type 变量的实际类型
     * @returns 根据条件表达式判断后的类型
     */
    checkConditionalExpressionType(span, type) {
        let conditionalExpr = span.parent.parent.parent;
        if (lib_1.ts.isBinaryExpression(conditionalExpr.condition)) {
            let binaryExpr = conditionalExpr.condition;
            if (lib_1.ts.isTypeOfExpression(binaryExpr.left) &&
                lib_1.ts.isStringLiteral(binaryExpr.right)) {
                // 如果是 whenFalse 分支中的模板表达式，根据 typeof 检查的类型判断
                if (span.parent.parent === conditionalExpr.whenFalse && type &&
                    type.getTypeString().toLowerCase() === binaryExpr.right.text) {
                    return lib_1.NeverType.getInstance();
                }
            }
        }
        return type;
    }
    /**
     * 获取变量的实际类型
     * @param name 变量名
     * @returns 变量的实际类型
     */
    getTypeByName(name) {
        let type = undefined;
        //先检查是否当前方法入参变量
        this.globalArkMethod.getParameters().forEach(parameter => {
            if (parameter.getName() === name) {
                type = parameter.getType();
            }
        });
        if (type) {
            return type;
        }
        //再检查是否当前方法的局部变量
        let declarStmt = this.globalArkMethod.getBody()?.getCfg().getStmts().find(stmt => {
            if (stmt instanceof lib_1.ArkAssignStmt && stmt.getLeftOp() instanceof lib_1.Local) {
                let leftLocal = stmt.getLeftOp();
                if (leftLocal.getName() === name) {
                    return stmt;
                }
            }
            return undefined;
        });
        if (declarStmt instanceof lib_1.ArkAssignStmt) {
            let rightOp = declarStmt.getRightOp();
            let leftOp = declarStmt.getLeftOp();
            let ast = this.getAstTree(declarStmt.getOriginalText() ?? '');
            if (leftOp instanceof lib_1.Local && (lib_1.ts.isVariableStatement(ast) || lib_1.ts.isVariableDeclaration(ast))) {
                type = this.getVariableType(ast, name, leftOp);
            }
            if (type) {
                return type;
            }
            if (leftOp) {
                type = leftOp.getType();
            }
            if (type === undefined && rightOp) {
                type = rightOp.getType();
            }
        }
        if (!type) {
            let method = this.globalArkMethod.getDeclaringArkClass().getMethodWithName(name);
            if (method) {
                type = new lib_1.FunctionType(method.getSignature());
            }
        }
        return type ? type : undefined;
    }
    getVariableType(ast, name, leftOp) {
        if (lib_1.ts.isVariableStatement(ast)) {
            let declaration = ast.declarationList.declarations.find(declaration => lib_1.ts.isIdentifier(declaration.name) && declaration.name.getText() === name);
            if (declaration) {
                return this.getVariableType(declaration, name, leftOp);
            }
        }
        if (lib_1.ts.isVariableDeclaration(ast) && !ast.type && ast.initializer) {
            if (lib_1.ts.isConditionalExpression(ast.initializer)) {
                let condition = ast.initializer;
                if (condition.whenTrue.kind !== condition.whenFalse.kind) {
                    let whenTrue = new lib_1.UnclearReferenceType(condition.whenTrue.getText());
                    let whenFalse = new lib_1.UnclearReferenceType(condition.whenFalse.getText());
                    return new lib_1.UnionType([whenTrue, whenFalse]);
                }
            }
            if (leftOp.getConstFlag() &&
                ([lib_1.ts.SyntaxKind.TrueKeyword, lib_1.ts.SyntaxKind.FalseKeyword].includes(ast.initializer.kind) ||
                    lib_1.ts.isNumericLiteral(ast.initializer))) {
                return new lib_1.UnclearReferenceType(ast.initializer.getText());
            }
        }
        if (lib_1.ts.isVariableDeclaration(ast) && ast.type && lib_1.ts.isUnionTypeNode(ast.type) &&
            ast.initializer && lib_1.ts.isLiteralExpression(ast.initializer)) {
            let literalType = ast.initializer.kind;
            if (literalType === lib_1.ts.SyntaxKind.StringLiteral) {
                return lib_1.StringType.getInstance();
            }
            if (literalType === lib_1.ts.SyntaxKind.NumericLiteral) {
                return lib_1.NumberType.getInstance();
            }
        }
        return undefined;
    }
    getAstTree(text) {
        let ast = lib_1.AstTreeUtils.getASTNode('template', text);
        return ast.statements[0] ?? ast;
    }
    /**
     * 检查是否为内部联合或交集类型
     * @param type 类型
     * @returns 是否为内部联合或交集类型
     */
    isInnerUnionOrIntersectionConformingTo(type) {
        if (type instanceof lib_1.UnionType) {
            return type.getTypes().every(t => {
                return this.isInnerUnionOrIntersectionConformingTo(t) || t instanceof lib_1.NeverType;
            });
        }
        if (type instanceof lib_1.IntersectionType) {
            return type.getTypes().some(t => this.isInnerUnionOrIntersectionConformingTo(t));
        }
        return this.isTypePrimitive(type);
    }
    /**
     * 检查是否为字符串类型
     * @param type 类型
     * @returns 是否为字符串类型
     */
    isStringType(type) {
        if (type instanceof lib_1.StringType) {
            return true;
        }
        if (type instanceof lib_1.UnclearReferenceType) {
            const typeName = type.getName();
            if (strRegex.test(typeName)) {
                return true;
            }
        }
        return false;
    }
    /**
     * 检查是否为原始类型
     * @param type 类型
     * @returns 是否为原始类型
     */
    isTypePrimitive(type) {
        let options = this.getOptions();
        if (this.isStringType(type)) {
            return true;
        }
        if (options.allowNumber && this.isNumberType(type)) {
            return true;
        }
        if (options.allowBoolean && this.isBooleanType(type)) {
            return true;
        }
        if (options.allowAny && this.isAnyType(type)) {
            return true;
        }
        if (options.allowRegExp && this.isRegExpType(type)) {
            return true;
        }
        if (options.allowNullish && this.isNullishType(type)) {
            return true;
        }
        if (options.allowNever && this.isNeverType(type)) {
            return true;
        }
        return false;
    }
    /**
     * 检查是否为Any类型
     */
    isAnyType(type) {
        return type instanceof lib_1.AnyType || type instanceof lib_1.UnknownType ||
            (type instanceof lib_1.UnclearReferenceType && type.getName() === 'T');
    }
    /**
     * 检查是否为布尔类型
     */
    isBooleanType(type) {
        if (type instanceof lib_1.BooleanType) {
            return true;
        }
        if (type instanceof lib_1.UnclearReferenceType && ['boolean', 'Boolean', 'true', 'false'].includes(type.getName())) {
            return true;
        }
        return false;
    }
    /**
     * 检查是否为数字类型
     */
    isNumberType(type) {
        if (type instanceof lib_1.NumberType) {
            return true;
        }
        if (type instanceof lib_1.UnclearReferenceType &&
            (type.getName() === 'number' || type.getName() === 'Number' || /^\d+$/.test(type.getName()))) {
            return true;
        }
        return false;
    }
    /**
     * 检查是否为null或undefined类型
     */
    isNullishType(type) {
        return type instanceof lib_1.NullType || type instanceof lib_1.UndefinedType ||
            (type instanceof lib_1.UnclearReferenceType && (type.getName() === 'null' || type.getName() === 'Null'));
    }
    /**
     * 检查是否为RegExp类型
     */
    isRegExpType(type) {
        if (type instanceof lib_1.ClassType) {
            return type.getClassSignature().getClassName() === 'RegExp';
        }
        if (type instanceof lib_1.UnclearReferenceType) {
            return type.getName() === 'RegExp';
        }
        return false;
    }
    /**
     * 检查是否为Never类型（在ArkTS中可能没有直接对应）
     */
    isNeverType(type) {
        // 在ArkTS中可能没有直接对应never类型，这里简化处理
        // 可以根据实际需求调整此处逻辑
        return type instanceof lib_1.NeverType || type.toString().includes('never');
    }
    /**
     * 判断文本中是否包含模板字符串
     */
    containsTemplateString(text) {
        return /\$\{(.*?)\}/g.test(text);
    }
    /**
     * 检查Ark类
     * @param arkCls 类
     */
    checkArkCls(arkCls) {
        let methods = arkCls.getMethods();
        methods.forEach(method => {
            this.checkArkMethod(method);
        });
    }
    /**
     * 检查Ark方法
     * @param method 方法
     */
    checkArkMethod(method) {
        this.globalArkMethod = method;
        // 重置已检查类型的集合
        const statements = method.getBody()?.getCfg().getStmts() ?? [];
        // 遍历所有语句进行检查
        for (const stmt of statements) {
            this.checkStatement(stmt);
        }
    }
    /**
     * 检查方法入口点
     */
    check = (arkFile) => {
        // 重置已检查类型的集合
        this.checkedTypes.clear();
        arkFile.getClasses().forEach(cls => {
            this.checkArkCls(cls);
        });
        this.sortAndReportErrors(arkFile);
    };
    /**
     * 排序并报告错误
     * @param target 目标文件
     */
    sortAndReportErrors(target) {
        this.errorPositions.sort((a, b) => {
            if (a.line !== b.line) {
                return a.line - b.line;
            }
            return a.colum - b.colum;
        });
        this.errorPositions.forEach(position => {
            this.addIssueReport(target, position.line, position.colum, position.sourceCode, position.type);
        });
    }
    /**
     * 报告错误
     */
    addIssueReport(arkFile, lineNum, startColum, code, type) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let message = `Invalid type "${type}" of template literal expression.`;
        let filePath = arkFile.getFilePath();
        let endColum = startColum + code.length - 1;
        let defect = new Defects_1.Defects(lineNum, startColum, endColum, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.RestrictTemplateExpressionsCheck = RestrictTemplateExpressionsCheck;
