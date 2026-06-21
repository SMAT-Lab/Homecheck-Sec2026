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
exports.PreferFunctionTypeCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, "PreferFunctionTypeCheck");
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/prefer-function-type.md',
    description: 'Type literal only has a call signature, you should use a function type instead.',
};
class PreferFunctionTypeCheck {
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
    filepatch = '';
    check = (arkFile) => {
        let astRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        this.filepatch = arkFile.getFilePath();
        for (let child of astRoot.statements) {
            if (arkanalyzer_1.ts.isInterfaceDeclaration(child) || (arkanalyzer_1.ts.isTypeAliasDeclaration(child) && child.type) || arkanalyzer_1.ts.isFunctionDeclaration(child)) {
                this.checkPreferFunctionType(arkFile, child, astRoot);
            }
            ;
        }
        ;
    };
    checkPreferFunctionType(arkFile, node, sourceFile) {
        try {
            if (arkanalyzer_1.ts.isInterfaceDeclaration(node)) {
                const { isHasHeritageProperty, isExtendsFunction, isExtendsDefult } = this.checkHeritageClauses(node, arkFile, sourceFile);
                if (isHasHeritageProperty) {
                    return;
                }
                ;
                this.checkInterfaceOrTypeAlias(arkFile, node, sourceFile, isExtendsFunction, isExtendsDefult);
            }
            else if (arkanalyzer_1.ts.isTypeAliasDeclaration(node)) {
                this.checkTypeAliasDeclaration(node, sourceFile);
            }
            else if (arkanalyzer_1.ts.isFunctionDeclaration(node)) {
                this.checkFunctionOrVariableDeclaration(node, sourceFile);
            }
            ;
        }
        catch (error) {
            if (error instanceof Error) {
                logger.error(`Error processing node: ${error.message}`);
            }
            else {
                logger.warn('An unknown error occurred while processing node.');
            }
            ;
        }
        ;
    }
    ;
    checkHeritageClauses(node, arkFile, sourceFile) {
        const hasHeritageClauses = node.heritageClauses;
        let isHasHeritageProperty = false;
        let isExtendsFunction = false;
        let isExtendsDefult = false;
        if (node.modifiers && node.modifiers.length === 2 && node.modifiers[0].kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword) {
            const isDefaultKeyword = node.modifiers[1]?.kind === arkanalyzer_1.ts.SyntaxKind.DefaultKeyword;
            if (isDefaultKeyword) {
                isExtendsDefult = true;
                return { isHasHeritageProperty, isExtendsFunction, isExtendsDefult };
            }
            ;
        }
        ;
        if (!hasHeritageClauses) {
            return { isHasHeritageProperty, isExtendsFunction, isExtendsDefult };
        }
        ;
        for (const clause of hasHeritageClauses) {
            if (clause.token !== arkanalyzer_1.ts.SyntaxKind.ExtendsKeyword) {
                continue;
            }
            ;
            for (const type of clause.types) {
                const typeName = type.expression.getText(sourceFile);
                if (typeName === 'Function') {
                    isExtendsFunction = true;
                }
                ;
                const aliasCls = arkFile.getClassWithName(typeName);
                if (!aliasCls) {
                    continue;
                }
                ;
                const classCode = aliasCls.getCode();
                if (classCode && this.hasPropertySignature(classCode)) {
                    isHasHeritageProperty = true;
                    break;
                }
                ;
            }
            ;
            if (isHasHeritageProperty) {
                break;
            }
            ;
        }
        ;
        return { isHasHeritageProperty, isExtendsFunction, isExtendsDefult };
    }
    ;
    hasPropertySignature(code) {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('PreferFunctionTypeCheck.ts', code);
        for (const statement of sourceFile.statements) {
            if (this.isInterfaceOrClass(statement)) {
                return this.hasPropertyInMembers(statement.members);
            }
            ;
        }
        ;
        return false;
    }
    ;
    isInterfaceOrClass(statement) {
        return arkanalyzer_1.ts.isInterfaceDeclaration(statement) || arkanalyzer_1.ts.isClassDeclaration(statement);
    }
    ;
    hasPropertyInMembers(members) {
        for (const member of members) {
            if (arkanalyzer_1.ts.isPropertySignature(member)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkInterfaceOrTypeAlias(arkFile, node, sourceFile, isExtendsFunction, isExtendsDefult) {
        const name = node.name?.getText(sourceFile);
        if (!name) {
            return;
        }
        ;
        const { callSignatures, constructSignatures, usesThisType, hasOnlyCallSignature, hasOnlyConstructSignature } = this.processNodeMembers(node, sourceFile);
        if (callSignatures.length > 1 || constructSignatures.length > 1) {
            return;
        }
        ;
        if (hasOnlyCallSignature && callSignatures.length > 0) {
            this.handleSingleCallSignature(node, sourceFile, isExtendsFunction, isExtendsDefult, callSignatures, usesThisType, name);
        }
        else if (hasOnlyConstructSignature && constructSignatures.length > 0) {
            this.handleSingleConstructSignature(node, sourceFile, constructSignatures, name);
        }
        ;
    }
    ;
    processNodeMembers(node, sourceFile) {
        let callSignatures = [];
        let constructSignatures = [];
        let usesThisType = false;
        let hasOnlyCallSignature = true;
        let hasOnlyConstructSignature = true;
        const members = arkanalyzer_1.ts.isInterfaceDeclaration(node)
            ? node.members
            : arkanalyzer_1.ts.isTypeAliasDeclaration(node) && arkanalyzer_1.ts.isTypeLiteralNode(node.type)
                ? node.type.members
                : [];
        for (const member of members) {
            [callSignatures, constructSignatures, usesThisType, hasOnlyCallSignature, hasOnlyConstructSignature] =
                this.processMember(member, sourceFile, callSignatures, constructSignatures, usesThisType, hasOnlyCallSignature, hasOnlyConstructSignature);
        }
        ;
        return { callSignatures, constructSignatures, usesThisType, hasOnlyCallSignature, hasOnlyConstructSignature };
    }
    ;
    processMember(member, sourceFile, callSignatures, constructSignatures, usesThisType, hasOnlyCallSignature, hasOnlyConstructSignature) {
        if (arkanalyzer_1.ts.isCallSignatureDeclaration(member)) {
            callSignatures.push(member);
            usesThisType = this.CheckUsesThisType(member);
            hasOnlyConstructSignature = false;
        }
        else if (arkanalyzer_1.ts.isConstructSignatureDeclaration(member)) {
            constructSignatures.push(member);
            hasOnlyCallSignature = false;
        }
        else if (arkanalyzer_1.ts.isPropertySignature(member) ||
            arkanalyzer_1.ts.isIndexSignatureDeclaration(member) ||
            arkanalyzer_1.ts.isMethodSignature(member) ||
            arkanalyzer_1.ts.isGetAccessor(member) ||
            arkanalyzer_1.ts.isSetAccessor(member)) {
            hasOnlyCallSignature = false;
            hasOnlyConstructSignature = false;
        }
        ;
        return [callSignatures, constructSignatures, usesThisType, hasOnlyCallSignature, hasOnlyConstructSignature];
    }
    ;
    escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    ;
    checkTypeAliasDeclaration(node, sourceFile) {
        const processTypes = (types) => {
            types.forEach(type => {
                if (arkanalyzer_1.ts.isTypeLiteralNode(type)) {
                    this.reportTypeLiteral(node, type, sourceFile, true);
                }
            });
        };
        if (arkanalyzer_1.ts.isIntersectionTypeNode(node.type)) {
            processTypes(node.type.types);
        }
        else if (arkanalyzer_1.ts.isUnionTypeNode(node.type)) {
            processTypes(node.type.types);
        }
        else if (arkanalyzer_1.ts.isTypeLiteralNode(node.type)) {
            let hasOnlyCallSignature = true;
            let callSignatures = [];
            let usesThisType = false;
            arkanalyzer_1.ts.forEachChild(node.type, (child) => {
                if (arkanalyzer_1.ts.isCallSignatureDeclaration(child)) {
                    callSignatures.push(child);
                    usesThisType = this.CheckUsesThisType(child);
                }
                else if (arkanalyzer_1.ts.isPropertySignature(child) || arkanalyzer_1.ts.isConstructSignatureDeclaration(child) ||
                    arkanalyzer_1.ts.isIndexSignatureDeclaration(child) || arkanalyzer_1.ts.isMethodSignature(child)) {
                    hasOnlyCallSignature = false;
                }
                ;
            });
            if (callSignatures.length > 1) {
                return;
            }
            if (hasOnlyCallSignature && callSignatures.length > 0) {
                const callSignature = callSignatures[0];
                const { fixKeyword, errMesaging } = this.extractCallSignatureInfo(callSignature, node, sourceFile);
                let defect = this.createDefect(callSignature, callSignature.getText(), usesThisType ? errMesaging : this.metaData.description, usesThisType);
                let isAllNode = node.getText().replace(callSignature.parent.getText(), fixKeyword);
                if (isAllNode.match(/;[\s]*;/)) {
                    isAllNode = isAllNode.replace(/;[\s]*;$/, ';');
                }
                let ruleFix = this.createFix(node, isAllNode);
                if (usesThisType) {
                    this.issues.push(new Defects_1.IssueReport(defect, undefined));
                }
                else {
                    this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
                }
                ;
            }
            ;
        }
        ;
    }
    ;
    handleSingleCallSignature(node, sourceFile, isExtendsFunction, isExtendsDefult, callSignatures, usesThisType, name) {
        const callSignature = callSignatures[0];
        const interfaceName = node.name?.getText();
        const returnTypeText = (callSignature?.getText() || 'void');
        const result = returnTypeText.replace(/(\(\s*[^)]*\s*\))\s*:/g, '$1 =>');
        const isExported = node.modifiers?.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.ExportKeyword);
        const exportKeyword = isExported ? 'export ' : '';
        // 获取泛型参数
        const typeParameters = arkanalyzer_1.ts.isInterfaceDeclaration(node) && node.typeParameters
            ? `<${node.typeParameters.map(param => param.getText()).join(', ')}>`
            : '';
        let suggestion = `${exportKeyword}type ${interfaceName}${typeParameters} = ${result}`;
        // 处理注释
        const comments = arkanalyzer_1.ts.getLeadingCommentRanges(sourceFile.text, callSignature.pos) || [];
        comments.forEach(comment => {
            const commentText = sourceFile.text.slice(comment.pos, comment.end);
            suggestion = `${commentText}\n${suggestion}`;
        });
        const fixKeyword = suggestion;
        let errMesaging = 'Interface only has a call signature, you should use a function type instead.';
        let isThis = false;
        if (usesThisType || callSignature.type?.getText() === 'this') {
            errMesaging = `\`this\` refers to the function type '${name}', did you intend to use a generic \`this\` parameter like \`<Self>(this: Self, ...) => Self\` instead?`;
            isThis = true;
        }
        ;
        if (isExtendsDefult) {
            usesThisType = true;
        }
        ;
        let defect = this.createDefect(callSignature, callSignature.getText(), errMesaging, isThis);
        let ruleFix = this.createFix(node, fixKeyword);
        if (usesThisType) {
            this.issues.push(new Defects_1.IssueReport(defect, undefined));
        }
        else {
            this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
        }
        ;
    }
    ;
    extractCallSignatureInfo(callSignature, node, sourceFile) {
        const callSignatureParent = callSignature.parent.getText();
        const modifiedString = callSignatureParent.replace(/\{/, '').replace(/\}$/, '');
        const returnTypeText = (callSignature.type?.getText(sourceFile) || 'void');
        const parametersText = modifiedString.replace(new RegExp(`: ${this.escapeRegExp(returnTypeText)}`, 'g'), `=> ${returnTypeText}`);
        let fixKeyword = parametersText;
        fixKeyword = fixKeyword.replace(/\n/g, '');
        const errMesaging = `\`this\` refers to the function type '${node.name.getText()}', did you intend to use a generic \`this\` parameter like \`<Self>(this: Self, ...) => Self\` instead?`;
        return { fixKeyword, errMesaging };
    }
    ;
    checkFunctionOrVariableDeclaration(node, sourceFile) {
        if (arkanalyzer_1.ts.isFunctionDeclaration(node)) {
            node.parameters.forEach(param => this.checkParameterType(param, sourceFile));
        }
        else if (arkanalyzer_1.ts.isVariableDeclaration(node)) {
            this.checkParameterType(node, sourceFile);
        }
        ;
    }
    ;
    checkParameterType(node, sourceFile) {
        const type = node.type;
        if (type) {
            if (arkanalyzer_1.ts.isTypeLiteralNode(type)) {
                this.reportTypeLiteral(node, type, sourceFile, false);
            }
            else if (arkanalyzer_1.ts.isUnionTypeNode(type)) {
                type.types.forEach(unionType => {
                    if (arkanalyzer_1.ts.isTypeLiteralNode(unionType)) {
                        this.reportTypeLiteral(node, unionType, sourceFile, true);
                    }
                    ;
                });
            }
            ;
        }
        ;
    }
    ;
    CheckUsesThisType(member) {
        let usesThisType = false;
        usesThisType = member.parameters.some(param => {
            return param.type !== undefined && arkanalyzer_1.ts.isThisTypeNode(param.type);
        });
        if (!usesThisType && member.type && arkanalyzer_1.ts.isTypeNode(member.type)) {
            if (arkanalyzer_1.ts.isUnionTypeNode(member.type)) {
                usesThisType = member.type.types.some(type => arkanalyzer_1.ts.isThisTypeNode(type));
            }
            else if (arkanalyzer_1.ts.isTypeReferenceNode(member.type) && member.type.typeName.getText() === 'this') {
                usesThisType = true;
            }
            ;
        }
        ;
        return usesThisType;
    }
    ;
    reportTypeLiteral(node, type, sourceFile, isUnionType) {
        let name;
        if (arkanalyzer_1.ts.isTypeAliasDeclaration(node)) {
            name = node.name.getText(sourceFile);
        }
        ;
        let hasOnlyCallSignature = true;
        let callSignatures = [];
        let usesThisType = false;
        arkanalyzer_1.ts.forEachChild(type, (child) => {
            if (arkanalyzer_1.ts.isCallSignatureDeclaration(child)) {
                callSignatures.push(child);
                usesThisType = this.CheckUsesThisType(child);
            }
            else if (arkanalyzer_1.ts.isPropertySignature(child) || arkanalyzer_1.ts.isConstructSignatureDeclaration(child) ||
                arkanalyzer_1.ts.isIndexSignatureDeclaration(child) || arkanalyzer_1.ts.isMethodSignature(child)) {
                hasOnlyCallSignature = false;
            }
            ;
        });
        if (callSignatures.length > 1) {
            return;
        }
        if (hasOnlyCallSignature && callSignatures.length > 0) {
            const errMesaging = `\`this\` refers to the function type '${name}', did you intend to use a generic \`this\` parameter like \`<Self>(this: Self, ...) => Self\` instead?`;
            const callSignature = callSignatures[0];
            const callSignatureParent = callSignature.parent.getText();
            const modifiedString = callSignatureParent.replace(/[{}]/g, '');
            const returnTypeText = (callSignature.type?.getText(sourceFile) || 'void');
            let parametersText = modifiedString.replace(new RegExp(`: ${this.escapeRegExp(returnTypeText)}`, "g"), `=> ${returnTypeText}`);
            if (isUnionType) {
                parametersText = parametersText.replace(/\(([^)]*)\)\s*=>\s*(\w+)/, "(($1) => $2)");
            }
            ;
            const fixKeyword = parametersText;
            let defect = this.createDefect(callSignature, callSignature.getText(), usesThisType ? errMesaging : this.metaData.description, usesThisType);
            let isAllNode = node.getText().replace(callSignatureParent, fixKeyword);
            if (isAllNode.match(/;[\s]*;/)) {
                isAllNode = isAllNode.replace(/;[\s]*;$/, ';');
            }
            ;
            let ruleFix = this.createFix(node, isAllNode);
            if (usesThisType) {
                this.issues.push(new Defects_1.IssueReport(defect, undefined));
            }
            else {
                this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
            }
            ;
        }
        ;
    }
    ;
    createDefect(node, keyword, errMesaging, isThis) {
        const warnInfo = this.getLineAndColumn(node, isThis);
        const filePath = warnInfo.filePath;
        let lineNum = warnInfo.line;
        let startColum = warnInfo.startCol;
        let endColumn = warnInfo.endCol;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(lineNum, startColum, endColumn, errMesaging, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, !isThis);
        this.defects.push(defect);
        DefectsList_1.RuleListUtil.push(defect);
        return defect;
    }
    ;
    getLineAndColumn(node, isThis) {
        const sourceFile = node.getSourceFile();
        let startIndex = 0;
        if (isThis) {
            startIndex = node.getText().indexOf('this');
        }
        ;
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const endCharacter = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).character;
        return {
            line: line + 1,
            startCol: character + 1 + startIndex,
            endCol: endCharacter + 1,
            filePath: this.filepatch
        };
    }
    ;
    createFix(child, code) {
        return { range: [child.getStart(), child.getEnd()], text: code };
    }
    ;
    handleSingleConstructSignature(node, sourceFile, constructSignatures, name) {
        const constructSignature = constructSignatures[0];
        const errMessage = 'Interface only has a call signature, you should use a function type instead.';
        const fixKeyword = this.generateFixKeyword(constructSignature, node, sourceFile);
        let defect = this.createDefect(constructSignature, constructSignature.getText(), errMessage, false);
        let ruleFix = this.createFix(node, fixKeyword);
        this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
    }
    ;
    generateFixKeyword(constructSignature, node, sourceFile) {
        const callSignatureParent = constructSignature.parent.getText();
        const interfaceName = node.name?.getText();
        let modifiedString = callSignatureParent.replace('interface', 'type');
        const returnTypeText = constructSignature.type?.getText(sourceFile) || 'void';
        const regex1 = new RegExp(`\\b${interfaceName}\\s*(<[^>]*>)?\\s*\\{`, 'g');
        modifiedString = modifiedString.replace(regex1, `${interfaceName}$1 =`);
        modifiedString = modifiedString.replace(/\}+$/, '');
        const index = modifiedString.indexOf(constructSignature.getText());
        if (index !== -1) {
            modifiedString = modifiedString.substring(0, index).replace(/\r\n\s*$/, '') + constructSignature.getText() + modifiedString.substring(index + constructSignature.getText().length);
        }
        ;
        let parametersText = modifiedString.replace(new RegExp(`: ${this.escapeRegExp(returnTypeText)}`, 'g'), `=> ${returnTypeText}`);
        const comments = arkanalyzer_1.ts.getLeadingCommentRanges(sourceFile.text, constructSignature.pos) || [];
        if (comments.length > 0) {
            const commentText = comments.map(comment => sourceFile.text.slice(comment.pos, comment.end)).join('\n');
            parametersText = `${commentText}\n${parametersText}`;
        }
        ;
        return parametersText;
    }
    ;
}
exports.PreferFunctionTypeCheck = PreferFunctionTypeCheck;
;
