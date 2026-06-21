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
exports.TypedefCheck = void 0;
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
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'TypedefCheck');
class TypedefCheck {
    CONST_STR = 'const';
    CONST_LET = 'let';
    CONST_CONSTRUCTOR = 'constructor';
    CONST_EQUAL = '=';
    CONST_ARROW = '=>';
    rule;
    defects = [];
    issues = [];
    sourceFile;
    filePath;
    optionList = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/typedef.md',
        description: 'Expected a type annotation.',
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    ;
    check = (target) => {
        this.getDefaultOption();
        this.filePath = target.getFilePath();
        this.sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.visitNode(this.sourceFile);
    };
    isBindingPattern = (node) => {
        return lib_1.ts.isArrayBindingPattern(node) || lib_1.ts.isObjectBindingPattern(node);
    };
    visitNode(node) {
        // 处理变量声明（规则4、5、10）
        this.variableDeclarationNode(node);
        if (lib_1.ts.isBinaryExpression(node) && lib_1.ts.isObjectLiteralExpression(node.left)) {
            const start = node.left.getStart(this.sourceFile);
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
            this.addIssueReport('objectDestructuring', line, character, undefined);
        }
        // 处理参数（规则4、5、6、8）
        this.parameterNode(node);
        // 处理类成员变量（规则7）
        this.propertyDeclarationNode(node);
        // 处理类型别名属性（规则9）
        this.typeAliasDeclarationNode(node);
        lib_1.ts.forEachChild(node, child => this.visitNode(child));
    }
    typeAliasDeclarationNode(node) {
        if (lib_1.ts.isTypeAliasDeclaration(node)) {
            if (lib_1.ts.isTypeLiteralNode(node.type)) {
                node.type.members.forEach((member) => {
                    this.propertySignatureNode(member);
                });
            }
        }
    }
    propertySignatureNode(member) {
        if (lib_1.ts.isPropertySignature(member) && !member.type) {
            const start = member.name.getStart(this.sourceFile);
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
            this.addIssueReport('propertyDeclaration', line, character, member.name.getText());
        }
    }
    propertyDeclarationNode(node) {
        if (lib_1.ts.isPropertyDeclaration(node) && !node.type) {
            let start = node.name.getStart(this.sourceFile);
            const nodeName = node.getText();
            if (nodeName.startsWith('public ') || nodeName.startsWith('static ') ||
                nodeName.startsWith('declare ') || nodeName.startsWith('@') ||
                nodeName.startsWith('readonly') || nodeName.startsWith('private')) {
                start = node.getStart(this.sourceFile);
            }
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
            let text = node.name.getText();
            if (lib_1.ts.isComputedPropertyName(node.name)) {
                text = node.name.expression.getText();
            }
            let name = text.startsWith('#') || text.startsWith(`'`) ||
                text.includes('.') || text.startsWith(`"`) || text.startsWith('`') ? undefined : text;
            if (name && name.startsWith('(') && name.endsWith(')')) {
                name = name.substring(1, name.length - 1);
            }
            this.addIssueReport('memberVariableDeclaration', line, character, name);
        }
    }
    parameterNode(node) {
        if (lib_1.ts.isParameter(node)) {
            if (!node.type) {
                this.bindingPatternNode(node);
                this.parameterNodeExecute(node);
            }
        }
    }
    parameterNodeExecute(node) {
        const parent = node.parent;
        const isArrowFunction = parent && lib_1.ts.isArrowFunction(parent);
        const type = isArrowFunction ? 'arrowParameter' : 'parameter';
        let start = node.getStart(this.sourceFile);
        let pos = this.sourceFile.getLineAndCharacterOfPosition(start);
        let name = (node.getText() === node.name.getText() && !node.getText().startsWith('{')) ? node.getText() : undefined;
        if (type === 'parameter' && name?.startsWith('[') && name.endsWith(']')) {
            name = undefined;
        }
        if (type === 'parameter' && node.getText().startsWith('@')) {
            name = node.name.getText();
            start = node.name.getStart(this.sourceFile);
            pos = this.sourceFile.getLineAndCharacterOfPosition(start);
        }
        this.addIssueReport(type, pos.line, pos.character, name);
    }
    bindingPatternNode(node) {
        if (this.isBindingPattern(node.name)) {
            const isArray = lib_1.ts.isArrayBindingPattern(node.name);
            const type = isArray ? 'arrayDestructuring' : 'objectDestructuring';
            let start = node.name.getStart(this.sourceFile);
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
            this.addIssueReport(type, line, character, undefined);
        }
    }
    variableDeclarationNode(node) {
        if (lib_1.ts.isVariableDeclaration(node)) {
            if (!node.type) {
                this.variableDeclarationNode1(node);
            }
        }
    }
    variableDeclarationNode1(node) {
        if (lib_1.ts.isArrayBindingPattern(node.name)) {
            const start = node.name.getStart(this.sourceFile);
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
            this.addIssueReport('arrayDestructuring', line, character, undefined);
        }
        else if (lib_1.ts.isObjectBindingPattern(node.name)) {
            const start = node.name.getStart(this.sourceFile);
            const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
            this.addIssueReport('objectDestructuring', line, character, undefined);
        }
        else {
            this.variableDeclarationNodeElse(node);
        }
    }
    variableDeclarationNodeElse(node) {
        const isFunction = node.initializer &&
            (lib_1.ts.isArrowFunction(node.initializer) ||
                lib_1.ts.isFunctionExpression(node.initializer));
        const type = isFunction
            ? 'variableDeclarationIgnoreFunction'
            : 'variableDeclaration';
        const start = node.name.getStart(this.sourceFile);
        const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
        const nodeName = node.getText();
        const name = node.name.getText();
        const substr = nodeName.substring(name.length);
        if (type === 'variableDeclaration' && !lib_1.ts.isForOfStatement(node.parent.parent) &&
            !lib_1.ts.isForInStatement(node.parent.parent) && !lib_1.ts.isCatchClause(node.parent)) {
            this.addIssueReport(type, line, character, node.name.getText());
        }
        else if (type === 'variableDeclarationIgnoreFunction') {
            this.addIssueReport(type, line, character, node.name.getText());
        }
    }
    addIssueReport(optionType, line, col, name) {
        if ((optionType !== 'variableDeclarationIgnoreFunction' && this.optionList.includes(optionType)) ||
            (optionType === 'variableDeclarationIgnoreFunction' && this.optionList.includes('variableDeclaration') &&
                !this.optionList.includes('variableDeclarationIgnoreFunction'))) {
            const description = name ? `Expected ${name} to have a type annotation.` : `Expected a type annotation.`;
            const defect = new Defects_1.Defects(line + 1, col + 1, line + 1, description, this.rule.alert ?? this.metaData.severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defect, undefined));
            DefectsList_1.RuleListUtil.push(defect);
        }
    }
    getDefaultOption() {
        let option;
        if (this.rule && this.rule.option) {
            option = this.rule.option;
            if (option[0]) {
                if (option[0].arrayDestructuring) {
                    this.optionList.push('arrayDestructuring');
                }
                if (option[0].arrowParameter) {
                    this.optionList.push('arrowParameter');
                }
                if (option[0].memberVariableDeclaration) {
                    this.optionList.push('memberVariableDeclaration');
                }
                if (option[0].objectDestructuring) {
                    this.optionList.push('objectDestructuring');
                }
                if (option[0].parameter) {
                    this.optionList.push('parameter');
                }
                if (option[0].propertyDeclaration) {
                    this.optionList.push('propertyDeclaration');
                }
                if (option[0].variableDeclaration) {
                    this.optionList.push('variableDeclaration');
                }
                if (option[0].variableDeclarationIgnoreFunction) {
                    this.optionList.push('variableDeclarationIgnoreFunction');
                }
            }
        }
    }
}
exports.TypedefCheck = TypedefCheck;
