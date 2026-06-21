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
exports.NamingConventionCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const Index_1 = require("../../Index");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, "NamingConventionCheck");
const defaultOptions = [
    {
        selector: 'default',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
    },
    {
        selector: 'import',
        format: ['camelCase', 'PascalCase'],
    },
    {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
    },
    {
        selector: 'typeLike',
        format: ['PascalCase'],
    },
];
class NamingConventionCheck {
    metaData = {
        severity: 2,
        ruleDocPath: "docs/naming-convention.md",
        description: "Enforce naming conventions for everything across a codebase.",
    };
    issues = [];
    defects = [];
    rule;
    currentArkFile = null;
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    selectors = [];
    formats = [];
    ruleConfigs = {
        prefixes: new Set(),
        suffixes: new Set(),
    };
    options;
    methodArr = [];
    defaultArr = [];
    variableArr = [];
    functionArr = [];
    parameterArr = [];
    parameterPropertyArr = [];
    accessorArr = [];
    enumMemberArr = [];
    classArr = [];
    interfaceArr = [];
    typeAliasArr = [];
    enumArr = [];
    typeParameterArr = [];
    memberLikeArr = [];
    typeLikeArr = [];
    variableLikeArr = [];
    classMethodArr = [];
    objectLiteralMethodArr = [];
    typeMethodArr = [];
    classPropertyArr = [];
    objectLiteralPropertyArr = [];
    typePropertyArr = [];
    importArr = [];
    propertyArr = [];
    checkParamMap = new Map();
    selectorProcessors = {
        'variable': this.processVariableSelector.bind(this),
        'function': this.processFunctionSelector.bind(this),
        'class': this.processClassSelector.bind(this),
        'interface': this.processInterfaceSelector.bind(this),
        'enum': this.processEnumSelector.bind(this),
        'parameter': this.processParameterSelector.bind(this),
        'import': this.processImportSelector.bind(this),
        'parameterProperty': this.processParameterPropertySelector.bind(this),
        'accessor': this.processAccessorSelector.bind(this),
        'enumMember': this.processEnumMemberSelector.bind(this),
        'typeAlias': this.processTypeAliasSelector.bind(this),
        'typeParameter': this.processTypeParameterSelector.bind(this),
        'classMethod': this.processClassMethodSelector.bind(this),
        'objectLiteralMethod': this.processObjectLiteralMethodSelector.bind(this),
        'typeMethod': this.processTypeMethodSelector.bind(this),
        'classProperty': this.processClassPropertySelector.bind(this),
        'objectLiteralProperty': this.processObjectLiteralPropertySelector.bind(this),
        'typeProperty': this.processTypePropertySelector.bind(this),
        'memberLike': this.processMemberLikeSelector.bind(this),
        'method': this.processMethodSelector.bind(this),
        'property': this.processPropertySelector.bind(this),
        'typeLike': this.processTypeLikeSelector.bind(this),
        'variableLike': this.processVariableLikeSelector.bind(this),
        'default': this.processDefaultSelector.bind(this)
    };
    constructor(customOption) {
        if (customOption) {
            this.options = customOption;
        }
    }
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [matchFileCb];
    }
    check = (targetField) => {
        this.currentArkFile = targetField;
        const node = lib_1.AstTreeUtils.getSourceFileFromArkFile(targetField);
        this.options = this.rule.option?.length
            ? this.rule.option
            : defaultOptions;
        const defaultItems = this.options.filter((item) => item.selector === 'default');
        const nonDefaultItems = this.options.filter((item) => item.selector !== 'default');
        const result1 = [...nonDefaultItems, ...defaultItems];
        const defaultItems1 = result1.filter((item) => item.modifiers);
        const nonDefaultItems1 = result1.filter((item) => !item.modifiers);
        const result = [...nonDefaultItems1, ...defaultItems1];
        const neededSelectors = new Set();
        result.forEach((option) => {
            if (Array.isArray(option.selector)) {
                option.selector.forEach((selector) => neededSelectors.add(selector));
            }
            else {
                neededSelectors.add(option.selector);
            }
            option.format?.forEach((format) => {
                this.formats.push(format);
            });
            option.prefix?.forEach((p) => this.ruleConfigs.prefixes.add(p));
            option.suffix?.forEach((s) => this.ruleConfigs.suffixes.add(s));
        });
        this.collectNeededNodes(node, neededSelectors);
        result.forEach((option) => {
            if (Array.isArray(option.selector)) {
                option.selector.forEach((selector) => {
                    this.getOptionForSelector(selector, option);
                    this.selectors.push(selector);
                });
            }
            else {
                this.getOptionForSelector(option.selector, option);
                this.selectors.push(option.selector);
            }
        });
    };
    checkSelectors(Selectors, selectors) {
        return selectors.some(selector => Selectors.has(selector));
    }
    collectNeededNodes(node, neededSelectors) {
        const needVariableGroup = this.checkSelectors(neededSelectors, ['variable', 'variableLike', 'default']);
        const needFunctionGroup = this.checkSelectors(neededSelectors, ['function', 'variableLike', 'default']);
        const needParameterGroup = this.checkSelectors(neededSelectors, ['parameter', 'variableLike', 'default']);
        const needTypeGroup = this.checkSelectors(neededSelectors, ['class', 'interface', 'enum', 'typeAlias', 'typeLike', 'default']);
        const needMemberGroup = this.checkSelectors(neededSelectors, ['method', 'property', 'accessor', 'memberLike', 'default']);
        const needImportGroup = this.checkSelectors(neededSelectors, ['import', 'default']);
        const visit = (node) => {
            if (needVariableGroup && lib_1.ts.isVariableDeclaration(node)) {
                this.collectVariableNodes(node);
            }
            if (needFunctionGroup && (lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isFunctionExpression(node))) {
                this.collectFunctionNodes(node);
            }
            if (needParameterGroup && lib_1.ts.isParameter(node)) {
                this.parameterArr.push(node);
                if (lib_1.ts.isParameterPropertyDeclaration(node, node.parent)) {
                    this.parameterPropertyArr.push(node);
                }
                if (needVariableGroup) {
                    this.variableLikeArr.push(node);
                }
            }
            if (needTypeGroup) {
                this.collectTypeNodes(node, neededSelectors);
            }
            if (needMemberGroup) {
                this.collectMemberNodes(node, neededSelectors);
            }
            if (needImportGroup && lib_1.ts.isImportDeclaration(node)) {
                this.importArr.push(node);
            }
            if (neededSelectors.has('default')) {
                this.collectDefaultNodes(node);
            }
            lib_1.ts.forEachChild(node, visit);
        };
        visit(node);
    }
    /**
     * 收集变量相关节点
     */
    collectVariableNodes(node) {
        this.variableArr.push(node);
        this.variableLikeArr.push(node);
        // 处理解构模式
        if (lib_1.ts.isObjectBindingPattern(node.name)) {
            this.collectDestructuringNames(node.name);
        }
        else if (lib_1.ts.isArrayBindingPattern(node.name)) {
            this.collectDestructuringNames(node.name);
        }
    }
    /**
     * 收集函数相关节点
     */
    collectFunctionNodes(node) {
        this.functionArr.push(node);
        if (lib_1.ts.isFunctionDeclaration(node)) {
            this.variableLikeArr.push(node);
        }
    }
    /**
     * 收集类型相关节点
     */
    collectTypeNodes(node, neededSelectors) {
        const needClass = neededSelectors.has('class') || neededSelectors.has('typeLike');
        const needInterface = neededSelectors.has('interface') || neededSelectors.has('typeLike');
        const needEnum = neededSelectors.has('enum') || neededSelectors.has('typeLike');
        const needTypeAlias = neededSelectors.has('typeAlias') || neededSelectors.has('typeLike');
        const needTypeParameter = neededSelectors.has('typeParameter') || neededSelectors.has('typeLike');
        if (needClass && lib_1.ts.isClassDeclaration(node)) {
            this.classArr.push(node);
            if (neededSelectors.has('typeLike')) {
                this.typeLikeArr.push(node);
            }
        }
        if (needInterface && lib_1.ts.isInterfaceDeclaration(node)) {
            this.interfaceArr.push(node);
            if (neededSelectors.has('typeLike')) {
                this.typeLikeArr.push(node);
            }
        }
        if (needEnum && lib_1.ts.isEnumDeclaration(node)) {
            this.enumArr.push(node);
            if (neededSelectors.has('typeLike')) {
                this.typeLikeArr.push(node);
            }
        }
        if (needTypeAlias && lib_1.ts.isTypeAliasDeclaration(node)) {
            this.typeAliasArr.push(node);
            if (neededSelectors.has('typeLike')) {
                this.typeLikeArr.push(node);
            }
        }
        if (needTypeParameter && lib_1.ts.isTypeParameterDeclaration(node)) {
            this.typeParameterArr.push(node);
            if (neededSelectors.has('typeLike')) {
                this.typeLikeArr.push(node);
            }
        }
    }
    /**
     * 收集成员相关节点
     */
    collectMemberNodes(node, neededSelectors) {
        const needMethod = this.checkSelectors(neededSelectors, ['method', 'memberLike', 'classMethod', 'objectLiteralMethod', 'typeMethod']);
        const needProperty = this.checkSelectors(neededSelectors, ['property', 'memberLike', 'classProperty', 'objectLiteralProperty', 'typeProperty']);
        const needAccessor = this.checkSelectors(neededSelectors, ['accessor', 'memberLike']);
        const needEnumMember = this.checkSelectors(neededSelectors, ['enumMember', 'memberLike']);
        if (needMethod && lib_1.ts.isMethodDeclaration(node)) {
            this.methodArr.push(node);
            this.collectMethod(node, neededSelectors);
        }
        if (needProperty) {
            this.collectProperty(node, neededSelectors);
        }
        if (needAccessor && (lib_1.ts.isGetAccessor(node) || lib_1.ts.isSetAccessor(node))) {
            this.accessorArr.push(node);
            if (neededSelectors.has('memberLike')) {
                this.memberLikeArr.push(node);
            }
        }
        if (needEnumMember && lib_1.ts.isEnumMember(node)) {
            this.enumMemberArr.push(node);
            if (neededSelectors.has('memberLike')) {
                this.memberLikeArr.push(node);
            }
        }
        if (needMethod && lib_1.ts.isMethodSignature(node) && neededSelectors.has('typeMethod')) {
            this.typeMethodArr.push(node);
        }
    }
    collectMethod(node, neededSelectors) {
        if (neededSelectors.has('memberLike')) {
            this.memberLikeArr.push(node);
        }
        if (neededSelectors.has('classMethod') && lib_1.ts.isClassDeclaration(node.parent)) {
            this.classMethodArr.push(node);
        }
        if (neededSelectors.has('objectLiteralMethod') && lib_1.ts.isObjectLiteralExpression(node.parent)) {
            this.objectLiteralMethodArr.push(node);
        }
    }
    collectProperty(node, neededSelectors) {
        if (lib_1.ts.isPropertyDeclaration(node)) {
            this.propertyArr.push(node);
            if (neededSelectors.has('memberLike')) {
                this.memberLikeArr.push(node);
            }
            if (neededSelectors.has('classProperty') && lib_1.ts.isClassDeclaration(node.parent)) {
                this.classPropertyArr.push(node);
            }
        }
        if (lib_1.ts.isPropertySignature(node) && neededSelectors.has('typeProperty')) {
            this.typePropertyArr.push(node);
        }
        if (lib_1.ts.isPropertyAssignment(node) &&
            lib_1.ts.isObjectLiteralExpression(node.parent) &&
            neededSelectors.has('objectLiteralProperty')) {
            this.objectLiteralPropertyArr.push(node);
        }
    }
    /**
     * 收集需要进行命名规范检查的默认节点
     * @param node 当前遍历的节点
     */
    collectDefaultNodes(node) {
        // 使用分类处理的方式代替长串的 if-else 链
        this.collectDefaultIdentifiers(node);
        this.collectImportAndFunctionNodes(node);
        this.collectPropertyNodes(node);
        this.collectNonIdentifierNames(node);
        this.collectMiscNodes(node);
    }
    /**
     * 收集标识符节点
     */
    collectDefaultIdentifiers(node) {
        if (lib_1.ts.isIdentifier(node)) {
            this.defaultArr.push(node);
        }
    }
    /**
     * 收集导入和函数表达式节点
     */
    collectImportAndFunctionNodes(node) {
        // 处理默认导入名称，如 import _ from 'lodash-es' 中的 _
        if (lib_1.ts.isImportClause(node) && node.name) {
            this.defaultArr.push(node.name);
        }
        // 处理命名的函数表达式
        else if (lib_1.ts.isFunctionExpression(node) && node.name) {
            this.defaultArr.push(node.name);
        }
    }
    /**
     * 收集属性节点
     */
    collectPropertyNodes(node) {
        // 处理属性赋值中的标识符属性名，如 { AKey: true } 中的 AKey
        if (lib_1.ts.isPropertyAssignment(node) && lib_1.ts.isIdentifier(node.name)) {
            this.defaultArr.push(node.name);
        }
        // 处理简写属性赋值中的标识符属性名，如 { Foo } 中的 Foo
        else if (lib_1.ts.isShorthandPropertyAssignment(node)) {
            this.defaultArr.push(node.name);
        }
        // 处理属性访问表达式中的标识符，如 obj.foo 中的 foo
        else if (lib_1.ts.isPropertyAccessExpression(node) && lib_1.ts.isIdentifier(node.name)) {
            this.defaultArr.push(node.name);
        }
    }
    /**
     * 收集非标识符名称的节点
     */
    collectNonIdentifierNames(node) {
        // 处理属性签名中的字符串字面量名称
        if (lib_1.ts.isPropertySignature(node) && node.name && !lib_1.ts.isIdentifier(node.name)) {
            if (lib_1.ts.isStringLiteral(node.name)) {
                this.defaultArr.push(node.name);
            }
        }
        // 处理方法声明中的非标识符名称
        else if (lib_1.ts.isMethodDeclaration(node) && node.name && !lib_1.ts.isIdentifier(node.name)) {
            if (lib_1.ts.isNumericLiteral(node.name) || lib_1.ts.isStringLiteral(node.name)) {
                this.defaultArr.push(node.name);
            }
        }
        // 处理属性声明中的非标识符名称
        else if (lib_1.ts.isPropertyDeclaration(node) && node.name && !lib_1.ts.isIdentifier(node.name)) {
            if (lib_1.ts.isNumericLiteral(node.name) || lib_1.ts.isStringLiteral(node.name)) {
                this.defaultArr.push(node.name);
            }
        }
        // 处理属性赋值中的非标识符名称
        else if (lib_1.ts.isPropertyAssignment(node) && node.name && !lib_1.ts.isIdentifier(node.name)) {
            if (lib_1.ts.isNumericLiteral(node.name) || lib_1.ts.isStringLiteral(node.name)) {
                this.defaultArr.push(node.name);
            }
        }
    }
    /**
     * 收集其他类型的节点
     */
    collectMiscNodes(node) {
        // 处理计算属性名
        if (lib_1.ts.isComputedPropertyName(node) && node.expression) {
            this.defaultArr.push(node);
        }
    }
    getOptionForSelector(selector, option) {
        const processor = this.selectorProcessors[selector];
        if (processor) {
            processor(option);
        }
        else {
            const exhaustiveCheck = (s) => {
                throw new Error(`Unprocessed selector types: ${s}`);
            };
            exhaustiveCheck(selector);
        }
    }
    processVariableSelector(option) {
        this.variableArr.forEach((node) => {
            this.checkVariable(node, option);
        });
    }
    processFunctionSelector(option) {
        this.functionArr.forEach((node) => {
            this.checkFunction(node, option);
        });
    }
    processClassSelector(option) {
        this.classArr.forEach((node) => {
            this.checkClass(node, option);
        });
    }
    processInterfaceSelector(option) {
        this.interfaceArr.forEach((node) => {
            this.checkInterface(node, option);
        });
    }
    processEnumSelector(option) {
        this.enumArr.forEach((node) => {
            this.checkEnum(node, option);
        });
    }
    processParameterSelector(option) {
        this.parameterArr.forEach((node) => {
            this.checkParameter(node, option);
        });
    }
    processImportSelector(option) {
        this.importArr.forEach((node) => {
            this.processImportNode(node, option);
        });
    }
    /**
     * 处理单个导入节点
     * @param node 导入声明节点
     * @param option 命名选项
     */
    processImportNode(node, option) {
        if (!node.importClause) {
            return; // 没有导入子句，直接返回
        }
        // 处理默认导入
        this.processDefaultImport(node.importClause, option);
        // 处理命名导入
        this.processNamedImports(node.importClause, option);
    }
    /**
     * 处理默认导入
     * @param importClause 导入子句
     * @param option 命名选项
     */
    processDefaultImport(importClause, option) {
        if (importClause.name) {
            this.checkImport(importClause, option);
        }
    }
    /**
     * 处理命名导入
     * @param importClause 导入子句
     * @param option 命名选项
     */
    processNamedImports(importClause, option) {
        const namedBindings = importClause.namedBindings;
        if (!namedBindings || !lib_1.ts.isNamedImports(namedBindings)) {
            return;
        }
        namedBindings.elements.forEach((element) => {
            this.checkImport(element, option);
        });
    }
    checkImport(node, option) {
        if (lib_1.ts.isImportSpecifier(node)) {
            const importName = node.name.text;
            this.checkNaming(node, importName, option, 'Import');
            if (!option.prefix && !option.suffix) {
                const [line, character] = this.getNodePosition(node);
                this.checkParamMap.set(importName, line);
            }
        }
        // 处理默认导入，如 import _ from 'lodash-es'
        else if (lib_1.ts.isImportClause(node) && node.name) {
            const importName = node.name.text;
            this.checkNaming(node.name, importName, option, 'Import');
            if (!option.prefix && !option.suffix) {
                const [line, character] = this.getNodePosition(node.name);
                this.checkParamMap.set(importName, line);
            }
        }
    }
    processParameterPropertySelector(option) {
        this.parameterPropertyArr.forEach((node) => {
            this.checkParameterProperty(node, option);
        });
    }
    processAccessorSelector(option) {
        this.accessorArr.forEach((node) => {
            this.checkAccessor(node, option);
        });
    }
    processEnumMemberSelector(option) {
        this.enumMemberArr.forEach((node) => {
            this.checkEnumMember(node, option);
        });
    }
    processTypeAliasSelector(option) {
        this.typeAliasArr.forEach((node) => {
            this.checkTypeAlias(node, option);
        });
    }
    processTypeParameterSelector(option) {
        this.typeParameterArr.forEach((node) => {
            this.checkTypeParameter(node, option);
        });
    }
    processClassMethodSelector(option) {
        this.classMethodArr.forEach((node) => {
            this.checkClassMethod(node, option);
        });
    }
    processObjectLiteralMethodSelector(option) {
        this.objectLiteralMethodArr.forEach((node) => {
            this.checkObjectLiteralMethod(node, option);
        });
    }
    processTypeMethodSelector(option) {
        this.typeMethodArr.forEach((node) => {
            this.checkTypeMethod(node, option);
        });
    }
    processClassPropertySelector(option) {
        this.classPropertyArr.forEach((node) => {
            this.checkClassProperty(node, option);
        });
    }
    processObjectLiteralPropertySelector(option) {
        this.objectLiteralPropertyArr.forEach((node) => {
            this.checkObjectLiteralProperty(node, option);
        });
    }
    processTypePropertySelector(option) {
        this.typePropertyArr.forEach((node) => {
            this.checkTypeProperty(node, option);
        });
    }
    processMemberLikeSelector(option) {
        this.memberLikeArr.forEach((node) => {
            this.checkMemberLike(node, option);
        });
    }
    processMethodSelector(option) {
        this.methodArr.forEach((node) => {
            this.checkMethod(node, option);
        });
    }
    processPropertySelector(option) {
        this.propertyArr.forEach((node) => {
            this.checkProperty(node, option);
        });
    }
    processTypeLikeSelector(option) {
        this.typeLikeArr.forEach((node) => {
            this.checkTypeLike(node, option);
        });
    }
    processVariableLikeSelector(option) {
        this.variableLikeArr.forEach((node) => {
            this.checkVariableLike(node, option);
        });
    }
    processDefaultSelector(option) {
        this.defaultArr.forEach((node) => {
            this.checkDefault(node, option);
        });
    }
    checkDefault(node, option) {
        let name;
        // 根据节点类型提取名称
        if (lib_1.ts.isIdentifier(node)) {
            name = node.text;
        }
        else if (lib_1.ts.isNumericLiteral(node)) {
            name = node.text;
        }
        else if (lib_1.ts.isStringLiteral(node)) {
            name = node.text;
        }
        else {
            // 其他类型的节点
            name = node.getText();
        }
        let kind = this.getIdentifierKind(node);
        if (kind) {
            this.checkNaming(node, name, option, kind);
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(name, line);
        }
    }
    getIdentifierKind(node) {
        if (!node.parent) {
            return 'Default';
        }
        // 首先检查字面量类型 (数字、字符串等)
        if (lib_1.ts.isNumericLiteral(node) || lib_1.ts.isStringLiteral(node)) {
            return this.getLiteralNodeKind(node, node.parent);
        }
        // 只有标识符才进行下一步分析
        if (!lib_1.ts.isIdentifier(node)) {
            return undefined;
        }
        // 检查是否应该跳过此节点
        if (this.shouldSkipNode(node, node.parent)) {
            return undefined;
        }
        // 按照节点类型分类处理
        return this.getIdentifierNodeKind(node, node.parent);
    }
    /**
     * 处理字面量节点类型
     */
    getLiteralNodeKind(node, parent) {
        if (lib_1.ts.isMethodDeclaration(parent)) {
            return 'Class Method';
        }
        if (lib_1.ts.isPropertyDeclaration(parent)) {
            return 'Class Property';
        }
        if (lib_1.ts.isPropertyAssignment(parent)) {
            return 'Object Literal Property';
        }
        if (lib_1.ts.isPropertySignature(parent)) {
            return 'Type Property';
        }
        return undefined;
    }
    /**
     * 处理标识符节点类型
     */
    getIdentifierNodeKind(node, parent) {
        // 处理对象属性和解构赋值
        const propertyKind = this.getPropertyKindIfApplicable(node, parent);
        if (propertyKind) {
            return propertyKind;
        }
        // 处理函数相关
        const functionKind = this.getFunctionKindIfApplicable(node, parent);
        if (functionKind) {
            return functionKind;
        }
        // 处理类型相关声明
        const typeKind = this.getTypeKindIfApplicable(node, parent);
        if (typeKind) {
            return typeKind;
        }
        // 处理类成员
        const memberKind = this.getClassMemberKindIfApplicable(node, parent);
        if (memberKind) {
            return memberKind;
        }
        // 处理变量和参数
        const variableKind = this.getVariableKindIfApplicable(node, parent);
        if (variableKind) {
            return variableKind;
        }
        return undefined;
    }
    /**
     * 获取属性相关的类型
     */
    getPropertyKindIfApplicable(node, parent) {
        // 处理对象字面量中的属性名
        if (lib_1.ts.isPropertyAssignment(parent) && parent.name === node) {
            return 'Object Literal Property';
        }
        // 处理简写属性赋值
        if (lib_1.ts.isShorthandPropertyAssignment(parent) && parent.name === node) {
            return 'Object Literal Property';
        }
        // 处理属性签名
        if (lib_1.ts.isPropertySignature(parent)) {
            return 'Type Property';
        }
        return undefined;
    }
    /**
     * 获取函数相关的类型
     */
    getFunctionKindIfApplicable(node, parent) {
        // 处理函数表达式的名称
        if (lib_1.ts.isFunctionExpression(parent) && parent.name === node) {
            return 'Function';
        }
        // 处理函数声明
        if (lib_1.ts.isFunctionDeclaration(parent)) {
            return 'Function';
        }
        // 处理方法声明
        if (lib_1.ts.isMethodDeclaration(parent)) {
            return 'Class Method';
        }
        // 处理方法签名
        if (lib_1.ts.isMethodSignature(parent)) {
            return 'Type Method';
        }
        return undefined;
    }
    /**
     * 获取类型相关的声明
     */
    getTypeKindIfApplicable(node, parent) {
        if (this.options === defaultOptions) {
            return undefined;
        }
        // 处理类声明
        if (lib_1.ts.isClassDeclaration(parent)) {
            return 'Class';
        }
        // 处理接口声明
        if (lib_1.ts.isInterfaceDeclaration(parent)) {
            return 'Interface';
        }
        // 处理类型别名
        if (lib_1.ts.isTypeAliasDeclaration(parent)) {
            return 'Type Alias';
        }
        // 处理枚举声明
        if (lib_1.ts.isEnumDeclaration(parent)) {
            return 'Enum';
        }
        // 处理类型参数
        if (lib_1.ts.isTypeParameterDeclaration(parent)) {
            return 'Type Parameter';
        }
        return undefined;
    }
    /**
     * 获取类成员相关的类型
     */
    getClassMemberKindIfApplicable(node, parent) {
        // 处理枚举成员
        if (lib_1.ts.isEnumMember(parent)) {
            return 'Enum Member';
        }
        // 处理属性声明
        if (lib_1.ts.isPropertyDeclaration(parent)) {
            return 'Class Property';
        }
        // 处理访问器
        if (lib_1.ts.isGetAccessor(parent)) {
            return 'Getter';
        }
        if (lib_1.ts.isSetAccessor(parent)) {
            return 'Setter';
        }
        return undefined;
    }
    /**
     * 获取变量和参数相关的类型
     */
    getVariableKindIfApplicable(node, parent) {
        // 处理变量声明
        if (lib_1.ts.isVariableDeclaration(parent) && this.options !== defaultOptions) {
            return 'Variable';
        }
        // 处理参数
        if (lib_1.ts.isParameter(parent) && !lib_1.ts.isIndexSignatureDeclaration(node.parent)) {
            if (lib_1.ts.isMethodDeclaration(parent.parent)) {
                return 'Method Parameter';
            }
            return 'Parameter';
        }
        // 处理解构赋值中的变量
        if (lib_1.ts.isBindingElement(parent) && parent.name === node) {
            return 'Variable';
        }
        // 处理导入
        if ((lib_1.ts.isImportSpecifier(parent) || lib_1.ts.isImportClause(parent)) && this.options !== defaultOptions) {
            return 'Import';
        }
        // 处理默认导入名称
        if (lib_1.ts.isImportClause(parent) && parent.name === node && this.options !== defaultOptions) {
            return 'Import';
        }
        return undefined;
    }
    shouldSkipNode(node, parent) {
        if (lib_1.ts.isParameter(parent) && lib_1.ts.isIdentifier(parent.name) && parent.name.text === '_') {
            return true;
        }
        if (lib_1.ts.isParameter(parent) && this.isInGlobalTypeDeclaration(parent)) {
            return true;
        }
        if (lib_1.ts.isParameter(parent) && parent.parent && lib_1.ts.isIndexSignatureDeclaration(parent.parent)) {
            return true;
        }
        if (lib_1.ts.isEnumMember(parent) && parent.initializer && node !== parent.name) {
            return true;
        }
        if (lib_1.ts.isPropertyDeclaration(parent) && parent.initializer && node !== parent.name) {
            return true;
        }
        if (lib_1.ts.isVariableDeclaration(parent) && parent.initializer && node !== parent.name) {
            return true;
        }
        return false;
    }
    checkVariable(node, option) {
        // 处理普通变量声明
        if (lib_1.ts.isIdentifier(node.name)) {
            this.checkNaming(node, node.name.text, option, 'Variable');
            if (!option.prefix && !option.suffix) {
                const [line, character] = this.getNodePosition(node);
                this.checkParamMap.set(node.name.text, line);
            }
        }
        // 处理对象解构模式
        else if (lib_1.ts.isObjectBindingPattern(node.name)) {
            this.checkObjectBindingPattern(node.name, option);
        }
        // 处理数组解构模式
        else if (lib_1.ts.isArrayBindingPattern(node.name)) {
            this.checkArrayBindingPattern(node.name, option);
        }
    }
    /**
     * 检查对象解构模式中的变量命名
     * @param pattern 对象解构模式
     * @param option 命名选项
     */
    checkObjectBindingPattern(pattern, option) {
        if (!pattern || !pattern.elements) {
            return;
        }
        pattern.elements.forEach(element => this.processBindingElement(element, option));
    }
    /**
     * 处理单个解构绑定元素
     * @param element 绑定元素
     * @param option 命名选项
     */
    processBindingElement(element, option) {
        if (!lib_1.ts.isBindingElement(element)) {
            return;
        }
        // 处理标识符名称
        if (lib_1.ts.isIdentifier(element.name)) {
            this.processIdentifierBinding(element, option);
            return;
        }
        // 处理嵌套对象解构
        if (lib_1.ts.isObjectBindingPattern(element.name)) {
            this.checkObjectBindingPattern(element.name, option);
            return;
        }
        // 处理嵌套数组解构
        if (lib_1.ts.isArrayBindingPattern(element.name)) {
            this.checkArrayBindingPattern(element.name, option);
        }
    }
    /**
     * 处理解构绑定中的标识符
     * @param element 包含标识符的绑定元素
     * @param option 命名选项
     */
    processIdentifierBinding(element, option) {
        if (!lib_1.ts.isIdentifier(element.name)) {
            return;
        }
        const identifierName = element.name.text;
        const nodeToCheck = element.propertyName ? element : element.name;
        // 检查变量名称是否符合命名规范
        this.checkNaming(nodeToCheck, identifierName, option, 'Variable');
        // 记录已检查的变量位置，避免重复检查
        const [line] = this.getNodePosition(nodeToCheck);
        this.checkParamMap.set(identifierName, line);
    }
    /**
     * 检查数组解构模式中的变量命名
     * @param pattern 数组解构模式
     * @param option 命名选项
     */
    checkArrayBindingPattern(pattern, option) {
        if (!pattern || !pattern.elements) {
            return;
        }
        pattern.elements.forEach(element => {
            // 跳过省略的表达式（如 [a,,c] 中的空位）
            if (lib_1.ts.isBindingElement(element)) {
                this.processBindingElement(element, option);
            }
        });
    }
    checkFunction(node, option) {
        if (node.name && lib_1.ts.isIdentifier(node.name)) {
            this.checkNaming(node, node.name.text, option, 'Function');
            if (!option.prefix && !option.suffix) {
                const [line, character] = this.getNodePosition(node);
                this.checkParamMap.set(node.name.text, line);
            }
        }
    }
    checkParameter(node, option) {
        this.checkNaming(node, node.getText(), option, 'Parameter');
        const [line, character] = this.getNodePosition(node);
        this.checkParamMap.set(node.getText(), line);
    }
    checkProperty(node, option) {
        const kind = this.getPropertyKind(node);
        if (lib_1.ts.isPropertyDeclaration(node)) {
            this.checkNaming(node, node.name.getText(), option, kind);
            this.propertyArr.push(node);
        }
        const name = lib_1.ts.isIdentifier(node) ? node.text : node.getText();
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(name, line);
        }
    }
    getPropertyKind(node) {
        if (lib_1.ts.isPropertyDeclaration(node) && lib_1.ts.isClassDeclaration(node.parent)) {
            return 'Class Property';
        }
        if (lib_1.ts.isPropertyAssignment(node) && lib_1.ts.isObjectLiteralExpression(node.parent)) {
            return 'Object Literal Property';
        }
        if (lib_1.ts.isPropertySignature(node)) {
            return 'Type Property';
        }
        return 'Property';
    }
    checkParameterProperty(node, option) {
        this.checkNaming(node, node.getText(), option, 'ParameterProperty');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkMethod(node, option) {
        if (lib_1.ts.isIdentifier(node.name)) {
            const kind = this.getMethodKind(node);
            this.checkNaming(node, node.name.text, option, kind);
            if (!option.prefix && !option.suffix) {
                const [line, character] = this.getNodePosition(node);
                this.checkParamMap.set(node.name.text, line);
            }
        }
    }
    getMethodKind(node) {
        if (lib_1.ts.isClassDeclaration(node.parent)) {
            return 'Class Method';
        }
        if (lib_1.ts.isObjectLiteralExpression(node.parent)) {
            return 'Object Literal Method';
        }
        if (lib_1.ts.isInterfaceDeclaration(node.parent) || lib_1.ts.isTypeLiteralNode(node.parent)) {
            return 'Type Method';
        }
        return 'Method';
    }
    checkAccessor(node, option) {
        this.checkNaming(node, node.getText(), option, 'Accessor');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkEnumMember(node, option) {
        this.checkNaming(node, node.getText(), option, 'EnumMember');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkClass(node, option) {
        if (node.name) {
            this.checkNaming(node, node.name.text, option, 'Class');
            if (!option.prefix && !option.suffix) {
                const [line, character] = this.getNodePosition(node);
                this.checkParamMap.set(node.name.text, line);
            }
        }
    }
    checkInterface(node, option) {
        this.checkNaming(node, node.getText(), option, 'Interface');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkTypeAlias(node, option) {
        this.checkNaming(node, node.getText(), option, 'TypeAlias');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkEnum(node, option) {
        this.checkNaming(node, node.getText(), option, 'Enum');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkTypeParameter(node, option) {
        this.checkNaming(node, node.getText(), option, 'TypeParameter');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkMemberLike(node, option) {
        let kind = this.getMemberLikeKind(node);
        let name = this.getMemberName(node);
        if (name) {
            this.checkNaming(node, name, option, kind);
            if (!option.prefix && !option.suffix) {
                const [line, character] = this.getNodePosition(node);
                this.checkParamMap.set(name, line);
            }
        }
    }
    getMemberLikeKind(node) {
        if (lib_1.ts.isGetAccessor(node)) {
            return 'Accessor';
        }
        if (lib_1.ts.isSetAccessor(node)) {
            return 'Accessor';
        }
        if (lib_1.ts.isEnumMember(node)) {
            return 'Enum Member';
        }
        if (lib_1.ts.isMethodDeclaration(node)) {
            if (lib_1.ts.isClassDeclaration(node.parent)) {
                return 'Class Method';
            }
            if (lib_1.ts.isObjectLiteralExpression(node.parent)) {
                return 'Object Literal Method';
            }
            return 'Method';
        }
        if (lib_1.ts.isParameter(node) && node.parent && lib_1.ts.isConstructorDeclaration(node.parent)) {
            return 'Parameter Property';
        }
        if (lib_1.ts.isPropertyDeclaration(node)) {
            if (lib_1.ts.isClassDeclaration(node.parent)) {
                return 'Class Property';
            }
            return 'Property';
        }
        if (lib_1.ts.isPropertyAssignment(node)) {
            return 'Object Literal Property';
        }
        if (lib_1.ts.isPropertySignature(node)) {
            return 'Type Property';
        }
        return 'MemberLike';
    }
    getMemberName(node) {
        if (lib_1.ts.isIdentifier(node)) {
            return node.text;
        }
        if ('name' in node) {
            const name = node.name;
            if (lib_1.ts.isIdentifier(name)) {
                return name.text;
            }
            if (lib_1.ts.isPrivateIdentifier(name)) {
                return name.text;
            }
        }
        return node.getText();
    }
    checkTypeLike(node, option) {
        const kind = this.getTypeLikeKind(node);
        let name = this.getTypeLikeName(node);
        if (name) {
            this.checkNaming(node, name, option, kind);
            if (!option.prefix && !option.suffix) {
                const [line, character] = this.getNodePosition(node);
                this.checkParamMap.set(name, line);
            }
        }
    }
    getTypeLikeKind(node) {
        if (lib_1.ts.isClassDeclaration(node)) {
            return 'Class';
        }
        if (lib_1.ts.isEnumDeclaration(node)) {
            return 'Enum';
        }
        if (lib_1.ts.isInterfaceDeclaration(node)) {
            return 'Interface';
        }
        if (lib_1.ts.isTypeAliasDeclaration(node)) {
            return 'Type Alias';
        }
        if (lib_1.ts.isTypeParameterDeclaration(node)) {
            return 'Type Parameter';
        }
        return 'TypeLike';
    }
    getTypeLikeName(node) {
        if (lib_1.ts.isClassDeclaration(node) ||
            lib_1.ts.isInterfaceDeclaration(node) ||
            lib_1.ts.isTypeAliasDeclaration(node) ||
            lib_1.ts.isEnumDeclaration(node)) {
            return node.name?.text;
        }
        if (lib_1.ts.isTypeParameterDeclaration(node)) {
            return node.name.text;
        }
        return node.getText();
    }
    checkVariableLike(node, option) {
        const kind = this.getVariableLikeKind(node);
        const name = lib_1.ts.isIdentifier(node) ? node.text : node.getText();
        this.checkNaming(node, name, option, kind);
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(name, line);
        }
    }
    getVariableLikeKind(node) {
        if (lib_1.ts.isFunctionDeclaration(node)) {
            return 'Function';
        }
        if (lib_1.ts.isParameter(node)) {
            if (lib_1.ts.isMethodDeclaration(node.parent)) {
                return 'Method Parameter';
            }
            if (lib_1.ts.isFunctionDeclaration(node.parent)) {
                return 'Function Parameter';
            }
            return 'Parameter';
        }
        if (lib_1.ts.isVariableDeclaration(node)) {
            return 'Variable';
        }
        return 'VariableLike';
    }
    checkClassMethod(node, option) {
        this.checkNaming(node, node.getText(), option, 'ClassMethod');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkObjectLiteralMethod(node, option) {
        this.checkNaming(node, node.getText(), option, 'ObjectLiteralMethod');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkTypeMethod(node, option) {
        this.checkNaming(node, node.getText(), option, 'TypeMethod');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkClassProperty(node, option) {
        this.checkNaming(node, node.getText(), option, 'ClassProperty');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkObjectLiteralProperty(node, option) {
        this.checkNaming(node, node.getText(), option, 'ObjectLiteralProperty');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), line);
        }
    }
    checkTypeProperty(node, option) {
        this.checkNaming(node, node.name.getText(), option, 'TypeProperty');
        if (!option.prefix && !option.suffix) {
            const [line, character] = this.getNodePosition(node);
            this.checkParamMap.set(node.name.getText(), line);
        }
    }
    checkModifiers(node, option) {
        if (!option.modifiers || option.modifiers.length === 0) {
            return true;
        }
        const nodeModifiers = lib_1.ts.canHaveModifiers(node)
            ? lib_1.ts.getModifiers(node)
            : undefined;
        const modifierKinds = new Set(nodeModifiers?.map((modifier) => modifier.kind));
        return option.modifiers.every((modifier) => this.checkSingleModifier(node, modifier, modifierKinds));
    }
    checkSingleModifier(node, modifier, modifierKinds) {
        switch (modifier) {
            case 'abstract':
            case 'async':
            case 'exported':
            case 'private':
            case 'protected':
            case 'readonly':
            case 'static':
                return this.checkSimpleModifier(modifier, modifierKinds);
            case 'const':
                return this.checkConstModifier(node);
            case 'global':
                return this.checkGlobalModifier(node);
            case '#private':
                return this.checkPrivateIdentifier(node);
            case 'public':
                return this.checkPublicModifier(modifierKinds);
            case 'unused':
                return this.checkUnusedModifier(node);
            default:
                return true;
        }
    }
    checkSimpleModifier(modifier, modifierKinds) {
        const modifierMap = {
            'abstract': lib_1.ts.SyntaxKind.AbstractKeyword,
            'async': lib_1.ts.SyntaxKind.AsyncKeyword,
            'exported': lib_1.ts.SyntaxKind.ExportKeyword,
            'private': lib_1.ts.SyntaxKind.PrivateKeyword,
            'protected': lib_1.ts.SyntaxKind.ProtectedKeyword,
            'readonly': lib_1.ts.SyntaxKind.ReadonlyKeyword,
            'static': lib_1.ts.SyntaxKind.StaticKeyword
        };
        const syntaxKind = modifierMap[modifier];
        return syntaxKind ? modifierKinds.has(syntaxKind) : false;
    }
    checkConstModifier(node) {
        return lib_1.ts.isVariableDeclaration(node) &&
            node.parent &&
            lib_1.ts.isVariableDeclarationList(node.parent) &&
            !!(node.parent.flags & lib_1.ts.NodeFlags.Const);
    }
    checkGlobalModifier(node) {
        return !node.parent || lib_1.ts.isSourceFile(node.parent);
    }
    checkPrivateIdentifier(node) {
        return lib_1.ts.isPrivateIdentifier(node);
    }
    checkPublicModifier(modifierKinds) {
        return modifierKinds.has(lib_1.ts.SyntaxKind.PublicKeyword) ||
            !(modifierKinds.has(lib_1.ts.SyntaxKind.PrivateKeyword) ||
                modifierKinds.has(lib_1.ts.SyntaxKind.ProtectedKeyword));
    }
    checkUnusedModifier(node) {
        if (lib_1.ts.isParameter(node) || lib_1.ts.isVariableDeclaration(node)) {
            return !this.findNodeReferences(node, node.parent);
        }
        return true;
    }
    checkTypes(node, option) {
        if (!option.types || option.types.length === 0) {
            return true;
        }
        const nodeType = this.getNodeType(node);
        if (!nodeType)
            return false;
        return option.types.some((typeOption) => {
            switch (typeOption) {
                case 'array':
                    return this.isArrayType(node);
                case 'boolean':
                    return this.isBooleanType(node);
                case 'function':
                    return this.isFunctionType(node);
                case 'number':
                    return this.isNumberType(node);
                case 'string':
                    return this.isStringType(node);
                default:
                    return false;
            }
        });
    }
    findNodeReferences(node, scope) {
        let found = false;
        function visit(n) {
            if (found) {
                return;
            }
            if (lib_1.ts.isIdentifier(n) && n !== node && n.text === node.name?.text) {
                found = true;
                return;
            }
            lib_1.ts.forEachChild(n, visit);
        }
        lib_1.ts.forEachChild(scope, visit);
        return found;
    }
    getNodeType(node) {
        if (lib_1.ts.isVariableDeclaration(node) && node.type) {
            return node.type.getText();
        }
        if (lib_1.ts.isParameter(node) && node.type) {
            return node.type.getText();
        }
        if (lib_1.ts.isPropertyDeclaration(node) && node.type) {
            return node.type.getText();
        }
        return undefined;
    }
    isArrayType(node) {
        const type = this.getNodeType(node);
        return type ? /Array<.*>|.*\[\]/.test(type) : false;
    }
    isBooleanType(node) {
        const type = this.getNodeType(node);
        return type === 'boolean';
    }
    isFunctionType(node) {
        if (lib_1.ts.isFunctionDeclaration(node) || lib_1.ts.isMethodDeclaration(node) ||
            lib_1.ts.isArrowFunction(node) || lib_1.ts.isFunctionExpression(node)) {
            return true;
        }
        const type = this.getNodeType(node);
        return type ? /\=\>/.test(type) || type.startsWith('Function') : false;
    }
    isNumberType(node) {
        const type = this.getNodeType(node);
        return type === 'number';
    }
    isStringType(node) {
        const type = this.getNodeType(node);
        return type === 'string';
    }
    checkNaming(node, name, config, kind) {
        const identifier = name.split(':')[0].trim();
        name = identifier;
        const line = this.getNodePosition(node)[0];
        const character = node.getText();
        const violations = [];
        const isCopy = this.selectors.some((item, index) => this.selectors.indexOf(item) !== index);
        if (this.isAlreadyChecked(character, line)) {
            return;
        }
        this.runNamingChecks(node, name, config, kind, isCopy, character, line, violations);
        if (violations.length > 0) {
            this.handleViolations(node, violations);
        }
    }
    runNamingChecks(node, name, config, kind, isCopy, character, line, violations) {
        const checks = [
            {
                condition: () => config.types && config.types.length > 0,
                check: () => this.checkTypesCondition(node, config)
            },
            {
                condition: () => config.modifiers && config.modifiers.length > 0,
                check: () => this.checkModifiersCondition(node, config)
            },
            {
                condition: () => !!config.custom, check: () => this.checkCustomRegex(name, config, kind, violations)
            },
            {
                condition: () => !!config.filter, check: () => this.checkFilter(name, config, kind, violations)
            },
            {
                condition: () => !!config.leadingUnderscore,
                check: () => this.checkLeadingUnderscore(name, config, kind, violations)
            },
            {
                condition: () => !!config.trailingUnderscore,
                check: () => this.checkTrailingUnderscore(name, config, kind, violations)
            },
            {
                condition: () => !!config.prefix?.length,
                check: () => this.checkPrefix(node, name, config, kind, isCopy, character, line, violations)
            },
            {
                condition: () => !!config.suffix?.length,
                check: () => this.checkSuffix(node, name, config, kind, isCopy, character, line, violations)
            },
            {
                condition: () => !!config.format?.length,
                check: () => {
                    this.checkFormat(name, config, kind, isCopy, violations);
                    return false;
                }
            }
        ];
        for (const { condition, check } of checks) {
            if (condition() && check()) {
                break;
            }
        }
    }
    isAlreadyChecked(character, line) {
        let isChecked = false;
        this.checkParamMap.forEach((value, key) => {
            if (key === character && value === line) {
                isChecked = true;
            }
        });
        return isChecked;
    }
    checkTypesCondition(node, config) {
        return !this.checkTypes(node, config);
    }
    checkModifiersCondition(node, config) {
        return !this.checkModifiers(node, config);
    }
    checkCustomRegex(name, config, kind, violations) {
        try {
            if (!config.custom) {
                return false;
            }
            const customRegex = new RegExp(config.custom.regex);
            const matchesCustom = customRegex.test(name);
            if (config.custom.match) {
                if (!matchesCustom) {
                    violations.push(`${kind} name '${name}' Must match custom pattern: ${config.custom.regex}`);
                    return true;
                }
            }
            else {
                if (matchesCustom) {
                    violations.push(`${kind} name '${name}' Must not match custom pattern: ${config.custom.regex}`);
                    return true;
                }
            }
            return false;
        }
        catch (e) {
            violations.push(`${kind} name '${name}' Invalid custom regex pattern: ${config.custom?.regex || 'unknown'}`);
            return true;
        }
    }
    checkFilter(name, config, kind, violations) {
        try {
            if (!config.filter) {
                return false;
            }
            let filterMatch = true;
            if (typeof config.filter === 'string') {
                const filterRegex = new RegExp(config.filter);
                filterMatch = filterRegex.test(name);
                return filterMatch;
            }
            else {
                let isNeedMatch = config.filter.match;
                const filterRegex = new RegExp(config.filter.regex);
                filterMatch = filterRegex.test(name);
                if (isNeedMatch) {
                    return !filterMatch;
                }
                else {
                    return filterMatch;
                }
            }
        }
        catch (e) {
            violations.push(`${kind} name '${name}' Invalid filter regex pattern`);
            return true;
        }
    }
    checkLeadingUnderscore(name, config, kind, violations) {
        if (!config.leadingUnderscore) {
            return false;
        }
        const hasLeadingUnderscore = /^_/.test(name);
        const hasDoubleLeadingUnderscore = /^__/.test(name);
        switch (config.leadingUnderscore) {
            case 'forbid':
                if (hasLeadingUnderscore) {
                    violations.push(`${kind} name '${name}' Leading underscore is forbidden`);
                    return true;
                }
                break;
            case 'require':
                if (!hasLeadingUnderscore || hasDoubleLeadingUnderscore) {
                    violations.push(`${kind} name '${name}' Single leading underscore is required`);
                    return true;
                }
                break;
            case 'requireDouble':
                if (!hasDoubleLeadingUnderscore) {
                    violations.push(`${kind} name '${name}' Double leading underscore is required`);
                    return true;
                }
                break;
            case 'allowDouble':
                if (hasLeadingUnderscore && !hasDoubleLeadingUnderscore) {
                    violations.push(`${kind} name '${name}' Only double leading underscore is allowed`);
                    return true;
                }
                break;
        }
        return false;
    }
    checkTrailingUnderscore(name, config, kind, violations) {
        if (!config.trailingUnderscore) {
            return false;
        }
        const hasTrailingUnderscore = /_$/.test(name);
        const hasDoubleTrailingUnderscore = /__$/.test(name);
        switch (config.trailingUnderscore) {
            case 'forbid':
                if (hasTrailingUnderscore) {
                    violations.push(`${kind} name '${name}' Trailing underscore is forbidden`);
                    return true;
                }
                break;
            case 'require':
                if (!hasTrailingUnderscore || hasDoubleTrailingUnderscore) {
                    violations.push(`${kind} name '${name}' Single trailing underscore is required`);
                    return true;
                }
                break;
            case 'requireDouble':
                if (!hasDoubleTrailingUnderscore) {
                    violations.push(`${kind} name '${name}' Double trailing underscore is required`);
                    return true;
                }
                break;
            case 'allowDouble':
                if (hasTrailingUnderscore && !hasDoubleTrailingUnderscore) {
                    violations.push(`${kind} name '${name}' Only double trailing underscore is allowed`);
                    return true;
                }
                break;
        }
        return false;
    }
    checkPrefix(node, name, config, kind, isCopy, character, line, violations) {
        if (!config.prefix?.length) {
            return false;
        }
        const prefixArr = config.prefix;
        let isChecked = this.isAlreadyChecked(character, line);
        if (isChecked) {
            return true;
        }
        if (!node.flags) {
            return false;
        }
        const valueName = name;
        let hasPrefix = false;
        if (isCopy) {
            this.ruleConfigs.prefixes.forEach((prefix) => {
                if (valueName.startsWith(prefix)) {
                    hasPrefix = true;
                }
            });
            prefixArr.forEach((prefix) => {
                if (valueName.startsWith(prefix)) {
                    hasPrefix = true;
                }
            });
        }
        else {
            prefixArr.forEach((prefix) => {
                if (valueName.startsWith(prefix)) {
                    hasPrefix = true;
                }
            });
        }
        if (!hasPrefix) {
            violations.push(`${kind} name '${name}' '${config.prefix}' Must start with one of: ${prefixArr.join(', ')}`);
            this.checkParamMap.set(node.getText(), line);
            return true;
        }
        if (config.types && hasPrefix) {
            const [newLine, newCharacter] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), newLine);
        }
        return false;
    }
    checkSuffix(node, name, config, kind, isCopy, character, line, violations) {
        if (!config.suffix?.length) {
            return false;
        }
        const suffixArr = config.suffix;
        let isChecked = this.isAlreadyChecked(character, line);
        if (isChecked) {
            return true;
        }
        if (!node.flags) {
            return false;
        }
        const valueName = name;
        let hasSuffix = false;
        if (isCopy) {
            this.ruleConfigs.suffixes.forEach((suffix) => {
                if (valueName.endsWith(suffix)) {
                    hasSuffix = true;
                }
            });
            suffixArr.forEach((suffix) => {
                if (valueName.endsWith(suffix)) {
                    hasSuffix = true;
                }
            });
        }
        else {
            suffixArr.forEach((suffix) => {
                if (valueName.endsWith(suffix)) {
                    hasSuffix = true;
                }
            });
        }
        if (!hasSuffix) {
            violations.push(`${kind} name '${name}' Must end with one of: ${suffixArr.join(', ')}`);
            this.checkParamMap.set(node.getText(), line);
            return true;
        }
        if (config.types && hasSuffix) {
            const [newLine, newCharacter] = this.getNodePosition(node);
            this.checkParamMap.set(node.getText(), newLine);
        }
        return false;
    }
    checkFormat(name, config, kind, isCopy, violations) {
        if (!config.format?.length) {
            return;
        }
        let nameWithoutAffixes = name.replace(/^_+|_+$/g, '');
        if (config.prefix && config.prefix.length > 0) {
            const prefixesArr = [...this.ruleConfigs.prefixes, ...config.prefix];
            for (const prefix of prefixesArr) {
                if (nameWithoutAffixes.startsWith(prefix)) {
                    nameWithoutAffixes = nameWithoutAffixes.slice(prefix.length);
                    break;
                }
            }
        }
        if (config.suffix && config.suffix.length > 0) {
            for (const suffix of this.ruleConfigs.suffixes) {
                if (nameWithoutAffixes.endsWith(suffix)) {
                    nameWithoutAffixes = nameWithoutAffixes.slice(0, -suffix.length);
                    break;
                }
            }
        }
        const formatRegex = {
            camelCase: /^[a-z][a-zA-Z0-9]*$/,
            strictCamelCase: /^[a-z](?:(?:[a-z0-9]*?[A-Z](?<![A-Z]))?[a-z0-9]*)*$/,
            PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
            StrictPascalCase: /^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/,
            snake_case: /^[a-z]+(_[a-z0-9]+)*$/,
            UPPER_CASE: /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/,
        };
        let formatMatches = false;
        if (isCopy) {
            const formats = [...config.format, ...this.formats];
            if (formats.length > this.formats.length) {
                formatMatches = formats.some((format) => formatRegex[format].test(nameWithoutAffixes));
            }
        }
        else {
            formatMatches = config.format.some((format) => formatRegex[format].test(nameWithoutAffixes));
        }
        if (!formatMatches) {
            this.addFormatViolation(violations, kind, name, nameWithoutAffixes, config);
        }
    }
    addFormatViolation(violations, kind, name, nameWithoutAffixes, config) {
        const formats = config.format?.join(', ') || [];
        if (/__$/.test(name)) {
            violations.push(`${kind} name ${'`'}${name}${'`'} trimmed as ${'`_'}${nameWithoutAffixes}${'_`'} must match one of the following formats: ${formats}`);
        }
        else {
            violations.push(`${kind} name ${'`'}${name}${'`'} must match one of the following formats: ${formats}`);
        }
    }
    handleViolations(node, violations) {
        const position = this.getNodePosition(node);
        const line = position[0];
        const column = position[1];
        const endColumn = node.getEnd();
        violations.forEach((violation) => {
            const description = `${violation}`;
            const severity = this.rule.alert ?? this.metaData.severity;
            const fileName = this.currentArkFile?.getFilePath() ?? '';
            const defect = new Defects_1.Defects(line, column, endColumn, `${description}`, severity, this.rule.ruleId, fileName, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defect, undefined));
            DefectsList_1.RuleListUtil.push(defect);
        });
    }
    getNodePosition(node) {
        if (!this.currentArkFile || !node.getSourceFile()) {
            return [0, 0];
        }
        const sourceFile = node.getSourceFile();
        const pos = this.getNodeStartPosition(node, sourceFile);
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
        // TypeScript 行列从0开始，显示时从1开始
        return [line + 1, character + 1];
    }
    /**
     * 获取节点的起始位置
     * @param node 当前节点
     * @param sourceFile 源文件
     * @returns 节点起始位置
     */
    getNodeStartPosition(node, sourceFile) {
        // 处理声明类节点
        if (this.isTypeDeclarationNode(node)) {
            return this.getNamedDeclarationPosition(node);
        }
        // 处理各种方法、函数和属性节点
        if (this.isMethodOrPropertyNode(node)) {
            return this.getNamedDeclarationPosition(node);
        }
        // 处理变量声明和参数节点
        if (lib_1.ts.isVariableDeclaration(node)) {
            return node.name.getStart();
        }
        if (lib_1.ts.isParameter(node)) {
            return lib_1.ts.isIdentifier(node.name) ? node.name.getStart() : node.getStart();
        }
        // 处理绑定元素（解构赋值）
        if (lib_1.ts.isBindingElement(node)) {
            return this.getBindingElementPosition(node, sourceFile);
        }
        // 处理标识符节点
        if (lib_1.ts.isIdentifier(node)) {
            return node.getStart();
        }
        // 其他类型的节点
        return node.getStart();
    }
    /**
     * 检查节点是否为类型声明节点（类、接口、枚举、类型别名）
     */
    isTypeDeclarationNode(node) {
        return lib_1.ts.isClassDeclaration(node) ||
            lib_1.ts.isInterfaceDeclaration(node) ||
            lib_1.ts.isEnumDeclaration(node) ||
            lib_1.ts.isTypeAliasDeclaration(node);
    }
    /**
     * 检查节点是否为方法或属性相关节点
     */
    isMethodOrPropertyNode(node) {
        return lib_1.ts.isMethodDeclaration(node) ||
            lib_1.ts.isFunctionDeclaration(node) ||
            lib_1.ts.isPropertyDeclaration(node) ||
            lib_1.ts.isGetAccessor(node) ||
            lib_1.ts.isSetAccessor(node);
    }
    /**
     * 获取命名声明节点的位置
     */
    getNamedDeclarationPosition(node) {
        return node.name?.getStart() ?? node.getStart();
    }
    /**
     * 获取绑定元素（解构赋值）的位置，特别处理重命名变量
     */
    getBindingElementPosition(node, sourceFile) {
        let pos = node.name.getStart();
        // 处理重命名变量，如 { a: b } 中的 b
        if (node.propertyName) {
            pos = this.findRenamedBindingPosition(node, sourceFile);
        }
        return pos;
    }
    /**
     * 查找重命名绑定变量的实际位置
     * 例如对于 { a: b } 要找到 b 的实际位置
     */
    findRenamedBindingPosition(node, sourceFile) {
        // 确保propertyName存在
        if (!node.propertyName) {
            return node.name.getStart();
        }
        const fullText = sourceFile.getFullText();
        const propertyEnd = node.propertyName.getEnd();
        // 跳过冒号和空格，找到实际变量名开始的位置
        let offset = propertyEnd;
        // 跳过冒号和紧随其后的空格
        while (offset < fullText.length && (fullText[offset] === ' ' || fullText[offset] === ':')) {
            offset++;
        }
        // 继续跳过更多空格
        while (offset < fullText.length && fullText[offset] === ' ') {
            offset++;
        }
        return offset;
    }
    /**
     * 收集解构赋值模式中的变量名
     * @param pattern 解构赋值模式
     */
    collectDestructuringNames(pattern) {
        pattern.elements.forEach(element => {
            if (lib_1.ts.isBindingElement(element)) {
                // 处理对象解构中的重命名，如 { a: b } 中的 b
                if (lib_1.ts.isIdentifier(element.name)) {
                    this.defaultArr.push(element.name);
                }
                // 递归处理嵌套解构，如 { a: { b } }
                else if (lib_1.ts.isObjectBindingPattern(element.name) || lib_1.ts.isArrayBindingPattern(element.name)) {
                    this.collectDestructuringNames(element.name);
                }
            }
        });
    }
    isInGlobalTypeDeclaration(node) {
        let current = node;
        let inTypeDeclaration = false;
        let inGlobalScope = false;
        while (current && !inTypeDeclaration) {
            if (lib_1.ts.isTypeLiteralNode(current) ||
                lib_1.ts.isTypeAliasDeclaration(current) ||
                lib_1.ts.isFunctionTypeNode(current)) {
                inTypeDeclaration = true;
            }
            current = current.parent;
        }
        if (inTypeDeclaration && current) {
            while (current) {
                if (lib_1.ts.isModuleDeclaration(current) &&
                    lib_1.ts.isIdentifier(current.name) &&
                    current.name.text === 'global') {
                    inGlobalScope = true;
                    break;
                }
                current = current.parent;
            }
        }
        return inTypeDeclaration && inGlobalScope;
    }
}
exports.NamingConventionCheck = NamingConventionCheck;
