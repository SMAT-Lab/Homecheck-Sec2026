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
exports.NoMagicNumbersCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const arkanalyzer_1 = require("arkanalyzer");
const Defects_2 = require("../../model/Defects");
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/no-magic-numbers.md',
    description: 'Magic number found: ${magicNumber}. Consider using a named constant'
};
;
// 最大数组长度常量
const MAX_ARRAY_LENGTH = Math.pow(2, 32) - 1;
class NoMagicNumbersCheck {
    defaultOption = {
        ignoreEnums: false,
        ignoreNumericLiteralTypes: false,
        ignoreReadonlyClassProperties: false,
        ignoreTypeIndexes: false,
        detectObjects: false,
        enforceConst: false,
        ignore: [],
        ignoreArrayIndexes: false,
        ignoreDefaultValues: false,
        ignoreClassFieldInitialValues: false
    };
    option = { ...this.defaultOption };
    metaData = gMetaData;
    defects = [];
    issues = [];
    rule;
    ignoreSet = new Set();
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchfileBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchfileBuildCb];
    }
    ;
    check = (targetFile) => {
        if (this.rule && this.rule.option && this.rule.option[0]) {
            const ruleOption = this.rule.option[0];
            this.option = { ...this.defaultOption, ...ruleOption };
        }
        // 处理ignore配置项
        this.ignoreSet = new Set((this.option.ignore || []).map(this.normalizeIgnoreValue));
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetFile);
        const results = this.checkMagicNumbers(sourceFile);
        results.forEach(result => {
            this.addIssueReport(result.line, result.character, result.endcode, targetFile.getFilePath(), result.message);
        });
    };
    normalizeIgnoreValue(value) {
        if (typeof value === 'string' && value.endsWith('n')) {
            return Number(value.slice(0, -1));
        }
        ;
        return Number(value);
    }
    ;
    isIgnoredValue(value) {
        return this.ignoreSet.has(value);
    }
    ;
    checkMagicNumbers(sourceFile) {
        const results = [];
        const visitNode = (node) => {
            if (lib_1.ts.isNumericLiteral(node) || lib_1.ts.isBigIntLiteral(node)) {
                this.processNumericNode(node, sourceFile, results);
            }
            ;
            lib_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return results;
    }
    ;
    processNumericNode(node, sourceFile, results) {
        const { fullNumberNode, value, raw } = this.getFullNumberNodeInfo(node, sourceFile);
        let parent = fullNumberNode.parent;
        // 处理括号表达式
        const isInParenthesizedExpr = this.checkParenthesizedExpr(parent);
        parent = this.getParentAfterParenthesis(parent);
        // 检查是否需要跳过
        if (this.shouldSkipNumberCheck(fullNumberNode, value)) {
            return;
        }
        ;
        // 检查变量声明
        if (lib_1.ts.isVariableDeclaration(parent)) {
            this.checkVariableDeclaration(parent, fullNumberNode, raw, sourceFile, results);
            return;
        }
        ;
        if (this.shouldReportMagicNumber(parent, isInParenthesizedExpr)) {
            this.reportMagicNumber(fullNumberNode, raw, sourceFile, results);
        }
        ;
    }
    ;
    // 检查是否在括号表达式中
    checkParenthesizedExpr(parent) {
        let isInParenthesizedExpr = false;
        while (parent && lib_1.ts.isParenthesizedExpression(parent)) {
            isInParenthesizedExpr = true;
            parent = parent.parent;
        }
        ;
        return isInParenthesizedExpr;
    }
    ;
    // 获取括号表达式之后的父节点
    getParentAfterParenthesis(parent) {
        while (parent && lib_1.ts.isParenthesizedExpression(parent)) {
            parent = parent.parent;
        }
        ;
        return parent;
    }
    ;
    // 检查是否应该跳过数字检查
    shouldSkipNumberCheck(node, value) {
        return !!(this.isIgnoredValue(value) ||
            (this.option.ignoreDefaultValues && this.isDefaultValue(node)) ||
            (this.option.ignoreClassFieldInitialValues && this.isClassFieldInitialValue(node)) ||
            (this.option.ignoreEnums && this.isEnumMember(node)) ||
            (this.option.ignoreNumericLiteralTypes && this.isNumericLiteralType(node)) ||
            (this.option.ignoreReadonlyClassProperties && this.isReadonlyClassProperty(node)) ||
            (this.option.ignoreTypeIndexes && this.isTypeIndex(node)) ||
            this.isParseIntRadix(node) ||
            this.isJSXNumber(node) ||
            (this.isPropertyAccessCompoundAssignment(node) && !this.option.detectObjects) ||
            (this.option.ignoreArrayIndexes && this.isArrayIndex(node, value)));
    }
    ;
    checkVariableDeclaration(parent, node, raw, sourceFile, results) {
        const variableDeclarationList = parent.parent;
        if (this.option.enforceConst && variableDeclarationList &&
            lib_1.ts.isVariableDeclarationList(variableDeclarationList) &&
            !(variableDeclarationList.flags & lib_1.ts.NodeFlags.Const)) {
            this.reportConstError(node, sourceFile, results);
        }
        ;
    }
    ;
    reportConstError(node, sourceFile, results) {
        const { line, character } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
        results.push({
            line: line + 1,
            character: character + 1,
            endcode: node.getEnd(),
            message: `Number constants declarations must use 'const'.`
        });
    }
    ;
    // 检查是否应该报告魔法数字
    shouldReportMagicNumber(parent, isInParenthesizedExpr) {
        let shouldReport = true;
        if (!this.option.detectObjects &&
            (lib_1.ts.isPropertyAssignment(parent) || lib_1.ts.isObjectLiteralExpression(parent))) {
            shouldReport = false;
        }
        ;
        if (!this.option.detectObjects && lib_1.ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken &&
            !lib_1.ts.isIdentifier(parent.left)) {
            shouldReport = false;
        }
        ;
        if (isInParenthesizedExpr) {
            shouldReport = true;
        }
        ;
        return shouldReport;
    }
    ;
    getFullNumberNodeInfo(node, sourceFile) {
        let fullNumberNode = node;
        let value;
        let raw;
        // 处理负数（一元表达式）
        if (lib_1.ts.isNumericLiteral(node) && node.parent &&
            lib_1.ts.isPrefixUnaryExpression(node.parent) &&
            node.parent.operator === lib_1.ts.SyntaxKind.MinusToken) {
            fullNumberNode = node.parent;
            value = -Number(node.text);
            raw = `-${node.getText(sourceFile)}`;
        }
        else if (lib_1.ts.isNumericLiteral(node)) {
            value = Number(node.text);
            raw = node.getText(sourceFile);
        }
        else if (lib_1.ts.isBigIntLiteral(node)) {
            value = Number(node.text.slice(0, -1));
            raw = node.getText(sourceFile);
        }
        else {
            value = 0;
            raw = node.getText(sourceFile);
        }
        ;
        return { fullNumberNode, value, raw };
    }
    ;
    isDefaultValue(node) {
        let fullNumberNode = node;
        // 处理一元表达式（+/-前缀）
        if (fullNumberNode.parent && lib_1.ts.isPrefixUnaryExpression(fullNumberNode.parent) &&
            (fullNumberNode.parent.operator === lib_1.ts.SyntaxKind.PlusToken ||
                fullNumberNode.parent.operator === lib_1.ts.SyntaxKind.MinusToken)) {
            fullNumberNode = fullNumberNode.parent;
        }
        ;
        const parent = fullNumberNode.parent;
        // 检查函数参数默认值
        if (!!parent && lib_1.ts.isParameter(parent) && parent.initializer === fullNumberNode) {
            return true;
        }
        ;
        //AssignmentPatter
        if (!!parent && lib_1.ts.isBindingElement(parent) && parent.initializer === fullNumberNode) {
            return true;
        }
        ;
        // 处理复杂解构赋值中的默认值
        if (!!parent && lib_1.ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken &&
            parent.right === fullNumberNode) {
            const left = parent.left;
            if (lib_1.ts.isIdentifier(left)) {
                if (this.isInDestructuringPropertyAssignment(parent)) {
                    return true;
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    // 检查当前节点是否在解构赋值模式的属性赋值中
    isInDestructuringPropertyAssignment(parent) {
        let currentNode = parent;
        while (currentNode.parent) {
            if (!lib_1.ts.isPropertyAssignment(currentNode.parent)) {
                currentNode = currentNode.parent;
                continue;
            }
            ;
            const propParent = currentNode.parent.parent;
            if (!propParent || !lib_1.ts.isObjectLiteralExpression(propParent)) {
                break;
            }
            ;
            const objParent = propParent.parent;
            if (objParent && lib_1.ts.isBinaryExpression(objParent) && objParent.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken) {
                return true;
            }
            ;
            break;
        }
        ;
        return false;
    }
    ;
    isClassFieldInitialValue(node) {
        if (this.isReadonlyClassProperty(node)) {
            return false;
        }
        ;
        let fullNumberNode = node;
        // 处理一元表达式（+/-前缀）
        if (fullNumberNode.parent && lib_1.ts.isPrefixUnaryExpression(fullNumberNode.parent) &&
            (fullNumberNode.parent.operator === lib_1.ts.SyntaxKind.PlusToken ||
                fullNumberNode.parent.operator === lib_1.ts.SyntaxKind.MinusToken)) {
            fullNumberNode = fullNumberNode.parent;
        }
        const parent = fullNumberNode.parent;
        // 在TypeScript AST中，PropertyDefinition对应于ts.isPropertyDeclaration
        return !!parent &&
            lib_1.ts.isPropertyDeclaration(parent) &&
            parent.initializer === fullNumberNode;
    }
    ;
    isParseIntRadix(node) {
        const parent = node.parent;
        if (!parent || !lib_1.ts.isCallExpression(parent) || parent.arguments.length < 2) {
            return false;
        }
        ;
        if (parent.arguments[1] !== node) {
            return false;
        }
        ;
        // 检查是直接调用parseInt
        if (lib_1.ts.isIdentifier(parent.expression) && parent.expression.text === 'parseInt') {
            return true;
        }
        ;
        // 检查是Number.parseInt
        if (lib_1.ts.isPropertyAccessExpression(parent.expression) &&
            lib_1.ts.isIdentifier(parent.expression.expression) &&
            parent.expression.expression.text === 'Number' &&
            lib_1.ts.isIdentifier(parent.expression.name) &&
            parent.expression.name.text === 'parseInt') {
            return true;
        }
        ;
        return false;
    }
    ;
    isJSXNumber(node) {
        const parent = node.parent;
        if (!parent) {
            return false;
        }
        ;
        const kindName = lib_1.ts.SyntaxKind[parent.kind];
        return !!(kindName && kindName.indexOf('JSX') === 0);
    }
    ;
    isArrayIndex(node, value) {
        const parent = node.parent;
        return !!parent &&
            lib_1.ts.isElementAccessExpression(parent) &&
            parent.argumentExpression === node &&
            Number.isInteger(value) &&
            value >= 0 &&
            value < MAX_ARRAY_LENGTH;
    }
    ;
    // 检查是否是枚举成员
    isEnumMember(node) {
        let current = node;
        // 处理一元表达式（+/-前缀）
        if (current.parent && lib_1.ts.isPrefixUnaryExpression(current.parent) &&
            (current.parent.operator === lib_1.ts.SyntaxKind.PlusToken ||
                current.parent.operator === lib_1.ts.SyntaxKind.MinusToken)) {
            current = current.parent;
        }
        const parent = current.parent;
        return !!parent && lib_1.ts.isEnumMember(parent) && parent.initializer === current;
    }
    ;
    isParentTSLiteralType(node) {
        return !!node.parent && lib_1.ts.isLiteralTypeNode(node.parent);
    }
    ;
    isGrandparentTSTypeAliasDeclaration(node) {
        return !!node.parent?.parent && lib_1.ts.isTypeAliasDeclaration(node.parent.parent);
    }
    ;
    isGrandparentTSUnionType(node) {
        if (!!node.parent?.parent && lib_1.ts.isUnionTypeNode(node.parent.parent)) {
            return this.isGrandparentTSTypeAliasDeclaration(node.parent);
        }
        return false;
    }
    ;
    // 检查是否是数字字面量类型
    isNumericLiteralType(node) {
        if (node.parent &&
            lib_1.ts.isPrefixUnaryExpression(node.parent) &&
            node.parent.operator === lib_1.ts.SyntaxKind.MinusToken) {
            node = node.parent;
        }
        ;
        if (!this.isParentTSLiteralType(node)) {
            return false;
        }
        ;
        if (this.isGrandparentTSTypeAliasDeclaration(node)) {
            return true;
        }
        ;
        if (this.isGrandparentTSUnionType(node)) {
            return true;
        }
        ;
        return false;
    }
    ;
    // 检查是否是只读类属性
    isReadonlyClassProperty(node) {
        // 检查当前节点是否在只读属性的初始化表达式中
        let current = node;
        let parent = current.parent;
        // 处理一元表达式（+/-前缀）
        if (parent && lib_1.ts.isPrefixUnaryExpression(parent) &&
            (parent.operator === lib_1.ts.SyntaxKind.PlusToken ||
                parent.operator === lib_1.ts.SyntaxKind.MinusToken)) {
            current = parent;
            parent = current.parent;
        }
        ;
        // 检查父节点是否是属性声明且当前节点是其初始化值
        if (!parent || !lib_1.ts.isPropertyDeclaration(parent) || parent.initializer !== current) {
            return false;
        }
        ;
        // 检查是否有readonly修饰符
        return parent.modifiers?.some(mod => mod.kind === lib_1.ts.SyntaxKind.ReadonlyKeyword) || false;
    }
    ;
    // 检查是否是类型索引
    isTypeIndex(node) {
        // 获取真正的父节点(处理一元表达式)
        let ancestor = this.getLiteralParent(node);
        if (!ancestor) {
            return false;
        }
        ;
        const checkForIndexedAccess = (current) => {
            if (!current.parent) {
                return false;
            }
            ;
            if (lib_1.ts.isIndexedAccessTypeNode(current.parent)) {
                return true;
            }
            ;
            if (lib_1.ts.isUnionTypeNode(current.parent) ||
                lib_1.ts.isIntersectionTypeNode(current.parent) ||
                lib_1.ts.isParenthesizedTypeNode(current.parent)) {
                return checkForIndexedAccess(current.parent);
            }
            ;
            return false;
        };
        return checkForIndexedAccess(ancestor);
    }
    ;
    //获取字面量的真正父节点(处理一元表达式)
    getLiteralParent(node) {
        if (node.parent &&
            lib_1.ts.isPrefixUnaryExpression(node.parent) &&
            (node.parent.operator === lib_1.ts.SyntaxKind.MinusToken ||
                node.parent.operator === lib_1.ts.SyntaxKind.PlusToken)) {
            return node.parent.parent;
        }
        ;
        return node.parent;
    }
    ;
    addIssueReport(line, startCol, endcode, filePath, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const description = message;
        const defect = new Defects_1.Defects(line, startCol, endcode, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    reportMagicNumber(node, raw, sourceFile, results) {
        const { line, character } = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, node.getStart());
        results.push({
            line: line + 1,
            character: character + 1,
            endcode: node.getEnd(),
            message: `No magic number: ${raw}.`
        });
    }
    ;
    // 检查数字是否在属性访问表达式的复合赋值中（如 obj.prop += 1 或 Class.staticProp += 1）
    isPropertyAccessCompoundAssignment(node) {
        // 获取父节点，处理可能的一元表达式
        let current = node;
        let parent = current.parent;
        // 处理一元表达式（+/-前缀）
        if (parent && lib_1.ts.isPrefixUnaryExpression(parent) &&
            (parent.operator === lib_1.ts.SyntaxKind.PlusToken ||
                parent.operator === lib_1.ts.SyntaxKind.MinusToken)) {
            current = parent;
            parent = current.parent;
        }
        ;
        // 检查是否是二元表达式
        if (!parent || !lib_1.ts.isBinaryExpression(parent)) {
            return false;
        }
        ;
        // 检查是否是复合赋值操作符（+=, -=, *=, /=等）
        const isCompoundAssignment = parent.operatorToken.kind >= lib_1.ts.SyntaxKind.PlusEqualsToken &&
            parent.operatorToken.kind <= lib_1.ts.SyntaxKind.CaretEqualsToken;
        if (!isCompoundAssignment) {
            return false;
        }
        ;
        // 检查左侧是否是属性访问表达式
        return lib_1.ts.isPropertyAccessExpression(parent.left);
    }
    ;
}
exports.NoMagicNumbersCheck = NoMagicNumbersCheck;
;
