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
exports.MemberOrderingCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'MemberOrderingCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/member-ordering.md",
    description: "Require consistent member ordering in classes, interfaces, and type literals",
};
// 定义更复杂的成员类型
var BaseMemberType;
(function (BaseMemberType) {
    BaseMemberType["signature"] = "signature";
    BaseMemberType["readonly-signature"] = "readonly-signature";
    BaseMemberType["call-signature"] = "call-signature";
    // Fields
    BaseMemberType["public-static-field"] = "public-static-field";
    BaseMemberType["public-static-readonly-field"] = "public-static-readonly-field";
    BaseMemberType["protected-static-field"] = "protected-static-field";
    BaseMemberType["protected-static-readonly-field"] = "protected-static-readonly-field";
    BaseMemberType["private-static-field"] = "private-static-field";
    BaseMemberType["private-static-readonly-field"] = "private-static-readonly-field";
    BaseMemberType["#private-static-field"] = "#private-static-field";
    BaseMemberType["#private-static-readonly-field"] = "#private-static-readonly-field";
    BaseMemberType["public-decorated-field"] = "public-decorated-field";
    BaseMemberType["public-decorated-readonly-field"] = "public-decorated-readonly-field";
    BaseMemberType["protected-decorated-field"] = "protected-decorated-field";
    BaseMemberType["protected-decorated-readonly-field"] = "protected-decorated-readonly-field";
    BaseMemberType["private-decorated-field"] = "private-decorated-field";
    BaseMemberType["private-decorated-readonly-field"] = "private-decorated-readonly-field";
    BaseMemberType["public-instance-field"] = "public-instance-field";
    BaseMemberType["public-instance-readonly-field"] = "public-instance-readonly-field";
    BaseMemberType["protected-instance-field"] = "protected-instance-field";
    BaseMemberType["protected-instance-readonly-field"] = "protected-instance-readonly-field";
    BaseMemberType["private-instance-field"] = "private-instance-field";
    BaseMemberType["private-instance-readonly-field"] = "private-instance-readonly-field";
    BaseMemberType["#private-instance-field"] = "#private-instance-field";
    BaseMemberType["#private-instance-readonly-field"] = "#private-instance-readonly-field";
    BaseMemberType["public-abstract-field"] = "public-abstract-field";
    BaseMemberType["public-abstract-readonly-field"] = "public-abstract-readonly-field";
    BaseMemberType["protected-abstract-field"] = "protected-abstract-field";
    BaseMemberType["protected-abstract-readonly-field"] = "protected-abstract-readonly-field";
    BaseMemberType["public-field"] = "public-field";
    BaseMemberType["public-readonly-field"] = "public-readonly-field";
    BaseMemberType["#private-field"] = "#private-field";
    BaseMemberType["#private-readonly-field"] = "#private-readonly-field";
    BaseMemberType["protected-field"] = "protected-field";
    BaseMemberType["protected-readonly-field"] = "protected-readonly-field";
    BaseMemberType["private-field"] = "private-field";
    BaseMemberType["private-readonly-field"] = "private-readonly-field";
    BaseMemberType["static-field"] = "static-field";
    BaseMemberType["static-readonly-field"] = "static-readonly-field";
    BaseMemberType["instance-field"] = "instance-field";
    BaseMemberType["instance-readonly-field"] = "instance-readonly-field";
    BaseMemberType["abstract-field"] = "abstract-field";
    BaseMemberType["abstract-readonly-field"] = "abstract-readonly-field";
    BaseMemberType["decorated-field"] = "decorated-field";
    BaseMemberType["decorated-readonly-field"] = "decorated-readonly-field";
    BaseMemberType["field"] = "field";
    BaseMemberType["readonly-field"] = "readonly-field";
    // Static initialization
    BaseMemberType["static-initialization"] = "static-initialization";
    // Constructors
    BaseMemberType["public-constructor"] = "public-constructor";
    BaseMemberType["protected-constructor"] = "protected-constructor";
    BaseMemberType["private-constructor"] = "private-constructor";
    BaseMemberType["constructor"] = "constructor";
    // Accessors
    BaseMemberType["public-static-accessor"] = "public-static-accessor";
    BaseMemberType["protected-static-accessor"] = "protected-static-accessor";
    BaseMemberType["private-static-accessor"] = "private-static-accessor";
    BaseMemberType["#private-static-accessor"] = "#private-static-accessor";
    BaseMemberType["public-decorated-accessor"] = "public-decorated-accessor";
    BaseMemberType["protected-decorated-accessor"] = "protected-decorated-accessor";
    BaseMemberType["private-decorated-accessor"] = "private-decorated-accessor";
    BaseMemberType["public-instance-accessor"] = "public-instance-accessor";
    BaseMemberType["protected-instance-accessor"] = "protected-instance-accessor";
    BaseMemberType["private-instance-accessor"] = "private-instance-accessor";
    BaseMemberType["#private-instance-accessor"] = "#private-instance-accessor";
    BaseMemberType["public-abstract-accessor"] = "public-abstract-accessor";
    BaseMemberType["protected-abstract-accessor"] = "protected-abstract-accessor";
    BaseMemberType["public-accessor"] = "public-accessor";
    BaseMemberType["protected-accessor"] = "protected-accessor";
    BaseMemberType["private-accessor"] = "private-accessor";
    BaseMemberType["#private-accessor"] = "#private-accessor";
    BaseMemberType["static-accessor"] = "static-accessor";
    BaseMemberType["instance-accessor"] = "instance-accessor";
    BaseMemberType["abstract-accessor"] = "abstract-accessor";
    BaseMemberType["decorated-accessor"] = "decorated-accessor";
    BaseMemberType["accessor"] = "accessor";
    // Getters
    BaseMemberType["public-static-get"] = "public-static-get";
    BaseMemberType["protected-static-get"] = "protected-static-get";
    BaseMemberType["private-static-get"] = "private-static-get";
    BaseMemberType["#private-static-get"] = "#private-static-get";
    BaseMemberType["public-decorated-get"] = "public-decorated-get";
    BaseMemberType["protected-decorated-get"] = "protected-decorated-get";
    BaseMemberType["private-decorated-get"] = "private-decorated-get";
    BaseMemberType["public-instance-get"] = "public-instance-get";
    BaseMemberType["protected-instance-get"] = "protected-instance-get";
    BaseMemberType["private-instance-get"] = "private-instance-get";
    BaseMemberType["#private-instance-get"] = "#private-instance-get";
    BaseMemberType["public-abstract-get"] = "public-abstract-get";
    BaseMemberType["protected-abstract-get"] = "protected-abstract-get";
    BaseMemberType["public-get"] = "public-get";
    BaseMemberType["protected-get"] = "protected-get";
    BaseMemberType["private-get"] = "private-get";
    BaseMemberType["#private-get"] = "#private-get";
    BaseMemberType["static-get"] = "static-get";
    BaseMemberType["instance-get"] = "instance-get";
    BaseMemberType["abstract-get"] = "abstract-get";
    BaseMemberType["decorated-get"] = "decorated-get";
    BaseMemberType["get"] = "get";
    // Setters
    BaseMemberType["public-static-set"] = "public-static-set";
    BaseMemberType["protected-static-set"] = "protected-static-set";
    BaseMemberType["private-static-set"] = "private-static-set";
    BaseMemberType["#private-static-set"] = "#private-static-set";
    BaseMemberType["public-decorated-set"] = "public-decorated-set";
    BaseMemberType["protected-decorated-set"] = "protected-decorated-set";
    BaseMemberType["private-decorated-set"] = "private-decorated-set";
    BaseMemberType["public-instance-set"] = "public-instance-set";
    BaseMemberType["protected-instance-set"] = "protected-instance-set";
    BaseMemberType["private-instance-set"] = "private-instance-set";
    BaseMemberType["#private-instance-set"] = "#private-instance-set";
    BaseMemberType["public-abstract-set"] = "public-abstract-set";
    BaseMemberType["protected-abstract-set"] = "protected-abstract-set";
    BaseMemberType["public-set"] = "public-set";
    BaseMemberType["protected-set"] = "protected-set";
    BaseMemberType["private-set"] = "private-set";
    BaseMemberType["#private-set"] = "#private-set";
    BaseMemberType["static-set"] = "static-set";
    BaseMemberType["instance-set"] = "instance-set";
    BaseMemberType["abstract-set"] = "abstract-set";
    BaseMemberType["decorated-set"] = "decorated-set";
    BaseMemberType["set"] = "set";
    // Methods
    BaseMemberType["public-static-method"] = "public-static-method";
    BaseMemberType["protected-static-method"] = "protected-static-method";
    BaseMemberType["private-static-method"] = "private-static-method";
    BaseMemberType["#private-static-method"] = "#private-static-method";
    BaseMemberType["public-decorated-method"] = "public-decorated-method";
    BaseMemberType["protected-decorated-method"] = "protected-decorated-method";
    BaseMemberType["private-decorated-method"] = "private-decorated-method";
    BaseMemberType["public-instance-method"] = "public-instance-method";
    BaseMemberType["protected-instance-method"] = "protected-instance-method";
    BaseMemberType["private-instance-method"] = "private-instance-method";
    BaseMemberType["#private-instance-method"] = "#private-instance-method";
    BaseMemberType["public-abstract-method"] = "public-abstract-method";
    BaseMemberType["protected-abstract-method"] = "protected-abstract-method";
    BaseMemberType["public-method"] = "public-method";
    BaseMemberType["protected-method"] = "protected-method";
    BaseMemberType["private-method"] = "private-method";
    BaseMemberType["#private-method"] = "#private-method";
    BaseMemberType["static-method"] = "static-method";
    BaseMemberType["instance-method"] = "instance-method";
    BaseMemberType["abstract-method"] = "abstract-method";
    BaseMemberType["decorated-method"] = "decorated-method";
    BaseMemberType["method"] = "method";
})(BaseMemberType || (BaseMemberType = {}));
const defaultOptions = {
    "default": [
        // Index signature
        "signature",
        "readonly-signature",
        "call-signature",
        // Fields
        "public-static-field",
        "public-static-readonly-field",
        "protected-static-field",
        "protected-static-readonly-field",
        "private-static-field",
        "private-static-readonly-field",
        "#private-static-field",
        "#private-static-readonly-field",
        "public-decorated-field",
        "public-decorated-readonly-field",
        "protected-decorated-field",
        "protected-decorated-readonly-field",
        "private-decorated-field",
        "private-decorated-readonly-field",
        "public-instance-field",
        "public-instance-readonly-field",
        "protected-instance-field",
        "protected-instance-readonly-field",
        "private-instance-field",
        "private-instance-readonly-field",
        "#private-instance-field",
        "#private-instance-readonly-field",
        "public-abstract-field",
        "public-abstract-readonly-field",
        "protected-abstract-field",
        "protected-abstract-readonly-field",
        "public-field",
        "public-readonly-field",
        "protected-field",
        "protected-readonly-field",
        "private-field",
        "private-readonly-field",
        "#private-field",
        "#private-readonly-field",
        "static-field",
        "static-readonly-field",
        "instance-field",
        "instance-readonly-field",
        "abstract-field",
        "abstract-readonly-field",
        "decorated-field",
        "decorated-readonly-field",
        "field",
        "readonly-field",
        // Static initialization
        "static-initialization",
        // Constructors
        "public-constructor",
        "protected-constructor",
        "private-constructor",
        "constructor",
        // Accessors
        "public-static-accessor",
        "protected-static-accessor",
        "private-static-accessor",
        "#private-static-accessor",
        "public-decorated-accessor",
        "protected-decorated-accessor",
        "private-decorated-accessor",
        "public-instance-accessor",
        "protected-instance-accessor",
        "private-instance-accessor",
        "#private-instance-accessor",
        "public-abstract-accessor",
        "protected-abstract-accessor",
        "public-accessor",
        "protected-accessor",
        "private-accessor",
        "#private-accessor",
        "static-accessor",
        "instance-accessor",
        "abstract-accessor",
        "decorated-accessor",
        "accessor",
        // Getters
        "public-static-get",
        "protected-static-get",
        "private-static-get",
        "#private-static-get",
        "public-decorated-get",
        "protected-decorated-get",
        "private-decorated-get",
        "public-instance-get",
        "protected-instance-get",
        "private-instance-get",
        "#private-instance-get",
        "public-abstract-get",
        "protected-abstract-get",
        "public-get",
        "protected-get",
        "private-get",
        "#private-get",
        "static-get",
        "instance-get",
        "abstract-get",
        "decorated-get",
        "get",
        // Setters
        "public-static-set",
        "protected-static-set",
        "private-static-set",
        "#private-static-set",
        "public-decorated-set",
        "protected-decorated-set",
        "private-decorated-set",
        "public-instance-set",
        "protected-instance-set",
        "private-instance-set",
        "#private-instance-set",
        "public-abstract-set",
        "protected-abstract-set",
        "public-set",
        "protected-set",
        "private-set",
        "#private-set",
        "static-set",
        "instance-set",
        "abstract-set",
        "decorated-set",
        "set",
        // Methods
        "public-static-method",
        "protected-static-method",
        "private-static-method",
        "#private-static-method",
        "public-decorated-method",
        "protected-decorated-method",
        "private-decorated-method",
        "public-instance-method",
        "protected-instance-method",
        "private-instance-method",
        "#private-instance-method",
        "public-abstract-method",
        "protected-abstract-method",
        "public-method",
        "protected-method",
        "private-method",
        "#private-method",
        "static-method",
        "instance-method",
        "abstract-method",
        "decorated-method",
        "method"
    ]
};
class MemberOrderingCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    asRoot;
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
    check = (arkFile) => {
        if (arkFile instanceof arkanalyzer_1.ArkFile) {
            const code = arkFile.getCode();
            if (!code) {
                return;
            }
            this.asRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
            if (!this.asRoot) {
                return;
            }
            const filePath = arkFile.getFilePath();
            // 检查成员排序
            this.checkMemberOrder(this.asRoot, filePath);
        }
    };
    // 检查类的成员排序
    checkMemberOrder(sourceFile, filePath) {
        // 遍历 AST
        const visit = (node) => {
            if (arkanalyzer_1.ts.isClassDeclaration(node)) {
                const orderConfigDefault = this.getClassesOrderConfig();
                const members = Array.from(node.members);
                this.validateMembersOrder(members, filePath, orderConfigDefault);
            }
            if (arkanalyzer_1.ts.isClassExpression(node)) {
                const orderConfigDefault = this.getClassExpressionsOrderConfig();
                const members = Array.from(node.members);
                this.validateMembersOrder(members, filePath, orderConfigDefault);
            }
            if (arkanalyzer_1.ts.isInterfaceDeclaration(node)) {
                const orderConfigDefault = this.getInterfacesOrderConfig();
                const members = Array.from(node.members);
                this.validateMembersOrder(members, filePath, orderConfigDefault);
            }
            if (arkanalyzer_1.ts.isTypeLiteralNode(node)) {
                const orderConfigDefault = this.getTypeLiteralsOrderConfig();
                const members = Array.from(node.members);
                this.validateMembersOrder(members, filePath, orderConfigDefault);
            }
            // 遍历子节点
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }
    getClassesOrderConfig() {
        let option;
        if (this.rule && this.rule.option) {
            option = this.rule.option;
            const classesOrderConfig = option[0]?.classes;
            if (classesOrderConfig) {
                return classesOrderConfig;
            }
        }
        // 使用默认配置并确保其类型正确
        return this.getDefaultOrderConfig();
    }
    getClassExpressionsOrderConfig() {
        let option;
        if (this.rule && this.rule.option) {
            option = this.rule.option;
            const classExpressionsOrderConfig = option[0]?.classExpressions;
            if (classExpressionsOrderConfig) {
                return classExpressionsOrderConfig;
            }
        }
        // 使用默认配置并确保其类型正确
        return this.getDefaultOrderConfig();
    }
    getInterfacesOrderConfig() {
        let option;
        if (this.rule && this.rule.option) {
            option = this.rule.option;
            const interfacesOrderConfig = option[0]?.interfaces;
            if (interfacesOrderConfig) {
                return interfacesOrderConfig;
            }
        }
        // 使用默认配置并确保其类型正确
        return this.getDefaultOrderConfig();
    }
    getTypeLiteralsOrderConfig() {
        let option;
        if (this.rule && this.rule.option) {
            option = this.rule.option;
            const typeLiteralsOrderConfig = option[0]?.typeLiterals;
            if (typeLiteralsOrderConfig) {
                return typeLiteralsOrderConfig;
            }
        }
        // 使用默认配置并确保其类型正确
        return this.getDefaultOrderConfig();
    }
    getDefaultOrderConfig() {
        let option;
        if (this.rule && this.rule.option) {
            option = this.rule.option;
            const defaultConfig = option[0]?.default;
            if (defaultConfig) {
                return defaultConfig;
            }
        }
        // 使用默认配置并确保其类型正确
        return (defaultOptions.default || []);
    }
    getMemberName(node) {
        if (arkanalyzer_1.ts.isPropertySignature(node) || arkanalyzer_1.ts.isPropertyDeclaration(node)) {
            if (arkanalyzer_1.ts.isComputedPropertyName(node.name)) {
                return this.getComputedPropertyName(node.name);
            }
            else {
                return node.name.text;
            }
        }
        else if (arkanalyzer_1.ts.isMethodSignature(node) || arkanalyzer_1.ts.isMethodDeclaration(node)) {
            if (arkanalyzer_1.ts.isComputedPropertyName(node.name)) {
                return this.getComputedPropertyName(node.name);
            }
            else {
                return node.name.text;
            }
        }
        else if (arkanalyzer_1.ts.isConstructorDeclaration(node)) {
            return 'constructor';
        }
        else if (arkanalyzer_1.ts.isCallSignatureDeclaration(node)) {
            return 'call';
        }
        else if (arkanalyzer_1.ts.isNewExpression(node)) {
            return 'new';
        }
        else if (arkanalyzer_1.ts.isConstructSignatureDeclaration(node)) {
            return 'new';
        }
        else if (arkanalyzer_1.ts.isIndexSignatureDeclaration(node)) {
            const parameter = node.parameters[0];
            if (arkanalyzer_1.ts.isIdentifier(parameter.name)) {
                return parameter.name.text;
            }
        }
        else if (arkanalyzer_1.ts.isGetAccessorDeclaration(node) || arkanalyzer_1.ts.isSetAccessorDeclaration(node)) {
            if (arkanalyzer_1.ts.isComputedPropertyName(node.name)) {
                return this.getComputedPropertyName(node.name);
            }
            else {
                return node.name.text;
            }
        }
        else if (arkanalyzer_1.ts.isClassStaticBlockDeclaration(node)) {
            return 'static block';
        }
        return 'null';
    }
    getComputedPropertyName(node) {
        if (arkanalyzer_1.ts.isStringLiteral(node.expression) || arkanalyzer_1.ts.isNumericLiteral(node.expression)) {
            return node.expression.text;
        }
        else if (arkanalyzer_1.ts.isIdentifier(node.expression)) {
            return node.expression.text;
        }
        return node.expression.getText();
    }
    isMemberOptional(node) {
        if (arkanalyzer_1.ts.isPropertyDeclaration(node) || arkanalyzer_1.ts.isPropertySignature(node) || arkanalyzer_1.ts.isMethodSignature(node)) {
            return !!node.questionToken;
        }
        return false;
    }
    getRank(memberType, orderConfig) {
        // 将 memberType 显式转换为字符串
        const memberTypeString = String(memberType);
        let index = orderConfig.indexOf(memberTypeString);
        if (index === -1) {
            const keyType = this.extractTwoKeyType(memberTypeString);
            index = orderConfig.indexOf(keyType);
        }
        if (index === -1) {
            const keyType = this.extractKeyType(memberTypeString);
            index = orderConfig.indexOf(keyType);
        }
        return index >= 0 ? index : -1; // 如果找不到则返回 -1
    }
    extractKeyType(memberTypeString) {
        const parts = memberTypeString.split('-');
        return parts[parts.length - 1];
    }
    extractTwoKeyType(memberTypeString) {
        const parts = memberTypeString.split('-');
        if (parts.length > 1) {
            return parts.slice(1).join('-');
        }
        return parts[0];
    }
    // 辅助函数
    getNodeType(node) {
        if (arkanalyzer_1.ts.isPropertySignature(node) || arkanalyzer_1.ts.isPropertyDeclaration(node)) {
            // 检查字段值是否为函数
            if (node.initializer && (arkanalyzer_1.ts.isArrowFunction(node.initializer) || arkanalyzer_1.ts.isFunctionExpression(node.initializer))) {
                return this.determineMethodMemberType(node);
            }
            // 检查字段名是否以 # 开头，表示私有字段
            if (node.name.getText().startsWith('#')) {
                const fieldType = this.determineFieldMemberType(node);
                if (fieldType) {
                    return `#${fieldType}`;
                }
            }
            return this.determineFieldMemberType(node);
        }
        return this.getNodeTypeOther(node);
    }
    // 辅助函数
    getNodeTypeOther(node) {
        if (arkanalyzer_1.ts.isMethodSignature(node) || arkanalyzer_1.ts.isMethodDeclaration(node)) {
            return this.determineMethodMemberType(node);
        }
        else if (arkanalyzer_1.ts.isConstructorDeclaration(node) || arkanalyzer_1.ts.isConstructSignatureDeclaration(node)) {
            return BaseMemberType.constructor;
        }
        else if (arkanalyzer_1.ts.isIndexSignatureDeclaration(node)) {
            return BaseMemberType.signature;
        }
        else if (arkanalyzer_1.ts.isCallSignatureDeclaration(node)) {
            return BaseMemberType['call-signature'];
        }
        else if (arkanalyzer_1.ts.isCallSignatureDeclaration(node)) {
            return BaseMemberType['call-signature'];
        }
        else if (arkanalyzer_1.ts.isFunctionExpression(node) || arkanalyzer_1.ts.isArrowFunction(node)) {
            return BaseMemberType.method;
        }
        else if (arkanalyzer_1.ts.isGetAccessor(node)) {
            return this.determineGetterMemberType(node);
        }
        else if (arkanalyzer_1.ts.isSetAccessor(node)) {
            return this.determineSetterMemberType(node);
        }
        else if (arkanalyzer_1.ts.isAccessor(node)) {
            return BaseMemberType.accessor;
        }
        else if (arkanalyzer_1.ts.isClassStaticBlockDeclaration(node)) {
            return BaseMemberType['public-instance-method'];
        }
        return null;
    }
    determineGetterMemberType(node) {
        if (arkanalyzer_1.ts.isGetAccessor(node)) {
            const modifiers = node.modifiers || [];
            const hasPublic = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PublicKeyword);
            const hasStatic = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
            const hasProtected = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ProtectedKeyword);
            const hasPrivate = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PrivateKeyword);
            const hasDecorator = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.Decorator);
            if ((hasPublic || (!hasPublic && !hasProtected && !hasPrivate)) && hasStatic) {
                return BaseMemberType['public-static-get'];
            }
            if (hasPublic && hasDecorator) {
                return BaseMemberType['public-decorated-get'];
            }
            if (hasPublic) {
                return BaseMemberType['public-instance-get'];
            }
            if (hasProtected && hasStatic) {
                return BaseMemberType['protected-static-get'];
            }
            if (hasProtected && hasDecorator) {
                return BaseMemberType['protected-decorated-get'];
            }
            if (hasProtected) {
                return BaseMemberType['protected-instance-get'];
            }
            if (hasPrivate && hasStatic) {
                return BaseMemberType['private-static-get'];
            }
            return this.determineGetterMemberTypeTwo(hasPrivate, hasDecorator);
        }
        return BaseMemberType.get; // 默认返回 'get'
    }
    determineGetterMemberTypeTwo(hasPrivate, hasDecorator) {
        if (hasPrivate && hasDecorator) {
            return BaseMemberType['private-decorated-get'];
        }
        if (hasPrivate) {
            return BaseMemberType['private-instance-get'];
        }
        if (hasDecorator) {
            return BaseMemberType['decorated-get'];
        }
        return BaseMemberType.get;
    }
    determineSetterMemberType(node) {
        if (arkanalyzer_1.ts.isSetAccessor(node)) {
            const modifiers = node.modifiers || [];
            const hasPublic = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PublicKeyword);
            const hasStatic = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
            const hasProtected = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ProtectedKeyword);
            const hasPrivate = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PrivateKeyword);
            const hasDecorator = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.Decorator);
            if ((hasPublic || (!hasPublic && !hasProtected && !hasPrivate)) && hasStatic) {
                return BaseMemberType['public-static-set'];
            }
            if (hasPublic && hasDecorator) {
                return BaseMemberType['public-decorated-set'];
            }
            if (hasPublic) {
                return BaseMemberType['public-instance-set'];
            }
            if (hasProtected && hasStatic) {
                return BaseMemberType['protected-static-set'];
            }
            if (hasProtected && hasDecorator) {
                return BaseMemberType['protected-decorated-set'];
            }
            if (hasProtected) {
                return BaseMemberType['protected-instance-set'];
            }
            if (hasPrivate && hasStatic) {
                return BaseMemberType['private-static-set'];
            }
            return this.determineSetterMemberTypeTwo(hasPrivate, hasDecorator);
        }
        return BaseMemberType.set; // 默认返回 'set'
    }
    determineSetterMemberTypeTwo(hasPrivate, hasDecorator) {
        if (hasPrivate && hasDecorator) {
            return BaseMemberType['private-decorated-set'];
        }
        if (hasPrivate) {
            return BaseMemberType['private-instance-set'];
        }
        if (hasDecorator) {
            return BaseMemberType['decorated-set'];
        }
        return BaseMemberType.set;
    }
    determineFieldMemberType(node) {
        if (arkanalyzer_1.ts.isPropertyDeclaration(node)) {
            const modifiers = node.modifiers || [];
            const hasPublic = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PublicKeyword);
            const hasStatic = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
            const hasProtected = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ProtectedKeyword);
            const hasPrivate = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PrivateKeyword);
            const hasReadonly = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ReadonlyKeyword);
            // 判断是否为实例字段
            const isInstanceField = !hasStatic;
            if ((hasPublic || (!hasPublic && !hasProtected && !hasPrivate)) && hasStatic) {
                return BaseMemberType['public-static-field'];
            }
            if ((hasPublic || (!hasPublic && !hasProtected && !hasPrivate)) && hasReadonly) {
                return BaseMemberType['public-readonly-field'];
            }
            if (hasPublic && isInstanceField) {
                return BaseMemberType['public-instance-field'];
            }
            if (hasPublic) {
                return BaseMemberType['public-field'];
            }
            return this.determineFieldMemberTypeTwo(hasProtected, hasStatic, hasReadonly, hasPrivate, isInstanceField);
        }
        return BaseMemberType.field; // 默认返回 field
    }
    determineFieldMemberTypeTwo(hasProtected, hasStatic, hasReadonly, hasPrivate, isInstanceField) {
        if (hasProtected && hasStatic) {
            return BaseMemberType['protected-static-field'];
        }
        if (hasProtected && hasReadonly) {
            return BaseMemberType['protected-readonly-field'];
        }
        if (hasProtected && isInstanceField) {
            return BaseMemberType['protected-instance-field'];
        }
        if (hasProtected) {
            return BaseMemberType['protected-field'];
        }
        if (hasPrivate && hasStatic) {
            return BaseMemberType['private-static-field'];
        }
        if (hasStatic) {
            return BaseMemberType['static-field'];
        }
        if (hasPrivate && hasReadonly) {
            return BaseMemberType['private-readonly-field'];
        }
        if (hasPrivate && isInstanceField) {
            return BaseMemberType['private-instance-field'];
        }
        if (hasPrivate) {
            return BaseMemberType['private-field'];
        }
        if (isInstanceField) {
            return BaseMemberType['instance-field'];
        }
        return BaseMemberType.field;
    }
    determineMethodMemberType(node) {
        const modifiers = node.modifiers || [];
        const hasPublic = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PublicKeyword);
        const hasStatic = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.StaticKeyword);
        const hasProtected = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ProtectedKeyword);
        const hasPrivate = modifiers.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.PrivateKeyword);
        // 判断是否为实例方法
        const isInstanceMethod = hasStatic;
        if (hasPublic && hasStatic) {
            return BaseMemberType['public-static-method'];
        }
        if (!hasPublic && !hasProtected && !hasPublic && isInstanceMethod) {
            return BaseMemberType['public-instance-method'];
        }
        if (hasPublic || (!hasPublic && !hasProtected && !hasPublic && !hasStatic)) {
            return BaseMemberType['public-method'];
        }
        if (hasProtected && hasStatic) {
            return BaseMemberType['protected-static-method'];
        }
        if (hasProtected && isInstanceMethod) {
            return BaseMemberType['protected-instance-method'];
        }
        if (hasProtected) {
            return BaseMemberType['protected-method'];
        }
        if (hasPrivate && hasStatic) {
            return BaseMemberType['private-static-method'];
        }
        return this.determineMethodMemberTypeTwo(hasPrivate, isInstanceMethod);
    }
    determineMethodMemberTypeTwo(hasPrivate, isInstanceMethod) {
        if (hasPrivate && isInstanceMethod) {
            return BaseMemberType['private-instance-method'];
        }
        if (hasPrivate) {
            return BaseMemberType['private-method'];
        }
        if (isInstanceMethod) {
            return BaseMemberType['instance-method'];
        }
        return BaseMemberType.method;
    }
    // 检查成员组排序
    checkGroupSort(members, orderConfig) {
        const results = [];
        let lastRank = -1;
        let beforeRankType = '';
        for (const member of members) {
            const memberType = this.getNodeType(member);
            if (!memberType) {
                continue;
            }
            const rank = this.getRank(memberType, orderConfig);
            if (rank === -1) {
                continue;
            }
            if (rank < lastRank) {
                let memberName = this.getMemberName(member);
                if (memberName.startsWith('#')) {
                    memberName = memberName.replace('#', '');
                }
                let modifiedFieldType = this.modifiedFieldType(beforeRankType);
                results.push({
                    line: this.getLineAndCharacter(member).line,
                    startCol: this.getLineAndCharacter(member).character,
                    nameStr: memberName,
                    description: `Member ${memberName} should be declared before all ${modifiedFieldType} definitions.`
                });
            }
            else {
                beforeRankType = String(memberType);
                lastRank = rank;
            }
        }
        return results;
    }
    modifiedFieldType(fieldType) {
        let modifiedFieldType = fieldType;
        if (modifiedFieldType) {
            if (modifiedFieldType.startsWith('#public')) {
                modifiedFieldType = modifiedFieldType.replace('#public', '#private');
            }
            else if (modifiedFieldType.startsWith('#protected')) {
                modifiedFieldType = modifiedFieldType.replace('#protected', '#private');
            }
            else if (modifiedFieldType.startsWith('#') && !modifiedFieldType.startsWith('#private')) {
                modifiedFieldType = modifiedFieldType.replace('#', '#private-');
            }
            else if (modifiedFieldType.startsWith('public-method')) {
                modifiedFieldType = modifiedFieldType.replace('public-method', 'public-instance-method');
            }
            else if (modifiedFieldType.trim() === 'constructor') {
                modifiedFieldType = 'public constructor';
            }
            modifiedFieldType = modifiedFieldType.replace(/-/g, ' ');
        }
        return modifiedFieldType;
    }
    //检查成员按字母排序
    checkAlphaSort(members, sensitive) {
        const results = [];
        const names = members.map(this.getMemberName); // 获取成员名称
        // 遍历所有成员，找出未按排序顺序排列的成员
        for (let i = 0; i < names.length - 1; i++) {
            let next = names[i + 1];
            let current = names[i];
            let compare = false;
            if (sensitive) {
                compare = this.compareValues(next, current);
            }
            else {
                compare = this.compareValues(next.toLowerCase(), current.toLowerCase());
            }
            if (compare) {
                // 如果当前成员未按排序顺序排列，记录其位置信息
                results.push({
                    line: this.getLineAndCharacter(members[i + 1]).line,
                    startCol: this.getLineAndCharacter(members[i + 1]).character,
                    nameStr: next,
                    description: `Member ${current} should be declared before member ${next}.`
                });
            }
        }
        return results;
    }
    //检查成员按字母排序
    checkAlphaByGroupSort(members, sensitive) {
        const results = [];
        const names = members.map(this.getMemberName); // 获取成员名称
        // 遍历所有成员，找出未按排序顺序排列的成员
        for (let i = 0; i < names.length - 1; i++) {
            const current = names[i];
            const currentMemberType = this.getNodeType(members[i]);
            for (let j = i + 1; j < members.length - 1; j++) {
                const nextMemberType = this.getNodeType(members[j]);
                if (currentMemberType === nextMemberType) {
                    const next = names[j];
                    let compare = false;
                    if (sensitive) {
                        compare = this.compareValues(next, current);
                    }
                    else {
                        compare = this.compareValues(next.toLowerCase(), current.toLowerCase());
                    }
                    if (compare) {
                        // 如果当前成员未按排序顺序排列，记录其位置信息
                        results.push({
                            line: this.getLineAndCharacter(members[j]).line,
                            startCol: this.getLineAndCharacter(members[j]).character,
                            nameStr: next,
                            description: `Member ${current} should be declared before member ${next}.`
                        });
                    }
                }
            }
        }
        return results;
    }
    compareValues(next, current) {
        // 将输入转换为字符串，以便统一处理
        const nextStr = String(next);
        const currentStr = String(current);
        // 检测是否为数字字符串
        const isNextNumber = !isNaN(parseFloat(nextStr)) && isFinite(parseFloat(nextStr));
        const isCurrentNumber = !isNaN(parseFloat(currentStr)) && isFinite(parseFloat(currentStr));
        // 如果两者都是数字字符串，按数字比较
        if (isNextNumber && isCurrentNumber) {
            return parseFloat(nextStr) < parseFloat(currentStr);
        }
        // 如果两者都是字符串，使用自然排序逻辑
        if (typeof next === 'string' && typeof current === 'string') {
            return this.naturalSort(nextStr, currentStr);
        }
        // 如果类型不一致，按字符串比较
        return nextStr < currentStr;
    }
    // 自然排序逻辑
    naturalSort(a, b) {
        const regex = /(\d+)|(\D+)/g; // 匹配数字或非数字部分
        const aParts = a.match(regex) || [];
        const bParts = b.match(regex) || [];
        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
            const aPart = aParts[i];
            const bPart = bParts[i];
            if (aPart !== bPart) {
                // 如果是数字部分，按数字比较
                if (!isNaN(Number(aPart)) && !isNaN(Number(bPart))) {
                    return Number(aPart) < Number(bPart);
                }
                // 如果是非数字部分，按字符串比较
                return aPart < bPart;
            }
        }
        // 如果所有部分都相等，比较长度
        return aParts.length - bParts.length < 0;
    }
    //检查可选和必需成员排序
    checkRequiredOrder(members, insensitive) {
        const results = [];
        let resultMember = members[0];
        let hasMark = false;
        for (let i = 0; i < members.length - 1; i++) {
            let next = members[i + 1];
            let nextIsMemberOptional = this.isMemberOptional(next);
            let current = members[i];
            let currentIsMemberOptional = this.isMemberOptional(current);
            if (insensitive) {
                if (i === 0 && !currentIsMemberOptional) {
                    this.addLocationInfo(results, current);
                    return results;
                }
                if (!currentIsMemberOptional && nextIsMemberOptional) {
                    if (hasMark) {
                        this.addLocationInfo(results, resultMember);
                    }
                    else {
                        this.addLocationInfo(results, current);
                    }
                    return results;
                }
                if (!currentIsMemberOptional && !nextIsMemberOptional && !hasMark) {
                    resultMember = current;
                    hasMark = true;
                }
            }
            else {
                if (i === 0 && currentIsMemberOptional) {
                    this.addLocationInfo(results, current);
                    return results;
                }
                if (currentIsMemberOptional && !nextIsMemberOptional) {
                    if (hasMark) {
                        this.addLocationInfo(results, resultMember);
                    }
                    else {
                        this.addLocationInfo(results, current);
                    }
                    return results;
                }
                if (currentIsMemberOptional && nextIsMemberOptional && !hasMark) {
                    resultMember = current;
                    hasMark = true;
                }
            }
        }
        return results;
    }
    addLocationInfo(results, node) {
        const location = this.getLineAndCharacter(node);
        results.push({
            line: this.getLineAndCharacter(node).line,
            startCol: this.getLineAndCharacter(node).character,
            nameStr: this.getMemberName(node),
            description: 'Require a consistent member declaration order'
        });
    }
    // 验证逻辑
    validateMembersOrder(members, filePath, orderConfigDefault) {
        let groupErrors = [];
        let alphaErrors = [];
        let requiredErrors = [];
        let hasCollect = true;
        if (Array.isArray(orderConfigDefault)) {
            const orderConfig = orderConfigDefault;
            groupErrors = this.checkGroupSort(members, orderConfig);
        }
        else if (typeof orderConfigDefault === 'object' && orderConfigDefault !== null) {
            const optionalityOrder = orderConfigDefault.optionalityOrder;
            const memberTypes = orderConfigDefault.memberTypes;
            const order = orderConfigDefault.order;
            if (memberTypes) {
                hasCollect = this.memberTypesChecks(members, orderConfigDefault, alphaErrors, requiredErrors, groupErrors, filePath);
            }
            else {
                if (optionalityOrder) {
                    this.optionalityOrderErrors(members, optionalityOrder, requiredErrors, filePath);
                    return;
                }
                if (order) {
                    this.orderErrors(members, order, alphaErrors);
                }
            }
        }
        if (hasCollect) {
            this.collectErrors([...groupErrors, ...alphaErrors, ...requiredErrors], filePath);
        }
    }
    memberTypesChecks(members, orderConfigDefault, alphaErrors, requiredErrors, groupErrors, filePath) {
        const optionalityOrder = orderConfigDefault.optionalityOrder;
        const memberTypes = orderConfigDefault.memberTypes;
        const order = orderConfigDefault.order;
        if (memberTypes === 'never') {
            this.memberTypesNeverErrors(members, optionalityOrder, order, alphaErrors, requiredErrors);
        }
        else {
            if (Array.isArray(memberTypes)) {
                groupErrors = this.checkGroupSort(members, memberTypes);
                if (order) {
                    this.orderByGroupErrors(members, order, alphaErrors);
                    this.collectErrors([...alphaErrors], filePath);
                }
                if (optionalityOrder) {
                    this.optionalityOrderErrors(members, optionalityOrder, requiredErrors, filePath);
                }
                return false;
            }
            if (optionalityOrder) {
                this.optionalityOrderErrors(members, optionalityOrder, requiredErrors, filePath);
            }
        }
        return true;
    }
    memberTypesNeverErrors(members, optionalityOrder, order, alphaErrors, requiredErrors) {
        if (optionalityOrder) {
            if (optionalityOrder === 'optional-first') {
                requiredErrors = this.checkRequiredOrder(members, true);
            }
            else if (optionalityOrder === 'required-first') {
                requiredErrors = this.checkRequiredOrder(members, false);
            }
        }
        if (order) {
            this.orderErrors(members, order, alphaErrors);
        }
    }
    orderByGroupErrors(members, order, alphaErrors) {
        if (order === 'alphabetically' || order === 'natural') {
            alphaErrors = this.checkAlphaByGroupSort(members, true);
        }
        else if (order === 'alphabetically-case-insensitive' || order === 'natural-case-insensitive') {
            alphaErrors = this.checkAlphaByGroupSort(members, false);
        }
    }
    orderErrors(members, order, alphaErrors) {
        if (order === 'alphabetically' || order === 'natural') {
            alphaErrors = this.checkAlphaSort(members, true);
        }
        else if (order === 'alphabetically-case-insensitive' || order === 'natural-case-insensitive') {
            alphaErrors = this.checkAlphaSort(members, false);
        }
    }
    optionalityOrderErrors(members, optionalityOrder, requiredErrors, filePath) {
        if (optionalityOrder === 'optional-first') {
            requiredErrors = this.checkRequiredOrder(members, true);
        }
        else if (optionalityOrder === 'required-first') {
            requiredErrors = this.checkRequiredOrder(members, false);
        }
        this.collectErrors([...requiredErrors], filePath);
    }
    // 收集错误信息
    collectErrors(results = [], filePath) {
        if (results.length > 0) {
            const uniqueResults = new Set();
            results.forEach((loc) => {
                const errorKey = `${loc.line}-${loc.startCol}-${loc.nameStr}`;
                if (!uniqueResults.has(errorKey)) {
                    uniqueResults.add(errorKey);
                    this.addIssueReport(loc, filePath);
                }
            });
        }
    }
    getLineAndCharacter(node) {
        const { line, character } = this.asRoot.getLineAndCharacterOfPosition(node.getStart());
        return { line: line + 1, character: character + 1 };
    }
    addIssueReport(loc, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (loc.description) {
            this.metaData.description = loc.description;
        }
        let defect = new Defects_1.Defects(loc.line, loc.startCol, loc.startCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.MemberOrderingCheck = MemberOrderingCheck;
