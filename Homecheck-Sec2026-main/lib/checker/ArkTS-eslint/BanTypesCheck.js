"use strict";
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
exports.BanTypesCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'BanTypesCheck');
;
const StringMsg = 'Use string instead';
const BooleanMsg = 'Use boolean instead';
const NumberMsg = 'Use number instead';
const SymbolMsg = 'Use symbol instead';
const BigIntMsg = 'Use bigint instead';
const FunctionMsg = [
    'The `Function` type accepts any function-like value.',
    'It provides no type safety when calling the function, which can be a common source of bugs.',
    'It also accepts things like class declarations, which will throw at runtime as they will not be called with `new`.',
    'If you are expecting the function to accept certain arguments, you should explicitly define the function shape.',
].join('\n');
const ObjectMsg = [
    'The `Object` type actually means "any non-nullish value", so it is marginally better than `unknown`.',
    '- If you want a type meaning "any object", you probably want `object` instead.',
    '- If you want a type meaning "any value", you probably want `unknown` instead.',
    '- If you really want a type meaning "any non-nullish value", you probably want `NonNullable<unknown>` instead.',
].join('\n');
const LiteralObjectMsg = [
    '`{}` actually means "any non-nullish value".',
    '- If you want a type meaning "any object", you probably want `object` instead.',
    '- If you want a type meaning "any value", you probably want `unknown` instead.',
    '- If you want a type meaning "empty object", you probably want `Record<string, never>` instead.',
    '- If you really want a type meaning "any non-nullish value", you probably want `NonNullable<unknown>` instead.',
].join('\n');
const defaultTypes = {
    String: {
        message: StringMsg,
        fixWith: 'string',
    },
    Boolean: {
        message: BooleanMsg,
        fixWith: 'boolean',
    },
    Number: {
        message: NumberMsg,
        fixWith: 'number',
    },
    Symbol: {
        message: SymbolMsg,
        fixWith: 'symbol',
    },
    BigInt: {
        message: BigIntMsg,
        fixWith: 'bigint',
    },
    Function: {
        message: FunctionMsg,
    },
    // object typing
    Object: {
        message: ObjectMsg,
        suggest: ['object', 'unknown', 'NonNullable<unknown>'],
    },
    '{}': {
        message: LiteralObjectMsg,
        suggest: [
            'object',
            'unknown',
            'Record<string, never>',
            'NonNullable<unknown>',
        ],
    },
};
class BanTypesCheck {
    defaultOptions = [{ types: defaultTypes }];
    rule;
    defects = [];
    issues = [];
    bannedTypes = new Map();
    canFixTypes = ['String', 'Boolean', 'Number', 'Symbol', 'BigInt'];
    filePath = '';
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/ban-types.md',
        description: 'Disallow certain types.',
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcherCb];
    }
    ;
    check = (target) => {
        try {
            this.getDefaultOptions();
            this.filePath = target.getFilePath();
            const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
            // 遍历 AST
            this.visitNode(sourceFile, sourceFile);
        }
        catch (error) {
            logger.error(`Error occurred while checking file: ${target.getFilePath()}, Error: ${error}`);
        }
        ;
    };
    getDefaultOptions() {
        if (this.rule && this.rule.option && this.rule.option[0]) {
            const options = this.rule.option;
            const extendDefaults = options[0].extendDefaults ?? true;
            const customTypes = options[0].types ?? {};
            // 合并默认类型和自定义类型
            const mergedTypes = extendDefaults
                ? { ...defaultTypes, ...customTypes }
                : customTypes;
            this.defaultOptions[0].types = mergedTypes;
            this.defaultOptions[0].extendDefaults = extendDefaults;
        }
        else {
            this.defaultOptions = [{ types: defaultTypes }];
        }
        ;
        if (this.defaultOptions[0].types) {
            // 创建禁用类型映射，保留 null 值的配置
            this.bannedTypes = new Map(Object.entries(this.defaultOptions[0].types).map(([type, data]) => [
                this.removeKeySpaces(type),
                data === null ? null : data
            ]));
            // 更新可修复类型列表
            this.canFixTypes = Object.entries(this.defaultOptions[0].types)
                .filter(([_, data]) => data && typeof data === 'object' && 'fixWith' in data)
                .map(([type]) => this.removeKeySpaces(type));
        }
        ;
    }
    checkTypeReferenceNode(node, sourceFile) {
        if (arkanalyzer_1.ts.isIdentifier(node.typeName)) {
            const typeName = node.typeName.getText(sourceFile);
            this.checkTypeString(typeName, node.typeName, sourceFile);
            this.checkBannedType(node, sourceFile);
        }
        else if (arkanalyzer_1.ts.isQualifiedName(node.typeName)) {
            this.checkQualifiedTypeName(node.typeName, sourceFile);
        }
        else {
            this.checkBannedType(node, sourceFile);
        }
        ;
    }
    ;
    checkTypeLiteralNode(node, sourceFile) {
        const typeText = node.getText();
        const strippedType = this.removeKeySpaces(typeText);
        if (strippedType === '{}') {
            this.checkBannedType(node, sourceFile);
        }
        ;
    }
    ;
    checkTupleTypeNode(node, sourceFile) {
        const typeText = node.getText();
        const tupleText = this.removeKeySpaces(typeText);
        if (tupleText === '[]' || tupleText === '[[]]') {
            this.checkBannedType(node, sourceFile);
        }
        ;
        node.elements.forEach((element) => {
            if (arkanalyzer_1.ts.isTypeReferenceNode(element)) {
                this.checkBannedType(element, sourceFile);
            }
            ;
        });
    }
    ;
    checkInterfaceDeclaration(node, sourceFile) {
        if (!node.heritageClauses) {
            return;
        }
        ;
        node.heritageClauses.forEach((clause) => {
            clause.types.forEach((type) => {
                if (arkanalyzer_1.ts.isTypeReferenceNode(type) || arkanalyzer_1.ts.isExpressionWithTypeArguments(type)) {
                    this.checkBannedType(type, sourceFile);
                }
                ;
            });
        });
        // 检查接口成员的类型
        this.checkInterfaceMembers(node, sourceFile);
    }
    ;
    checkInterfaceMembers(node, sourceFile) {
        node.members.forEach(member => {
            if (arkanalyzer_1.ts.isPropertySignature(member) && member.type) {
                this.checkBannedType(member.type, sourceFile);
            }
            ;
        });
    }
    ;
    checkClassDeclaration(node, sourceFile) {
        // 检查继承和实现的类型
        if (!node.heritageClauses) {
            return;
        }
        ;
        // 遍历继承和实现的类型
        node.heritageClauses.forEach((clause) => {
            clause.types.forEach(type => {
                if (this.isHeritageTypeToCheck(type)) {
                    this.checkBannedType(type, sourceFile);
                }
                ;
            });
        });
        // 检查类成员的类型
        this.checkClassMembers(node, sourceFile);
    }
    ;
    checkClassMembers(node, sourceFile) {
        node.members.forEach(member => {
            // 检查属性和方法的类型
            this.checkMemberType(member, sourceFile);
            // 检查方法参数的类型
            if (arkanalyzer_1.ts.isMethodDeclaration(member)) {
                this.checkMethodParameters(member, sourceFile);
            }
            ;
        });
    }
    ;
    checkMemberType(member, sourceFile) {
        if ((arkanalyzer_1.ts.isPropertyDeclaration(member) || arkanalyzer_1.ts.isMethodDeclaration(member)) && member.type) {
            this.checkBannedType(member.type, sourceFile);
        }
        ;
    }
    ;
    checkMethodParameters(method, sourceFile) {
        method.parameters.forEach(param => {
            if (param.type) {
                this.checkBannedType(param.type, sourceFile);
            }
            ;
        });
    }
    ;
    // 重命名方法以更准确地反映其用途
    isHeritageTypeToCheck(type) {
        return arkanalyzer_1.ts.isTypeReferenceNode(type) ||
            (arkanalyzer_1.ts.isExpressionWithTypeArguments(type) && !this.shouldSkipInheritanceCheck(type));
    }
    ;
    visitNode(node, sourceFile) {
        if (arkanalyzer_1.ts.isTypeReferenceNode(node)) {
            this.checkTypeReferenceNode(node, sourceFile);
        }
        else if (arkanalyzer_1.ts.isTypeLiteralNode(node)) {
            this.checkTypeLiteralNode(node, sourceFile);
        }
        else if (arkanalyzer_1.ts.isTupleTypeNode(node)) {
            this.checkTupleTypeNode(node, sourceFile);
        }
        else if (arkanalyzer_1.ts.isInterfaceDeclaration(node)) {
            this.checkInterfaceDeclaration(node, sourceFile);
        }
        else if (arkanalyzer_1.ts.isClassDeclaration(node)) {
            this.checkClassDeclaration(node, sourceFile);
        }
        else if (arkanalyzer_1.ts.isTypeAliasDeclaration(node)) {
            this.checkBannedType(node.type, sourceFile);
        }
        else if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isArrowFunction(node)) {
            node.parameters.forEach((param) => {
                if (param.type) {
                    this.checkBannedType(param.type, sourceFile);
                }
                ;
            });
            if (node.type) {
                this.checkBannedType(node.type, sourceFile);
            }
            ;
        }
        else if (arkanalyzer_1.ts.isVariableDeclaration(node) && node.type) {
            this.checkBannedType(node.type, sourceFile);
        }
        else if (arkanalyzer_1.ts.isParameterPropertyDeclaration(node, node.parent) && node.type) {
            this.checkBannedType(node.type, sourceFile);
        }
        ;
        arkanalyzer_1.ts.forEachChild(node, child => this.visitNode(child, sourceFile));
    }
    ;
    shouldSkipInheritanceCheck(type) {
        const text = type.getText();
        const builtInTypes = ['String', 'Number', 'Boolean', 'Object', 'Function'];
        return builtInTypes.some(t => text.startsWith(t));
    }
    ;
    checkQualifiedTypeName(node, sourceFile) {
        // 获取完整的限定名
        const fullName = node.getText();
        // 检查最右边的标识符是否是禁用类型
        const bannedType = this.bannedTypes.get(this.removeKeySpaces(fullName));
        if (bannedType) {
            this.checkBannedType(node, sourceFile);
        }
        ;
    }
    ;
    checkTypeString(typeString, node, sourceFile) {
        // 检查类型是否在禁用列表中
        const bannedType = this.bannedTypes.get(typeString);
        if (!this.bannedTypes.has(typeString) || bannedType === false) {
            return;
        }
        ;
        this.commonCheck(node, sourceFile, typeString, bannedType);
    }
    ;
    checkBannedType(node, sourceFile) {
        const typeText = node.getText();
        const strippedType = this.removeKeySpaces(typeText);
        this.checkTypeString(strippedType, node, sourceFile);
    }
    ;
    commonCheck(node, sourceFile, typeString, bannedType) {
        // 构造错误信息
        const message = `Don't use \`${typeString}\` as a type.${this.getCustomMessageByType(bannedType)}`;
        // 获取节点在源文件中的位置信息
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const isCanFix = this.canFixTypes.includes(typeString);
        let defect = this.addIssueReport({
            line: line + 1,
            startCol: character + 1,
            endColum: character + 1 + typeString.length,
            message: message,
            isCanFix: isCanFix
        });
        let fix;
        if (isCanFix) {
            fix = this.createFix(node, bannedType);
        }
        ;
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    createFix(node, bannedType) {
        if (typeof bannedType === 'object' && bannedType !== null && 'fixWith' in bannedType) {
            return { range: [node.getStart(), node.getEnd()], text: bannedType.fixWith };
        }
        ;
        return undefined;
    }
    ;
    addIssueReport(warnInfo) {
        this.metaData.description = warnInfo.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endColum, this.metaData.description, severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, warnInfo.isCanFix);
        return defect;
    }
    ;
    // 去除空格
    removeKeySpaces(str) {
        return str.replace(/\s/g, '');
    }
    ;
    // 获取自定义消息
    getCustomMessageByType(bannedType) {
        if (bannedType == null) {
            return '';
        }
        else if (typeof bannedType === 'string') {
            return ` ${bannedType}`;
        }
        else if (typeof bannedType === 'object' && 'message' in bannedType) {
            return ` ${bannedType.message}`;
        }
        ;
        return '';
    }
}
exports.BanTypesCheck = BanTypesCheck;
