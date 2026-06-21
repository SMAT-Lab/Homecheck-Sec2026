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
exports.InitDeclarationsCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'InitDeclarationsCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/init-declarations.md",
    description: "equire or disallow initialization in variable declarations.",
};
class InitDeclarationsCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    defaultOptions = ['always'];
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
            const filePath = arkFile.getFilePath();
            const asRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
            // 检查变量声明时进行初始化
            const LocationInfos = this.checkInitDeclarations(asRoot);
            // 输出结果
            LocationInfos.forEach(loc => {
                this.addIssueReportNode(loc, filePath);
            });
        }
    };
    checkInitDeclarations(sourceFile) {
        const option = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        const ruleConfig = option[0] ? option[0] : 'always';
        const params = (this.rule && this.rule.option[1]) ? this.rule.option[1] : {};
        const ignoreForLoopInit = params.ignoreForLoopInit;
        const locationInfos = [];
        // 跟踪是否在已声明的命名空间内
        let insideDeclaredNamespace = false;
        const visit = (node) => {
            if (ruleConfig === 'always') {
                if (this.specialTreatment(node)) {
                    return;
                }
                this.checkAlwaysExpression(node, sourceFile, locationInfos);
            }
            else if (ruleConfig === 'never') {
                this.checkNeverExpressionModule(node, sourceFile, locationInfos, insideDeclaredNamespace, ignoreForLoopInit);
            }
            arkanalyzer_1.ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return locationInfos;
    }
    specialTreatment(node) {
        // 检测是否是 declare namespace
        if (arkanalyzer_1.ts.isModuleDeclaration(node)) {
            const { name, flags } = node;
            if (name && arkanalyzer_1.ts.isIdentifier(name) && (flags & arkanalyzer_1.ts.NodeFlags.Namespace) && this.isDeclare(node)) {
                return true; // 如果是 declare namespace，则跳过
            }
            if (name && name.text === 'global' && this.isDeclare(node)) {
                return true; // 如果是 declare global，则跳过
            }
        }
        // 使用类型守卫确保 node 是 VariableDeclarationList 类型
        if (arkanalyzer_1.ts.isVariableDeclarationList(node)) {
            // 检查父节点是否为声明文件或 declare 声明
            const parentNode = node.parent;
            if (this.isDeclare(parentNode)) {
                return true; // 如果是 declare 声明，则跳过
            }
        }
        return false;
    }
    checkAlwaysExpression(node, sourceFile, locationInfos) {
        if (!arkanalyzer_1.ts.isVariableDeclarationList(node)) {
            return;
        }
        node.declarations.forEach((declarator) => {
            if (arkanalyzer_1.ts.isForInStatement(declarator.parent?.parent) || arkanalyzer_1.ts.isForOfStatement(declarator.parent?.parent) ||
                arkanalyzer_1.ts.isForStatement(declarator.parent?.parent)) {
                return;
            }
            if (!declarator.initializer) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(declarator.getStart());
                locationInfos.push({
                    fileName: sourceFile.fileName,
                    line: line + 1,
                    character: character + 1,
                    description: `Variable '${declarator.name.getText()}' should be initialized on declaration.`
                });
            }
        });
    }
    checkNeverExpressionModule(node, sourceFile, locationInfos, insideDeclaredNamespace, ignoreForLoopInit) {
        // 检查是否是命名空间声明
        if (arkanalyzer_1.ts.isModuleDeclaration(node)) {
            const moduleDecl = node;
            if (moduleDecl.flags & arkanalyzer_1.ts.NodeFlags.Namespace) {
                insideDeclaredNamespace = true;
            }
        }
        this.checkNeverExpression(node, sourceFile, locationInfos, insideDeclaredNamespace, ignoreForLoopInit);
        // 退出命名空间
        if (arkanalyzer_1.ts.isModuleDeclaration(node)) {
            const moduleDecl = node;
            if (moduleDecl.flags & arkanalyzer_1.ts.NodeFlags.Namespace) {
                insideDeclaredNamespace = false;
            }
        }
    }
    checkNeverExpression(node, sourceFile, locationInfos, insideDeclaredNamespace, ignoreForLoopInit) {
        if (this.isForLoop(node) && !insideDeclaredNamespace) {
            this.checkIsForLoop(node, sourceFile, locationInfos, ignoreForLoopInit);
        }
        // 检查变量声明
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.VariableStatement && !insideDeclaredNamespace) {
            const varStatement = node;
            const declarations = varStatement.declarationList.declarations;
            const isConst = (varStatement.declarationList.flags & arkanalyzer_1.ts.NodeFlags.Const) !== 0;
            // 检查是否在for循环中
            const isInForLoop = varStatement.parent && this.isForLoop(varStatement.parent);
            if (isInForLoop && ignoreForLoopInit) {
                return;
            }
            for (const declaration of declarations) {
                const id = declaration.name;
                const initialized = Boolean(declaration.initializer);
                let description = '';
                if (!isConst && initialized) {
                    description = `Variable '${id.getText()}' should not be initialized on declaration.`;
                }
                if (id.kind === arkanalyzer_1.ts.SyntaxKind.Identifier && description) {
                    const position = id.getSourceFile().getLineAndCharacterOfPosition(id.getStart());
                    locationInfos.push({
                        fileName: sourceFile.fileName,
                        line: position.line + 1,
                        character: position.character + 1,
                        description
                    });
                }
            }
        }
    }
    /**
     * 检查节点是否为循环语句
     * @param node 要检查的节点
     * @returns 是否为循环语句
     */
    isForLoop(node) {
        return (node.kind === arkanalyzer_1.ts.SyntaxKind.ForInStatement ||
            node.kind === arkanalyzer_1.ts.SyntaxKind.ForOfStatement ||
            node.kind === arkanalyzer_1.ts.SyntaxKind.ForStatement);
    }
    checkIsForLoop(node, sourceFile, locationInfos, ignoreForLoopInit) {
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.ForStatement) {
            this.checkIsForStatement(node, sourceFile, locationInfos, ignoreForLoopInit);
        }
        // 处理 ForInStatement 和 ForOfStatement
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.ForInStatement || node.kind === arkanalyzer_1.ts.SyntaxKind.ForOfStatement) {
            this.checkIsForOfInStatement(node, sourceFile, locationInfos, ignoreForLoopInit);
        }
    }
    checkIsForOfInStatement(node, sourceFile, locationInfos, ignoreForLoopInit) {
        let initializer;
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.ForInStatement) {
            const forInStatement = node;
            if (forInStatement.initializer &&
                forInStatement.initializer.kind === arkanalyzer_1.ts.SyntaxKind.VariableDeclarationList) {
                initializer = forInStatement.initializer;
            }
        }
        else {
            const forOfStatement = node;
            if (forOfStatement.initializer &&
                forOfStatement.initializer.kind === arkanalyzer_1.ts.SyntaxKind.VariableDeclarationList) {
                initializer = forOfStatement.initializer;
            }
        }
        if (initializer) {
            const declarations = initializer.declarations;
            const isConst = (initializer.flags & arkanalyzer_1.ts.NodeFlags.Const) !== 0;
            for (const declaration of declarations) {
                const id = declaration.name;
                let description = '';
                if (!isConst && !ignoreForLoopInit) {
                    description = `Variable '${id.getText()}' should not be initialized on declaration.`;
                }
                if (id.kind === arkanalyzer_1.ts.SyntaxKind.Identifier && description) {
                    const position = id.getSourceFile().getLineAndCharacterOfPosition(id.getStart());
                    locationInfos.push({
                        fileName: sourceFile.fileName,
                        line: position.line + 1,
                        character: position.character + 1,
                        description
                    });
                }
            }
        }
    }
    checkIsForStatement(node, sourceFile, locationInfos, ignoreForLoopInit) {
        const forStatement = node;
        if (forStatement.initializer &&
            forStatement.initializer.kind === arkanalyzer_1.ts.SyntaxKind.VariableDeclarationList) {
            const declarationList = forStatement.initializer;
            const declarations = declarationList.declarations;
            const isConst = (declarationList.flags & arkanalyzer_1.ts.NodeFlags.Const) !== 0;
            for (const declaration of declarations) {
                const id = declaration.name;
                const initialized = Boolean(declaration.initializer);
                let description = '';
                if (!isConst && initialized && !ignoreForLoopInit) {
                    description = `Variable '${id.getText()}' should not be initialized on declaration.`;
                }
                if (id.kind === arkanalyzer_1.ts.SyntaxKind.Identifier && description) {
                    const position = id.getSourceFile().getLineAndCharacterOfPosition(id.getStart());
                    locationInfos.push({
                        fileName: sourceFile.fileName,
                        line: position.line + 1,
                        character: position.character + 1,
                        description
                    });
                }
            }
        }
    }
    hasModifiers(node) {
        return 'modifiers' in node;
    }
    isDeclare(node) {
        if (this.hasModifiers(node)) {
            return !!arkanalyzer_1.ts.getModifiers(node)?.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.DeclareKeyword);
        }
        // 特别处理 ModuleDeclaration 节点
        if (arkanalyzer_1.ts.isModuleDeclaration(node)) {
            // 检查是否有 'declare' 修饰符
            if (this.hasModifiers(node)) {
                return !!arkanalyzer_1.ts.getModifiers(node)?.some(modifier => modifier.kind === arkanalyzer_1.ts.SyntaxKind.DeclareKeyword);
            }
        }
        return false;
    }
    addIssueReportNode(info, filePath) {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (info.description) {
            this.metaData.description = info.description;
        }
        let defect = new Defects_1.Defects(info.line, info.character, info.character, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.InitDeclarationsCheck = InitDeclarationsCheck;
