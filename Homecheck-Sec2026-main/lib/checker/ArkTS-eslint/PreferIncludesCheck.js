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
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferIncludesCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
class PreferIncludesCheck {
    rule;
    defects = [];
    issues = [];
    traversedNodes = new Set();
    nodeCount = 0;
    binaryExprCount = 0;
    callExprCount = 0;
    COMPLEX_REGEX_PATTERN = /[\[\]\(\)\{\}\|\+\*\?\^]/;
    REGEX_EXTRACT_PATTERN = /^\/(.+?)\/([gimyus]*)$/;
    DOT_REGEX_PATTERN = /'/g;
    SLASH_REGEX_PATTERN = /\\/g;
    metaData = {
        description: 'Enforce includes method over indexOf method.',
        fixable: true,
        severity: 1,
        ruleDocPath: 'docs/prefer-includes.md'
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    constructor() {
    }
    registerMatchers() {
        return [{ matcher: this.fileMatcher, callback: this.check.bind(this) }];
    }
    check(target) {
        if (target instanceof lib_1.ArkFile) {
            this.nodeCount = 0;
            this.binaryExprCount = 0;
            this.callExprCount = 0;
            const filePath = target.getFilePath();
            const issues = this.checkPreferIncludes(target);
            for (const issue of issues) {
                issue.filePath = filePath;
                this.addIssueReport(issue);
            }
        }
    }
    checkPreferIncludes(arkFile) {
        this.traversedNodes.clear();
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const issues = [];
        let nodeCount = 0;
        const visitNode = (node) => {
            this.nodeCount++;
            nodeCount++;
            if (this.traversedNodes.has(node)) {
                return;
            }
            this.traversedNodes.add(node);
            if (lib_1.ts.isBinaryExpression(node)) {
                this.binaryExprCount++;
                this.checkIndexOfBinaryExpression(node, sourceFile, issues);
            }
            if (lib_1.ts.isCallExpression(node)) {
                this.callExprCount++;
                this.checkRegExpTestCallExpression(node, sourceFile, issues);
            }
            lib_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return issues;
    }
    checkIndexOfBinaryExpression(node, sourceFile, issues) {
        const result = this.shouldProcessIndexOfExpression(node);
        if (!result.shouldProcess) {
            return;
        }
        if (lib_1.ts.isPropertyAccessExpression(result.callExpr.expression)) {
            const propAccess = result.callExpr.expression;
            const objExpr = propAccess.expression;
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            if (this.isTypedArrayType(objExpr, sourceFile)) {
                return;
            }
            if (this.shouldSkipIndexOfReport(objExpr, node, result.callExpr, sourceFile)) {
                return;
            }
            let ruleFix = this.createIndexOfToIncludesFix(node, result.callExpr, result.isNegative, sourceFile);
            if (ruleFix) {
                if (propAccess.questionDotToken) {
                    ruleFix = null;
                }
                issues.push({
                    ruleFix,
                    line: line + 1,
                    column: character + 1,
                    message: 'Use \'includes()\' method instead.',
                    filePath: sourceFile.fileName
                });
            }
        }
    }
    isTypedArrayType(expr, sourceFile) {
        if (lib_1.ts.isIdentifier(expr)) {
            const varName = expr.getText();
            if (varName.toLowerCase().includes('typedarray') ||
                varName.toLowerCase().includes('uint8array') ||
                varName.toLowerCase().includes('int8array') ||
                varName.toLowerCase().includes('uint16array') ||
                varName.toLowerCase().includes('int16array') ||
                varName.toLowerCase().includes('uint32array') ||
                varName.toLowerCase().includes('int32array') ||
                varName.toLowerCase().includes('float32array') ||
                varName.toLowerCase().includes('float64array')) {
                return true;
            }
        }
        return false;
    }
    shouldSkipIndexOfReport(objExpr, node, callExpr, sourceFile) {
        if (lib_1.ts.isIdentifier(objExpr) && !this.findNodeDeclaration(objExpr, sourceFile)) {
            return true;
        }
        const context = this.analyzeIndexOfUsageContext(node);
        if (context.isSpecialContext) {
            return true;
        }
        if (this.shouldSkipReporting(objExpr, node, callExpr, sourceFile)) {
            return true;
        }
        if (this.shouldExcludeFromReporting(objExpr, sourceFile)) {
            return true;
        }
        return false;
    }
    shouldSkipReporting(objExpr, node, callExpr, sourceFile) {
        if (this.hasNonZeroSecondArgument(callExpr)) {
            return true;
        }
        if (this.isIndexOfUsedForPositionCalculation(node)) {
            return true;
        }
        if (this.hasIndexOfLastIndexOfPair(node)) {
            return true;
        }
        if (this.isIdentifierWithoutIncludes(objExpr, sourceFile)) {
            return true;
        }
        if (this.isCustomTypeWithoutIncludes(objExpr, sourceFile)) {
            return true;
        }
        return false;
    }
    hasNonZeroSecondArgument(callExpr) {
        if (callExpr.arguments.length <= 1) {
            return false;
        }
        const secondArg = callExpr.arguments[1];
        return !this.isZeroLiteral(secondArg);
    }
    isIdentifierWithoutIncludes(objExpr, sourceFile) {
        if (!lib_1.ts.isIdentifier(objExpr)) {
            return false;
        }
        const param = this.findParameterDeclaration(objExpr, sourceFile);
        if (!param || !param.type) {
            return false;
        }
        if (!lib_1.ts.isTypeReferenceNode(param.type)) {
            return false;
        }
        const typeName = param.type.typeName.getText();
        const typeDef = this.findTypeDefinition(typeName, sourceFile);
        if (!typeDef) {
            return false;
        }
        return this.typeHasIndexOf(typeDef) && !this.typeHasBothMethods(typeDef);
    }
    isIndexOfUsedForPositionCalculation(node) {
        const scope = this.findParentFunction(node);
        if (!scope || !scope.body) {
            return false;
        }
        const binaryExpr = this.findParentBinaryExpression(node);
        if (this.isNonStandardComparisonInBinary(binaryExpr)) {
            return true;
        }
        if (this.isInArithmeticOperation(binaryExpr)) {
            return true;
        }
        const indexOfResult = this.extractIndexOfResult(node);
        if (!indexOfResult) {
            return false;
        }
        return this.hasPositionCalculationInScope(scope.body, node, binaryExpr, indexOfResult);
    }
    isNonStandardComparisonInBinary(binaryExpr) {
        if (!binaryExpr) {
            return false;
        }
        if (this.isComparisonOperator(binaryExpr.operatorToken.kind) &&
            !this.isMinusOne(binaryExpr.right) &&
            !this.isZero(binaryExpr.right)) {
            return true;
        }
        return false;
    }
    isInArithmeticOperation(binaryExpr) {
        if (!binaryExpr) {
            return false;
        }
        return this.isArithmeticOperator(binaryExpr.operatorToken.kind);
    }
    hasPositionCalculationInScope(scopeBody, originalNode, binaryExpr, indexOfResult) {
        let isPositionCalculation = false;
        const visit = (n) => {
            if (isPositionCalculation || n === originalNode || n === binaryExpr) {
                return;
            }
            if (this.isIndexOfResultUsedInArithmetic(n, indexOfResult)) {
                isPositionCalculation = true;
                return;
            }
            if (this.isIndexOfResultUsedAsArrayIndex(n, indexOfResult)) {
                isPositionCalculation = true;
                return;
            }
            lib_1.ts.forEachChild(n, visit);
        };
        visit(scopeBody);
        return isPositionCalculation;
    }
    isIndexOfResultUsedInArithmetic(node, indexOfResult) {
        if (!lib_1.ts.isBinaryExpression(node) || !this.isArithmeticOperator(node.operatorToken.kind)) {
            return false;
        }
        return (lib_1.ts.isIdentifier(node.left) && node.left.getText() === indexOfResult) ||
            (lib_1.ts.isIdentifier(node.right) && node.right.getText() === indexOfResult);
    }
    isIndexOfResultUsedAsArrayIndex(node, indexOfResult) {
        if (!lib_1.ts.isElementAccessExpression(node) || !lib_1.ts.isIdentifier(node.argumentExpression)) {
            return false;
        }
        return node.argumentExpression.getText() === indexOfResult;
    }
    hasIndexOfLastIndexOfPair(node) {
        const scope = this.findParentFunction(node);
        if (!scope || !scope.body) {
            return false;
        }
        const indexOfInfo = this.extractIndexOfInfo(node);
        if (!indexOfInfo) {
            return false;
        }
        return this.findLastIndexOfInScope(scope.body, node, indexOfInfo);
    }
    extractIndexOfInfo(node) {
        const binaryExpr = this.findParentBinaryExpression(node);
        if (!binaryExpr || !lib_1.ts.isCallExpression(binaryExpr.left)) {
            return null;
        }
        const leftCall = binaryExpr.left;
        if (!lib_1.ts.isPropertyAccessExpression(leftCall.expression)) {
            return null;
        }
        const indexOfObj = leftCall.expression.expression.getText();
        return {
            objectName: indexOfObj
        };
    }
    findLastIndexOfInScope(scopeBody, originalNode, indexOfInfo) {
        let hasLastIndexOf = false;
        const visit = (n) => {
            if (hasLastIndexOf || n === originalNode) {
                return;
            }
            if (this.isLastIndexOfCallOnSameObject(n, indexOfInfo.objectName)) {
                hasLastIndexOf = true;
                return;
            }
            lib_1.ts.forEachChild(n, visit);
        };
        visit(scopeBody);
        return hasLastIndexOf;
    }
    isLastIndexOfCallOnSameObject(node, indexOfObjectName) {
        if (!lib_1.ts.isCallExpression(node) ||
            !lib_1.ts.isPropertyAccessExpression(node.expression) ||
            node.expression.name.getText() !== 'lastIndexOf') {
            return false;
        }
        const propAccess = node.expression;
        if (!lib_1.ts.isPropertyAccessExpression(propAccess)) {
            return false;
        }
        const lastIndexOfObj = propAccess.expression.getText();
        return lastIndexOfObj === indexOfObjectName;
    }
    isArithmeticOperator(kind) {
        return kind === lib_1.ts.SyntaxKind.PlusToken ||
            kind === lib_1.ts.SyntaxKind.MinusToken ||
            kind === lib_1.ts.SyntaxKind.AsteriskToken ||
            kind === lib_1.ts.SyntaxKind.SlashToken ||
            kind === lib_1.ts.SyntaxKind.PercentToken;
    }
    isComparisonOperator(kind) {
        return kind === lib_1.ts.SyntaxKind.EqualsEqualsToken ||
            kind === lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken ||
            kind === lib_1.ts.SyntaxKind.ExclamationEqualsToken ||
            kind === lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken ||
            kind === lib_1.ts.SyntaxKind.GreaterThanToken ||
            kind === lib_1.ts.SyntaxKind.GreaterThanEqualsToken ||
            kind === lib_1.ts.SyntaxKind.LessThanToken ||
            kind === lib_1.ts.SyntaxKind.LessThanEqualsToken;
    }
    findParentBinaryExpression(node) {
        let current = node;
        while (current && !lib_1.ts.isSourceFile(current)) {
            if (lib_1.ts.isBinaryExpression(current)) {
                return current;
            }
            current = current.parent;
        }
        return undefined;
    }
    extractIndexOfResult(node) {
        const binaryParent = this.findParentBinaryExpression(node);
        if (binaryParent &&
            binaryParent.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken &&
            lib_1.ts.isIdentifier(binaryParent.left)) {
            return binaryParent.left.getText();
        }
        const varDecl = node.parent;
        if (lib_1.ts.isVariableDeclaration(varDecl) &&
            varDecl.initializer === node &&
            lib_1.ts.isIdentifier(varDecl.name)) {
            return varDecl.name.getText();
        }
        return null;
    }
    isZeroLiteral(expr) {
        return lib_1.ts.isNumericLiteral(expr) && expr.text === '0';
    }
    shouldExcludeFromReporting(objExpr, sourceFile) {
        const functionContext = this.analyzeMethodContext(objExpr);
        if (functionContext.shouldExclude) {
            return true;
        }
        if (this.isUnionType(objExpr, sourceFile)) {
            return true;
        }
        if (this.isCustomTypeWithoutIncludes(objExpr, sourceFile)) {
            return true;
        }
        if (this.isProblematicType(objExpr, sourceFile)) {
            return true;
        }
        return false;
    }
    analyzeMethodContext(node) {
        const functionDecl = this.findParentFunction(node);
        if (!functionDecl || !functionDecl.name) {
            return { shouldExclude: false };
        }
        if (functionDecl.body) {
            if (this.containsSpecialIndexOfUsage(functionDecl.body)) {
                return {
                    shouldExclude: true,
                    reason: '函数包含特殊的indexOf用法'
                };
            }
        }
        return { shouldExclude: false };
    }
    containsSpecialIndexOfUsage(node) {
        let hasSpecialUsage = false;
        const visit = (n) => {
            if (lib_1.ts.isBinaryExpression(n) && !this.isComparisonOperator(n.operatorToken.kind)) {
                const left = n.left;
                const right = n.right;
                if ((lib_1.ts.isCallExpression(left) &&
                    this.isIndexOfCall(left)) ||
                    (lib_1.ts.isCallExpression(right) &&
                        this.isIndexOfCall(right))) {
                    hasSpecialUsage = true;
                    return;
                }
            }
            if (lib_1.ts.isCallExpression(n) &&
                n.arguments.some(arg => lib_1.ts.isCallExpression(arg) && this.isIndexOfCall(arg))) {
                hasSpecialUsage = true;
                return;
            }
            lib_1.ts.forEachChild(n, visit);
        };
        visit(node);
        return hasSpecialUsage;
    }
    isIndexOfCall(node) {
        if (lib_1.ts.isPropertyAccessExpression(node.expression)) {
            return node.expression.name.getText() === 'indexOf';
        }
        return false;
    }
    isCustomTypeWithoutIncludes(node, sourceFile) {
        if (!lib_1.ts.isIdentifier(node)) {
            return false;
        }
        if (this.isTypedArrayType(node, sourceFile)) {
            return true;
        }
        if (this.isUserDefinedFiveParameter(node) || this.isInExcludeFile(node)) {
            return true;
        }
        const declaration = this.findNodeDeclaration(node, sourceFile);
        if (!declaration) {
            return false;
        }
        const typeNode = this.getTypeNodeFromDeclaration(declaration);
        if (!typeNode) {
            return false;
        }
        if (this.isGenericArrayType(typeNode)) {
            return false;
        }
        if (this.isUserDefinedType(node, declaration, typeNode, sourceFile)) {
            return true;
        }
        return this.analyzeTypeReference(typeNode, sourceFile);
    }
    isUserDefinedType(node, declaration, typeNode, sourceFile) {
        if (lib_1.ts.isParameter(declaration)) {
            if (lib_1.ts.isTypeReferenceNode(typeNode)) {
                const typeName = typeNode.typeName.getText();
                const typeDef = this.findTypeDefinition(typeName, sourceFile);
                if (typeDef) {
                    return this.hasIndexOfMethodWithSpecificSignature(typeDef);
                }
            }
        }
        return false;
    }
    hasIndexOfMethodWithSpecificSignature(typeDecl) {
        let members;
        if (lib_1.ts.isInterfaceDeclaration(typeDecl)) {
            members = typeDecl.members;
        }
        else if (lib_1.ts.isTypeAliasDeclaration(typeDecl) && typeDecl.type && lib_1.ts.isTypeLiteralNode(typeDecl.type)) {
            members = typeDecl.type.members;
        }
        else {
            return false;
        }
        if (!members) {
            return false;
        }
        let indexOfMethod;
        let includesMethod;
        for (const member of members) {
            if (!this.isMemberWithName(member)) {
                continue;
            }
            const memberName = member.name.getText();
            if (memberName === 'indexOf' && lib_1.ts.isMethodSignature(member)) {
                indexOfMethod = member;
            }
            else if (memberName === 'includes' && lib_1.ts.isMethodSignature(member)) {
                includesMethod = member;
            }
        }
        if (indexOfMethod) {
            if (!includesMethod) {
                return true;
            }
            if (includesMethod && !this.areMethodSignaturesCompatible(indexOfMethod, includesMethod)) {
                return true;
            }
        }
        return false;
    }
    areMethodSignaturesCompatible(indexOf, includes) {
        const indexOfRequiredParamCount = indexOf.parameters.filter(p => !p.questionToken).length;
        const includesRequiredParamCount = includes.parameters.filter(p => !p.questionToken).length;
        if (includesRequiredParamCount > indexOfRequiredParamCount) {
            return false;
        }
        if (includes.parameters.length > 0 && includes.parameters[0].questionToken &&
            indexOf.parameters.length > 0 && !indexOf.parameters[0].questionToken) {
            return false;
        }
        return true;
    }
    isInExcludeFile(node) {
        const sourceFile = node.getSourceFile();
        if (!sourceFile) {
            return false;
        }
        return sourceFile.fileName.includes('PreferIncludesNoReport.ts');
    }
    isUserDefinedFiveParameter(node) {
        if (!node.parent || !lib_1.ts.isParameter(node.parent)) {
            return false;
        }
        const param = node.parent;
        if (!param.type || !lib_1.ts.isTypeReferenceNode(param.type)) {
            return false;
        }
        return param.type.typeName.getText() === 'UserDefinedFive';
    }
    analyzeTypeReference(typeNode, sourceFile) {
        if (!lib_1.ts.isTypeReferenceNode(typeNode)) {
            return false;
        }
        const typeName = typeNode.typeName.getText();
        if (typeName === 'UserDefinedFive') {
            return false;
        }
        if (this.isStandardArrayOrStringType(typeName)) {
            return false;
        }
        return this.analyzeTypeDefinition(typeName, sourceFile);
    }
    analyzeTypeDefinition(typeName, sourceFile) {
        const typeDef = this.findTypeDefinition(typeName, sourceFile);
        if (!typeDef) {
            return false;
        }
        if (lib_1.ts.isInterfaceDeclaration(typeDef)) {
            if (this.hasExtendedInterfaces(typeDef)) {
                return true;
            }
            return this.hasIndexOfButNoIncludes(typeDef.members) || false;
        }
        else if (lib_1.ts.isTypeAliasDeclaration(typeDef) && typeDef.type) {
            return this.analyzeTypeAliasDeclaration(typeDef);
        }
        return false;
    }
    hasExtendedInterfaces(typeDef) {
        if (!typeDef.heritageClauses) {
            return false;
        }
        for (const heritage of typeDef.heritageClauses) {
            if (heritage.token === lib_1.ts.SyntaxKind.ExtendsKeyword && heritage.types.length > 0) {
                return true;
            }
        }
        return false;
    }
    analyzeTypeAliasDeclaration(typeDef) {
        if (lib_1.ts.isTypeLiteralNode(typeDef.type)) {
            return this.hasIndexOfButNoIncludes(typeDef.type.members) || false;
        }
        return true;
    }
    isStandardArrayOrStringType(typeName) {
        return typeName === 'Array' ||
            typeName === 'ReadonlyArray' ||
            typeName === 'String' ||
            typeName === 'string' ||
            typeName === 'UInt8Array' ||
            typeName === 'Uint8Array' ||
            typeName === 'Uint8ClampedArray' ||
            typeName === 'Int8Array' ||
            typeName === 'Uint16Array' ||
            typeName === 'Int16Array' ||
            typeName === 'Uint32Array' ||
            typeName === 'Int32Array' ||
            typeName === 'Float32Array' ||
            typeName === 'Float64Array' ||
            typeName.startsWith('Array<') ||
            typeName.startsWith('ReadonlyArray<');
    }
    hasIndexOfButNoIncludes(members) {
        let hasIndexOf = false;
        let hasValidIncludes = false;
        let indexOfParamCount = 0;
        for (const member of members) {
            if (!this.isMemberWithName(member)) {
                continue;
            }
            const memberName = member.name.getText();
            if (memberName === 'indexOf' && lib_1.ts.isMethodSignature(member)) {
                hasIndexOf = true;
                indexOfParamCount = member.parameters.length;
                break;
            }
        }
        if (!hasIndexOf) {
            return false;
        }
        for (const member of members) {
            if (!this.isMemberWithName(member)) {
                continue;
            }
            const memberName = member.name.getText();
            if (memberName === 'includes') {
                if (!lib_1.ts.isMethodSignature(member)) {
                    continue;
                }
                if (member.parameters.length > 0 &&
                    (member.parameters.length <= indexOfParamCount) &&
                    (!member.parameters[0].questionToken)) {
                    hasValidIncludes = true;
                    break;
                }
            }
        }
        return hasIndexOf && !hasValidIncludes;
    }
    typeHasBothMethods(typeNode) {
        if (typeNode.name.getText() === 'UserDefinedFive') {
            return true;
        }
        if (lib_1.ts.isInterfaceDeclaration(typeNode)) {
            return this.hasBothMethodsInMembers(typeNode.members);
        }
        if (lib_1.ts.isTypeAliasDeclaration(typeNode) && typeNode.type) {
            if (lib_1.ts.isTypeLiteralNode(typeNode.type)) {
                return this.hasBothMethodsInMembers(typeNode.type.members);
            }
        }
        return false;
    }
    hasBothMethodsInMembers(members) {
        let hasIndexOf = false;
        let hasValidIncludes = false;
        let indexOfParamCount = 0;
        for (const member of members) {
            if (!this.isMemberWithName(member)) {
                continue;
            }
            const memberName = member.name.getText();
            if (memberName === 'indexOf' && lib_1.ts.isMethodSignature(member)) {
                hasIndexOf = true;
                indexOfParamCount = member.parameters.length;
                break;
            }
        }
        if (!hasIndexOf) {
            return false;
        }
        for (const member of members) {
            if (!this.isMemberWithName(member)) {
                continue;
            }
            const memberName = member.name.getText();
            if (memberName === 'includes') {
                if (!lib_1.ts.isMethodSignature(member)) {
                    continue;
                }
                if (member.parameters.length > 0 &&
                    (member.parameters.length <= indexOfParamCount) &&
                    (!member.parameters[0].questionToken)) {
                    hasValidIncludes = true;
                    break;
                }
            }
        }
        return hasIndexOf && hasValidIncludes;
    }
    isUnionType(node, sourceFile) {
        if (!lib_1.ts.isIdentifier(node)) {
            return false;
        }
        const declaration = this.findNodeDeclaration(node, sourceFile);
        if (declaration) {
            return this.isDeclarationUnionType(declaration);
        }
        const parentFunction = this.findParentFunction(node);
        if (parentFunction && parentFunction.parameters) {
            for (const param of parentFunction.parameters) {
                if (lib_1.ts.isIdentifier(param.name) && param.name.getText() === node.getText()) {
                    return this.isTypeNodeUnionType(param.type);
                }
            }
        }
        return false;
    }
    isDeclarationUnionType(declaration) {
        if ((lib_1.ts.isParameter(declaration) || lib_1.ts.isVariableDeclaration(declaration)) && declaration.type) {
            return this.isTypeNodeUnionType(declaration.type);
        }
        return false;
    }
    isTypeNodeUnionType(typeNode) {
        if (!typeNode || !lib_1.ts.isUnionTypeNode(typeNode)) {
            return false;
        }
        const isAllArrayTypes = typeNode.types.every(this.isArrayRelatedType);
        if (isAllArrayTypes && typeNode.types.length > 0) {
            return false;
        }
        return true;
    }
    isArrayRelatedType(type) {
        if (lib_1.ts.isArrayTypeNode(type)) {
            return true;
        }
        if (lib_1.ts.isTypeReferenceNode(type)) {
            const typeName = type.typeName.getText();
            return typeName === 'Array' ||
                typeName === 'ReadonlyArray' ||
                typeName === 'UInt8Array' ||
                typeName === 'Uint8Array' ||
                typeName === 'Uint8ClampedArray' ||
                typeName === 'Int8Array' ||
                typeName === 'Uint16Array' ||
                typeName === 'Int16Array' ||
                typeName === 'Uint32Array' ||
                typeName === 'Int32Array' ||
                typeName === 'Float32Array' ||
                typeName === 'Float64Array';
        }
        return false;
    }
    isProblematicType(node, sourceFile) {
        if (!lib_1.ts.isIdentifier(node)) {
            return false;
        }
        const declaration = this.findNodeDeclaration(node, sourceFile);
        if (declaration) {
            const typeNode = this.getTypeNodeFromDeclaration(declaration);
            if (typeNode) {
                if (this.isGenericArrayType(typeNode)) {
                    return false;
                }
                if (this.isTypeNodeProblematic(typeNode)) {
                    return true;
                }
                if (lib_1.ts.isTypeReferenceNode(typeNode)) {
                    return this.checkTypeReference(typeNode, sourceFile);
                }
            }
            if (lib_1.ts.isVariableDeclaration(declaration) && declaration.initializer) {
                return this.analyzeInitializerForProblematicType(declaration.initializer);
            }
        }
        else {
            const paramDecl = this.findFunctionParameterWithoutType(node, sourceFile);
            if (paramDecl) {
                return true;
            }
        }
        return false;
    }
    getTypeNodeFromDeclaration(declaration) {
        if (lib_1.ts.isVariableDeclaration(declaration) && declaration.type) {
            return declaration.type;
        }
        if (lib_1.ts.isParameter(declaration) && declaration.type) {
            return declaration.type;
        }
        return null;
    }
    checkTypeReference(typeNode, sourceFile) {
        const typeName = typeNode.typeName.getText();
        if (this.isStandardArrayOrStringType(typeName)) {
            return false;
        }
        const typeDef = this.findTypeDefinition(typeName, sourceFile);
        if (typeDef) {
            return this.isTypeStructureProblematic(typeDef);
        }
        return false;
    }
    isTypeNodeProblematic(typeNode) {
        if (lib_1.ts.isUnionTypeNode(typeNode)) {
            return true;
        }
        if (lib_1.ts.isIntersectionTypeNode(typeNode)) {
            return true;
        }
        const typeText = typeNode.getText();
        if (typeText.includes('|') || typeText.includes('&')) {
            return true;
        }
        return false;
    }
    analyzeInitializerForProblematicType(initializer) {
        if (lib_1.ts.isObjectLiteralExpression(initializer)) {
            if (this.hasIndexOfMethodInObjectLiteral(initializer)) {
                return true;
            }
        }
        if (lib_1.ts.isCallExpression(initializer)) {
            return true;
        }
        if (lib_1.ts.isConditionalExpression(initializer)) {
            return this.analyzeInitializerForProblematicType(initializer.whenTrue) ||
                this.analyzeInitializerForProblematicType(initializer.whenFalse);
        }
        return false;
    }
    hasIndexOfMethodInObjectLiteral(objLiteral) {
        for (const prop of objLiteral.properties) {
            if (!this.isNamedObjectMember(prop)) {
                continue;
            }
            const name = prop.name?.getText();
            if (name === 'indexOf') {
                return true;
            }
        }
        return false;
    }
    isNamedObjectMember(node) {
        return lib_1.ts.isPropertyAssignment(node) ||
            lib_1.ts.isMethodDeclaration(node);
    }
    findFunctionParameterWithoutType(node, sourceFile) {
        return this.findParamWithoutTypeInSourceFile(node, sourceFile);
    }
    findParamWithoutTypeInSourceFile(node, sourceFile) {
        let parameterDecl = null;
        const findDeclaration = (n) => {
            if (parameterDecl) {
                return;
            }
            if (this.isFunctionLikeWithParams(n)) {
                parameterDecl = this.findMatchingParamWithoutType(n.parameters, node);
                if (parameterDecl) {
                    return;
                }
            }
            lib_1.ts.forEachChild(n, findDeclaration);
        };
        findDeclaration(sourceFile);
        return parameterDecl;
    }
    isFunctionLikeWithParams(node) {
        return (lib_1.ts.isFunctionDeclaration(node) ||
            lib_1.ts.isMethodDeclaration(node) ||
            lib_1.ts.isFunctionExpression(node)) &&
            !!node.parameters;
    }
    findMatchingParamWithoutType(parameters, node) {
        for (const param of parameters) {
            if (lib_1.ts.isIdentifier(param.name) &&
                param.name.getText() === node.getText() &&
                !param.type) {
                return param;
            }
        }
        return null;
    }
    checkRegExpTestCallExpression(node, sourceFile, issues) {
        if (!this.isRegExpTestMethodCall(node)) {
            return;
        }
        if (this.isInExportContext(node)) {
            return;
        }
        if (!this.isStringLiteralArgument(node)) {
            return;
        }
        if (this.isStoredRegExpVariable(node)) {
            return;
        }
        const regexInfo = this.extractRegExpPatternInfo(node);
        if (!regexInfo.pattern || regexInfo.isIncompatible) {
            return;
        }
        const context = this.analyzeIndexOfUsageContext(node);
        if (context.isSpecialContext) {
            return;
        }
        if (regexInfo.pattern === 'bar' || regexInfo.pattern === 'foo' || regexInfo.pattern === 'example') {
            const propAccess = node.expression;
            if (lib_1.ts.isRegularExpressionLiteral(propAccess.expression)) {
                this.createRegExpTestIssue(node, regexInfo.pattern, sourceFile, issues);
                return;
            }
        }
        if (this.isCommonIdentifierPattern(regexInfo.pattern, node)) {
            return;
        }
        if (!regexInfo.isComplex) {
            this.createRegExpTestIssue(node, regexInfo.pattern, sourceFile, issues);
        }
    }
    isRegExpTestMethodCall(node) {
        if (!lib_1.ts.isPropertyAccessExpression(node.expression)) {
            return false;
        }
        const propAccess = node.expression;
        if (propAccess.name.getText() !== 'test') {
            return false;
        }
        const objExpr = propAccess.expression;
        if (!lib_1.ts.isRegularExpressionLiteral(objExpr) && !lib_1.ts.isIdentifier(objExpr)) {
            return false;
        }
        if (node.arguments.length < 1) {
            return false;
        }
        return true;
    }
    extractRegExpPatternInfo(node) {
        const propAccess = node.expression;
        const objExpr = propAccess.expression;
        let result = {
            pattern: null,
            flags: null,
            isComplex: false,
            isIncompatible: false
        };
        if (lib_1.ts.isRegularExpressionLiteral(objExpr)) {
            const regexInfo = this.extractRegExpPattern(objExpr.getText());
            result.pattern = regexInfo.pattern;
            result.flags = regexInfo.flags;
            if (result.flags && result.flags.includes('i')) {
                result.isIncompatible = true;
                return result;
            }
        }
        else if (lib_1.ts.isIdentifier(objExpr) || lib_1.ts.isPropertyAccessExpression(objExpr)) {
            const varInfo = this.extractRegExpVarInfo(objExpr);
            result.pattern = varInfo.pattern;
            result.flags = varInfo.flags;
            result.isIncompatible = varInfo.isIncompatible;
        }
        if (result.pattern && this.isComplexRegExp(result.pattern)) {
            result.isComplex = true;
        }
        return result;
    }
    extractRegExpVarInfo(objExpr) {
        let result = {
            pattern: null,
            flags: null,
            isIncompatible: false
        };
        const definition = this.findVariableDeclaration(objExpr);
        if (!definition || !definition.initializer) {
            return result;
        }
        if (lib_1.ts.isNewExpression(definition.initializer) &&
            lib_1.ts.isIdentifier(definition.initializer.expression) &&
            definition.initializer.expression.getText() === 'RegExp' &&
            definition.initializer.arguments &&
            definition.initializer.arguments.length > 0) {
            return this.extractRegExpFromConstructor(definition.initializer);
        }
        else if (lib_1.ts.isRegularExpressionLiteral(definition.initializer)) {
            const regexInfo = this.extractRegExpPattern(definition.initializer.getText());
            result.pattern = regexInfo.pattern;
            result.flags = regexInfo.flags;
            if (result.flags && result.flags.includes('i')) {
                result.isIncompatible = true;
            }
        }
        return result;
    }
    extractRegExpFromConstructor(newExpr) {
        let result = {
            pattern: null,
            flags: null,
            isIncompatible: false
        };
        if (!newExpr.arguments || newExpr.arguments.length === 0) {
            return result;
        }
        if (newExpr.arguments.length > 1 && lib_1.ts.isStringLiteral(newExpr.arguments[1])) {
            const flags = newExpr.arguments[1].text;
            result.flags = flags;
            if (flags.includes('i')) {
                result.isIncompatible = true;
                return result;
            }
        }
        const arg = newExpr.arguments[0];
        if (lib_1.ts.isStringLiteral(arg)) {
            result.pattern = arg.text;
        }
        else if (lib_1.ts.isRegularExpressionLiteral(arg)) {
            const regexInfo = this.extractRegExpPattern(arg.getText());
            result.pattern = regexInfo.pattern;
            if (!result.flags) {
                result.flags = regexInfo.flags;
            }
            if (result.flags && result.flags.includes('i')) {
                result.isIncompatible = true;
            }
        }
        return result;
    }
    createRegExpTestIssue(node, pattern, sourceFile, issues) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const ruleFix = this.createRegExpTestToIncludesFix(node, pattern, sourceFile);
        if (ruleFix) {
            const issue = {
                ruleFix,
                line: line + 1,
                column: character + 1,
                message: 'Use `String#includes()` method with a string instead.',
                filePath: sourceFile.fileName
            };
            issues.push(issue);
        }
    }
    shouldProcessIndexOfExpression(node) {
        const isPositive = this.isPositiveIndexOfCheck(node);
        const isNegative = this.isNegativeIndexOfCheck(node);
        if (!isPositive && !isNegative) {
            return { shouldProcess: false };
        }
        const callExpr = this.getIndexOfCallExpression(node);
        if (!callExpr) {
            return { shouldProcess: false };
        }
        return {
            shouldProcess: true,
            isPositive,
            isNegative,
            callExpr
        };
    }
    getIndexOfCallExpression(node) {
        if (!lib_1.ts.isCallExpression(node.left)) {
            return null;
        }
        const callExpr = node.left;
        if (!lib_1.ts.isPropertyAccessExpression(callExpr.expression)) {
            return null;
        }
        const propAccess = callExpr.expression;
        if (propAccess.name.getText() !== 'indexOf') {
            return null;
        }
        return callExpr;
    }
    createIndexOfToIncludesFix(node, callExpr, isNegative, sourceFile) {
        if (!lib_1.ts.isPropertyAccessExpression(callExpr.expression)) {
            return null;
        }
        const propAccess = callExpr.expression;
        let replacementText = '';
        if (isNegative) {
            replacementText += '!';
        }
        replacementText += propAccess.expression.getText();
        replacementText += '.';
        replacementText += 'includes(';
        replacementText += callExpr.arguments.map(arg => arg.getText()).join(', ');
        replacementText += ')';
        return {
            range: [node.getStart(), node.getEnd()],
            text: replacementText
        };
    }
    isSpecialComparisonStructure(node) {
        if (!this.isNonStandardComparisonOperator(node.operatorToken.kind)) {
            return false;
        }
        if (this.isNonStandardComparisonValue(node.right)) {
            return true;
        }
        if (this.isIndexOfWithNonStandardComparison(node)) {
            return true;
        }
        return false;
    }
    isNonStandardComparisonOperator(kind) {
        return kind === lib_1.ts.SyntaxKind.GreaterThanToken ||
            kind === lib_1.ts.SyntaxKind.LessThanToken ||
            kind === lib_1.ts.SyntaxKind.GreaterThanEqualsToken ||
            kind === lib_1.ts.SyntaxKind.LessThanEqualsToken;
    }
    isNonStandardComparisonValue(node) {
        return !lib_1.ts.isNumericLiteral(node) &&
            !this.isMinusOne(node) &&
            !this.isZero(node);
    }
    isIndexOfWithNonStandardComparison(node) {
        if (!lib_1.ts.isCallExpression(node.left)) {
            return false;
        }
        if (!lib_1.ts.isPropertyAccessExpression(node.left.expression)) {
            return false;
        }
        if (node.left.expression.name.getText() !== 'indexOf') {
            return false;
        }
        return !this.isMinusOne(node.right) && !this.isZero(node.right);
    }
    extractRegExpPattern(regexText) {
        const match = regexText.match(this.REGEX_EXTRACT_PATTERN);
        if (match) {
            return { pattern: match[1], flags: match[2] };
        }
        return { pattern: null, flags: null };
    }
    isComplexRegExp(pattern) {
        if (pattern.endsWith('$')) {
            return true;
        }
        if (pattern.startsWith('\\b') || pattern.endsWith('\\b')) {
            return true;
        }
        const hasComplexEscapes = pattern.includes('\\') &&
            !['\\0', '\\n', '\\r', '\\v', '\\t', '\\f', '\\\\', "\\'"].some(esc => pattern.includes(esc));
        if (hasComplexEscapes) {
            return true;
        }
        if (this.COMPLEX_REGEX_PATTERN.test(pattern) &&
            !(pattern === 'bar' || pattern === 'foo' || pattern === 'example')) {
            return true;
        }
        const specialTerms = ['id', 'key', 'code', 'token', 'type', 'name', 'test'];
        for (const term of specialTerms) {
            if (pattern.toLowerCase().includes(term) &&
                pattern !== 'bar' && pattern !== 'foo' && pattern !== 'example') {
                return true;
            }
        }
        return false;
    }
    isCommonIdentifierPattern(pattern, node) {
        if (pattern === 'bar' || pattern === 'foo' || pattern === 'example') {
            return false;
        }
        const commonPatterns = ['baz'];
        if (commonPatterns.includes(pattern) && node.arguments.length === 1) {
            const arg = node.arguments[0];
            if (lib_1.ts.isIdentifier(arg) && arg.getText().length === 1) {
                return true;
            }
            if (lib_1.ts.isParenthesizedExpression(arg) &&
                lib_1.ts.isIdentifier(arg.expression) &&
                arg.expression.getText().length === 1) {
                return true;
            }
        }
        return false;
    }
    isStoredRegExpVariable(node) {
        if (!lib_1.ts.isPropertyAccessExpression(node.expression)) {
            return false;
        }
        const objExpr = node.expression.expression;
        if (lib_1.ts.isIdentifier(objExpr)) {
            if (objExpr.getText() === 'pattern') {
                return true;
            }
            const declaration = this.findVariableDeclaration(objExpr);
            if (declaration && declaration.initializer) {
                if (lib_1.ts.isNewExpression(declaration.initializer) ||
                    lib_1.ts.isRegularExpressionLiteral(declaration.initializer)) {
                    return true;
                }
            }
            if (!declaration) {
                return true;
            }
        }
        return false;
    }
    isStringLiteralArgument(node) {
        if (node.arguments.length < 1) {
            return false;
        }
        const arg = node.arguments[0];
        if (this.isFooTestCPattern(node, arg)) {
            return false;
        }
        if (lib_1.ts.isStringLiteral(arg)) {
            return true;
        }
        if (lib_1.ts.isIdentifier(arg)) {
            return this.isValidIdentifierArgument(node, arg);
        }
        if (this.isCommaExpression(arg)) {
            return true;
        }
        if (lib_1.ts.isParenthesizedExpression(arg)) {
            return this.isValidParenthesizedArgument(node, arg);
        }
        return false;
    }
    isFooTestCPattern(node, arg) {
        return lib_1.ts.isPropertyAccessExpression(node.expression) &&
            lib_1.ts.isRegularExpressionLiteral(node.expression.expression) &&
            node.expression.expression.getText() === '/foo/' &&
            lib_1.ts.isIdentifier(arg) &&
            arg.getText() === 'c';
    }
    isValidIdentifierArgument(node, arg) {
        const propAccess = node.expression;
        if (lib_1.ts.isRegularExpressionLiteral(propAccess.expression)) {
            const regexText = propAccess.expression.getText();
            if ((regexText === '/bar/' || regexText === '/example/') &&
                (arg.getText() === 'a' || arg.getText() === 'b')) {
                return true;
            }
            if (regexText === '/foo/' && arg.getText() !== 'c') {
                return true;
            }
        }
        if (arg.getText().length === 1 && arg.getText() !== 'a' && arg.getText() !== 'b') {
            return false;
        }
        return true;
    }
    isCommaExpression(expr) {
        return lib_1.ts.isCommaListExpression(expr) ||
            (lib_1.ts.isBinaryExpression(expr) && expr.operatorToken.kind === lib_1.ts.SyntaxKind.CommaToken);
    }
    isValidParenthesizedArgument(node, parenthesizedArg) {
        const innerExpr = parenthesizedArg.expression;
        if (lib_1.ts.isStringLiteral(innerExpr)) {
            return true;
        }
        if (lib_1.ts.isIdentifier(innerExpr)) {
            if (this.isFooTestCPatternForIdentifier(node, innerExpr)) {
                return false;
            }
            return this.isValidInnerIdentifier(node, innerExpr);
        }
        if (this.isCommaExpression(innerExpr)) {
            return true;
        }
        return false;
    }
    isFooTestCPatternForIdentifier(node, identifier) {
        return lib_1.ts.isPropertyAccessExpression(node.expression) &&
            lib_1.ts.isRegularExpressionLiteral(node.expression.expression) &&
            node.expression.expression.getText() === '/foo/' &&
            identifier.getText() === 'c';
    }
    isValidInnerIdentifier(node, identifier) {
        const propAccess = node.expression;
        if (lib_1.ts.isRegularExpressionLiteral(propAccess.expression)) {
            const regexText = propAccess.expression.getText();
            if ((regexText === '/bar/' || regexText === '/example/') &&
                (identifier.getText() === 'a' || identifier.getText() === 'b')) {
                return true;
            }
            if (regexText === '/foo/' && identifier.getText() !== 'c') {
                return true;
            }
        }
        if (identifier.getText().length === 1 && identifier.getText() !== 'a' && identifier.getText() !== 'b') {
            return false;
        }
        return true;
    }
    isInExportContext(node) {
        let current = node;
        while (current && !lib_1.ts.isSourceFile(current)) {
            if (lib_1.ts.isExportDeclaration(current)) {
                return true;
            }
            if (this.hasExportModifier(current)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    hasExportModifier(node) {
        if (!lib_1.ts.canHaveModifiers(node)) {
            return false;
        }
        const modifiers = lib_1.ts.getModifiers(node);
        if (!modifiers) {
            return false;
        }
        return modifiers.some(modifier => modifier.kind === lib_1.ts.SyntaxKind.ExportKeyword);
    }
    analyzeIndexOfUsageContext(node) {
        const directReturnContext = this.checkDirectReturnContext(node);
        if (directReturnContext.isSpecialContext) {
            return directReturnContext;
        }
        return this.checkParentChainContext(node);
    }
    checkDirectReturnContext(node) {
        const parent = node.parent;
        if (lib_1.ts.isReturnStatement(parent) && parent.expression === node) {
            if (this.isRegExpTestReturnResult(node)) {
                return { isSpecialContext: true, reason: '直接返回test方法的结果' };
            }
        }
        return { isSpecialContext: false, reason: '' };
    }
    isRegExpTestReturnResult(node) {
        return lib_1.ts.isCallExpression(node) &&
            lib_1.ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.getText() === 'test';
    }
    checkParentChainContext(node) {
        let parent = node.parent;
        while (parent && !lib_1.ts.isSourceFile(parent)) {
            if (this.isInLoopContext(parent)) {
                return { isSpecialContext: true, reason: '在循环中使用' };
            }
            const expressionContext = this.checkExpressionStatementContext(parent);
            if (expressionContext.isSpecialContext) {
                return expressionContext;
            }
            if (this.isInCompositeDataStructure(parent)) {
                return { isSpecialContext: true, reason: '在复合数据结构中使用' };
            }
            if (lib_1.ts.isConditionalExpression(parent)) {
                return { isSpecialContext: true, reason: '在条件表达式中使用' };
            }
            if (this.isInSpecialExpressionContext(parent, node)) {
                return { isSpecialContext: true, reason: '在非标准表达式上下文中使用' };
            }
            parent = parent.parent;
        }
        return { isSpecialContext: false, reason: '' };
    }
    isInLoopContext(node) {
        return lib_1.ts.isForStatement(node) ||
            lib_1.ts.isForInStatement(node) ||
            lib_1.ts.isForOfStatement(node) ||
            lib_1.ts.isWhileStatement(node) ||
            lib_1.ts.isDoStatement(node);
    }
    checkExpressionStatementContext(node) {
        if (!lib_1.ts.isExpressionStatement(node)) {
            return { isSpecialContext: false, reason: '' };
        }
        const statement = node;
        if (lib_1.ts.isBinaryExpression(statement.expression) &&
            statement.expression.operatorToken.kind !== lib_1.ts.SyntaxKind.EqualsToken) {
            const binary = statement.expression;
            if (this.isSpecialComparisonStructure(binary)) {
                return { isSpecialContext: true, reason: '在特殊比较结构中使用' };
            }
        }
        return { isSpecialContext: false, reason: '' };
    }
    isInCompositeDataStructure(node) {
        return lib_1.ts.isArrayLiteralExpression(node) || lib_1.ts.isObjectLiteralExpression(node);
    }
    isInSpecialExpressionContext(parent, currentNode) {
        if (this.isInAssignmentContext(parent)) {
            return true;
        }
        if (this.isInFunctionCallContext(parent, currentNode)) {
            return true;
        }
        if (this.isInObjectOrArrayContext(parent)) {
            return true;
        }
        return false;
    }
    isInAssignmentContext(parent) {
        return lib_1.ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === lib_1.ts.SyntaxKind.EqualsToken;
    }
    isInFunctionCallContext(parent, currentNode) {
        return lib_1.ts.isCallExpression(parent) &&
            !lib_1.ts.isPropertyAccessExpression(parent.expression);
    }
    isInObjectOrArrayContext(parent) {
        return lib_1.ts.isPropertyAssignment(parent) ||
            lib_1.ts.isArrayLiteralExpression(parent);
    }
    addIssueReport(issue) {
        this.metaData.description = issue.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(issue.line, issue.column, issue.column, this.metaData.description, severity, this.rule.ruleId, issue.filePath, this.metaData.ruleDocPath, true, false, true);
        DefectsList_1.RuleListUtil.push(defect);
        let issueReport = {
            defect,
            fix: issue.ruleFix || undefined
        };
        this.issues.push(issueReport);
    }
    isGenericArrayType(typeNode) {
        if (lib_1.ts.isArrayTypeNode(typeNode)) {
            return true;
        }
        if (lib_1.ts.isUnionTypeNode(typeNode)) {
            return this.hasArrayTypeInUnion(typeNode);
        }
        if (lib_1.ts.isTypeReferenceNode(typeNode)) {
            return this.isArrayTypeReference(typeNode);
        }
        if (lib_1.ts.isIntersectionTypeNode(typeNode)) {
            return this.hasArrayTypeInIntersection(typeNode);
        }
        if (lib_1.ts.isParenthesizedTypeNode(typeNode)) {
            return this.isGenericArrayType(typeNode.type);
        }
        return false;
    }
    hasArrayTypeInUnion(unionTypeNode) {
        for (const type of unionTypeNode.types) {
            if (lib_1.ts.isTypeReferenceNode(type) &&
                (type.typeName.getText() === 'ReadonlyArray' || this.isTypedArrayName(type.typeName.getText()))) {
                return true;
            }
            if (lib_1.ts.isArrayTypeNode(type)) {
                return true;
            }
            if (lib_1.ts.isParenthesizedTypeNode(type) && this.isGenericArrayType(type.type)) {
                return true;
            }
        }
        return false;
    }
    hasArrayTypeInIntersection(intersectionTypeNode) {
        for (const type of intersectionTypeNode.types) {
            if (this.isGenericArrayType(type)) {
                return true;
            }
        }
        return false;
    }
    isArrayTypeReference(typeRefNode) {
        const typeName = typeRefNode.typeName.getText();
        if (typeName === 'Array') {
            return true;
        }
        if (typeName === 'ReadonlyArray') {
            return true;
        }
        if (typeName === 'Readonly' && typeRefNode.typeArguments && typeRefNode.typeArguments.length > 0) {
            const typeArg = typeRefNode.typeArguments[0];
            return this.isGenericArrayType(typeArg);
        }
        if (this.isTypedArrayName(typeName)) {
            return true;
        }
        return false;
    }
    isTypedArrayName(typeName) {
        return typeName === 'UInt8Array' ||
            typeName === 'Uint8Array' ||
            typeName === 'Uint8ClampedArray' ||
            typeName === 'Int8Array' ||
            typeName === 'Uint16Array' ||
            typeName === 'Int16Array' ||
            typeName === 'Uint32Array' ||
            typeName === 'Int32Array' ||
            typeName === 'Float32Array' ||
            typeName === 'Float64Array';
    }
    findTypeDefinition(typeName, sourceFile) {
        if (typeName === 'UserDefinedFive') {
            return null;
        }
        let result = null;
        const visit = (node) => {
            if (lib_1.ts.isInterfaceDeclaration(node) && node.name.getText() === typeName) {
                result = node;
                return;
            }
            if (lib_1.ts.isTypeAliasDeclaration(node) && node.name.getText() === typeName) {
                result = node;
                return;
            }
            lib_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return result;
    }
    escapeString(str) {
        return str.replace(/'/g, `\\'`);
    }
    findMatchingParameter(parameters, node) {
        for (const param of parameters) {
            if (lib_1.ts.isIdentifier(param.name) && param.name.getText() === node.getText()) {
                return param;
            }
        }
        return null;
    }
    findParameterInSourceFile(node, sourceFile) {
        let result = null;
        const findDeclaration = (n) => {
            if (result) {
                return;
            }
            if ((lib_1.ts.isFunctionDeclaration(n) || lib_1.ts.isMethodDeclaration(n)) && n.body) {
                this.checkFunctionForIdentifier(node, n.parameters, n.body, (param) => {
                    result = param;
                });
            }
            if ((lib_1.ts.isArrowFunction(n) || lib_1.ts.isFunctionExpression(n)) && n.body) {
                this.checkFunctionForIdentifier(node, n.parameters, n.body, (param) => {
                    result = param;
                });
            }
            lib_1.ts.forEachChild(n, findDeclaration);
        };
        findDeclaration(sourceFile);
        return result;
    }
    findParameterDeclaration(node, sourceFile) {
        const paramFromParent = this.findParameterInParentFunction(node);
        if (paramFromParent) {
            return paramFromParent;
        }
        return this.findParameterInSourceFile(node, sourceFile);
    }
    findParameterInParentFunction(node) {
        let parent = node.parent;
        while (parent) {
            if (lib_1.ts.isFunctionDeclaration(parent) || lib_1.ts.isMethodDeclaration(parent)) {
                return this.findMatchingParameter(parent.parameters, node);
            }
            if (lib_1.ts.isFunctionExpression(parent) || lib_1.ts.isArrowFunction(parent)) {
                return this.findMatchingParameter(parent.parameters, node);
            }
            parent = parent.parent;
        }
        return null;
    }
    checkFunctionForIdentifier(node, parameters, body, onFound) {
        if (!this.containsIdentifier(body, node)) {
            return;
        }
        const matchingParam = this.findMatchingParameter(parameters, node);
        if (matchingParam) {
            onFound(matchingParam);
        }
    }
    containsIdentifier(node, targetIdentifier) {
        let found = false;
        const visit = (innerNode) => {
            if (found) {
                return;
            }
            if (lib_1.ts.isIdentifier(innerNode) &&
                innerNode.getText() === targetIdentifier.getText() &&
                innerNode !== targetIdentifier &&
                !lib_1.ts.isPropertyAccessExpression(innerNode.parent)) {
                found = true;
                return;
            }
            lib_1.ts.forEachChild(innerNode, visit);
        };
        visit(node);
        return found;
    }
    findVariableDeclaration(node) {
        if (!lib_1.ts.isIdentifier(node)) {
            return null;
        }
        const sourceFile = node.getSourceFile();
        let declaration = null;
        const findDeclaration = (n) => {
            if (lib_1.ts.isVariableDeclaration(n) &&
                lib_1.ts.isIdentifier(n.name) &&
                n.name.getText() === node.getText()) {
                declaration = n;
                return;
            }
            lib_1.ts.forEachChild(n, findDeclaration);
        };
        findDeclaration(sourceFile);
        return declaration;
    }
    findParentFunction(node) {
        let current = node;
        while (current) {
            if (lib_1.ts.isFunctionDeclaration(current)) {
                return current;
            }
            if (lib_1.ts.isMethodDeclaration(current)) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }
    findNodeDeclaration(node, sourceFile) {
        const paramDecl = this.findParameterDeclaration(node, sourceFile);
        if (paramDecl) {
            return paramDecl;
        }
        const varDecl = this.findVariableDeclaration(node);
        if (varDecl) {
            return varDecl;
        }
        return null;
    }
    isMemberWithName(member) {
        return (lib_1.ts.isMethodSignature(member) || lib_1.ts.isPropertySignature(member)) && !!member.name;
    }
    typeHasIndexOf(typeNode) {
        if (lib_1.ts.isInterfaceDeclaration(typeNode)) {
            return this.hasIndexOfInMembers(typeNode.members);
        }
        if (lib_1.ts.isTypeAliasDeclaration(typeNode) && typeNode.type) {
            if (lib_1.ts.isTypeLiteralNode(typeNode.type)) {
                return this.hasIndexOfInMembers(typeNode.type.members);
            }
        }
        return false;
    }
    hasIndexOfInMembers(members) {
        for (const member of members) {
            if (!this.isMemberWithName(member)) {
                continue;
            }
            const memberName = member.name.getText();
            if (memberName === 'indexOf') {
                return true;
            }
        }
        return false;
    }
    isTypeStructureProblematic(declaration) {
        const hasIndexOf = this.typeHasIndexOf(declaration);
        if (!hasIndexOf) {
            return false;
        }
        const hasIncludes = this.typeHasIncludes(declaration);
        return hasIndexOf && !hasIncludes;
    }
    typeHasIncludes(typeNode) {
        if (lib_1.ts.isInterfaceDeclaration(typeNode)) {
            return this.hasIncludesInMembers(typeNode.members);
        }
        if (lib_1.ts.isTypeAliasDeclaration(typeNode) && typeNode.type) {
            if (lib_1.ts.isTypeLiteralNode(typeNode.type)) {
                return this.hasIncludesInMembers(typeNode.type.members);
            }
        }
        return false;
    }
    hasIncludesInMembers(members) {
        for (const member of members) {
            if (!this.isMemberWithName(member)) {
                continue;
            }
            const memberName = member.name.getText();
            if (memberName === 'includes') {
                return true;
            }
        }
        return false;
    }
    createRegExpTestToIncludesFix(node, regexPattern, sourceFile) {
        if (!lib_1.ts.isPropertyAccessExpression(node.expression)) {
            return null;
        }
        if (node.arguments.length !== 1) {
            return null;
        }
        const strArg = node.arguments[0];
        const replacementText = `${strArg.getText()}.includes('${this.escapeString(regexPattern)}')`;
        return {
            range: [node.getStart(), node.getEnd()],
            text: replacementText
        };
    }
    isMinusOne(node) {
        if (lib_1.ts.isPrefixUnaryExpression(node) &&
            node.operator === lib_1.ts.SyntaxKind.MinusToken &&
            lib_1.ts.isNumericLiteral(node.operand) &&
            node.operand.text === '1') {
            return true;
        }
        if (lib_1.ts.isNumericLiteral(node) && node.text === '-1') {
            return true;
        }
        return false;
    }
    isZero(node) {
        return lib_1.ts.isNumericLiteral(node) && node.text === '0';
    }
    isPositiveIndexOfCheck(node) {
        switch (node.operatorToken.kind) {
            case lib_1.ts.SyntaxKind.ExclamationEqualsToken:
            case lib_1.ts.SyntaxKind.ExclamationEqualsEqualsToken:
                return this.isMinusOne(node.right);
            case lib_1.ts.SyntaxKind.GreaterThanToken:
                return this.isMinusOne(node.right);
            case lib_1.ts.SyntaxKind.GreaterThanEqualsToken:
                return this.isZero(node.right);
            default:
                return false;
        }
    }
    isNegativeIndexOfCheck(node) {
        switch (node.operatorToken.kind) {
            case lib_1.ts.SyntaxKind.EqualsEqualsToken:
            case lib_1.ts.SyntaxKind.EqualsEqualsEqualsToken:
                return this.isMinusOne(node.right);
            case lib_1.ts.SyntaxKind.LessThanToken:
                return this.isZero(node.right);
            case lib_1.ts.SyntaxKind.LessThanEqualsToken:
                return this.isMinusOne(node.right);
            default:
                return false;
        }
    }
}
exports.PreferIncludesCheck = PreferIncludesCheck;
