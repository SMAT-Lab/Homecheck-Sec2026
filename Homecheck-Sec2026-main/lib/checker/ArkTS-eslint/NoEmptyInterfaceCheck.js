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
exports.NoEmptyInterfaceCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const defaultOptions = {
    allowSingleExtends: false
};
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoEmptyInterfaceCheck');
const gmetaData = {
    severity: 2,
    ruleDocPath: "docs/no-empty-interface.md",
    description: "Disallow the declaration of empty interfaces."
};
class NoEmptyInterfaceCheck {
    metaData = gmetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    classMatcher = {
        file: [this.fileMatcher],
        matcherType: Matchers_1.MatcherTypes.CLASS
    };
    methodMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        class: [this.classMatcher]
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    issueMap = new Map();
    check = (arkFile) => {
        // 将规则选项转换为Options类型
        let options;
        if (this.rule && this.rule.option.length > 0) {
            options = this.rule.option[0];
        }
        else {
            options = defaultOptions;
        }
        this.checkInterfacesInFile(arkFile, this.metaData, options);
        this.reportSortedIssues();
    };
    checkInterfacesInFile(file, metaData, options) {
        const sourceFile = lib_1.AstTreeUtils.getSourceFileFromArkFile(file);
        const emptyInterfaces = [];
        const traverse = (node) => {
            if (lib_1.ts.isInterfaceDeclaration(node) && this.isEmptyInterface(node)) {
                this.handleEmptyInterface(node, file, metaData, sourceFile, emptyInterfaces, options);
            }
            lib_1.ts.forEachChild(node, traverse);
        };
        traverse(sourceFile);
        return emptyInterfaces;
    }
    handleEmptyInterface(node, file, metaData, sourceFile, emptyInterfaces, options) {
        if (node.heritageClauses) {
            // 如果允许单继承且该接口只有一个继承，则不报告问题
            if (options.allowSingleExtends && node.heritageClauses.length === 1 &&
                node.heritageClauses[0].types.length === 1) {
                return;
            }
            this.handleEmptyInterfaceWithHeritage(node, file, metaData, sourceFile, emptyInterfaces, options);
        }
        else {
            this.handleEmptyInterfaceWithoutHeritage(node, file, metaData, sourceFile, emptyInterfaces, options);
        }
    }
    handleEmptyInterfaceWithoutHeritage(node, file, metaData, sourceFile, emptyInterfaces, options) {
        metaData.description = 'An empty interface is equivalent to `{}`.';
        const name = node.name;
        const nodeName = node.getText();
        const pos = node.getStart();
        const end = node.getEnd();
        const text = name.getText();
        const fixText = nodeName;
        const start = name.getStart();
        const position = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, start);
        const line = position.line + 1;
        const character = position.character + 1;
        emptyInterfaces.push({ line, character });
        const defect = this.addIssueReport(file, metaData, { line, character });
        if (fixText && defect) {
            const fix = this.ruleFix(pos, end, fixText);
            this.issueMap.set(defect.fixKey, { defect, fix });
        }
    }
    handleEmptyInterfaceWithHeritage(node, file, metaData, sourceFile, emptyInterfaces, options) {
        metaData.description = 'An interface declaring no members is equivalent to its supertype.';
        const name = node.name;
        const fixText = this.generateFixText(node, node.getText(), name.getText());
        const position = lib_1.ts.getLineAndCharacterOfPosition(sourceFile, name.getStart());
        const line = position.line + 1;
        const character = position.character + 1;
        emptyInterfaces.push({ line, character });
        const defect = this.addIssueReport(file, metaData, { line, character });
        if (fixText && defect) {
            const fix = this.ruleFix(node.getStart(), node.getEnd(), fixText);
            this.issueMap.set(defect.fixKey, { defect, fix });
        }
    }
    generateFixText(node, nodeText, text) {
        let fixText;
        const baseTypes = node.heritageClauses?.map(clause => clause.types).flat() || [];
        for (const baseType of baseTypes) {
            const baseT = baseType.getText();
            if (nodeText.startsWith('export')) {
                fixText = `export type ${text} = ${baseT}`;
            }
            else {
                if (nodeText.includes(`${text}<T>`)) {
                    fixText = `type ${text}<T> = ${baseT}`;
                }
                else {
                    fixText = `type ${text} = ${baseT}`;
                }
            }
        }
        return fixText;
    }
    isEmptyInterface(node) {
        // 如果接口有直接成员，则不是空接口
        if (node.members.length > 0) {
            return false;
        }
        // 获取接口的基类型
        const baseTypes = node.heritageClauses?.map(clause => clause.types).flat() || [];
        // 如果只有一个基类型，认为是空接口
        if (baseTypes.length === 1) {
            return true;
        }
        // 检查所有基类型是否为空接口
        for (const baseType of baseTypes) {
            const baseTypeName = baseType.expression.getText();
            const baseTypeNode = this.findInterfaceNodeByName(baseTypeName, node.getSourceFile());
            if (baseTypeNode && !this.isEmptyInterface(baseTypeNode)) {
                return false;
            }
        }
        // 没有直接成员且所有基类型接口都为空，则当前接口为空
        return true;
    }
    findInterfaceNodeByName(name, sourceFile) {
        function traverse(node) {
            if (lib_1.ts.isInterfaceDeclaration(node) && node.name.getText() === name) {
                return node;
            }
            for (const childNode of node.getChildren()) {
                const result = traverse(childNode);
                if (result) {
                    return result;
                }
            }
            return undefined;
        }
        return traverse(sourceFile);
    }
    ruleFix(pos, end, fixText) {
        return { range: [pos, end], text: fixText };
    }
    reportSortedIssues() {
        if (this.issueMap.size === 0) {
            return;
        }
        const sortedIssues = Array.from(this.issueMap.entries())
            .sort(([keyA], [keyB]) => Index_1.Utils.sortByLineAndColumn(keyA, keyB));
        this.issues = [];
        sortedIssues.forEach(([_, issue]) => {
            DefectsList_1.RuleListUtil.push(issue.defect);
            this.issues.push(issue);
        });
    }
    addIssueReport(arkFile, metaData, lineAndColumn) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(arkFile, lineAndColumn);
        metaData.description = metaData.description;
        if (warnInfo) {
            const filePath = arkFile.getFilePath();
            let defects = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
            this.defects.push(defects);
            return defects;
        }
    }
    getLineAndColumn(arkfile, lineColumn) {
        if (arkfile) {
            const originPath = arkfile.getFilePath();
            return {
                line: lineColumn.line,
                startCol: lineColumn.character,
                endCol: lineColumn.character,
                filePath: originPath
            };
        }
        else {
            logger.debug('arkFile is null');
        }
        return null;
    }
}
exports.NoEmptyInterfaceCheck = NoEmptyInterfaceCheck;
