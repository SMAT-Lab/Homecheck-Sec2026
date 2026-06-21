"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferNamespaceKeywordCheck = void 0;
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
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/prefer-namespace-keyword.md',
    description: "Use 'namespace' instead of 'module' to declare custom TypeScript modules.",
};
class PreferNamespaceKeywordCheck {
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
    check = (arkFile) => {
        const isTsFile = this.isTsFile(arkFile.getFilePath());
        if (!isTsFile) {
            return;
        }
        ;
        const namespaces = arkFile.getNamespaces();
        if (!namespaces)
            return;
        let astRoot = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        for (let child of astRoot.statements) {
            if (arkanalyzer_1.ts.isModuleDeclaration(child)) {
                this.processModuleDeclaration(child, arkFile, astRoot, false);
            }
            ;
        }
        ;
    };
    processModuleDeclaration(node, arkFile, astRoot, moduleBlock) {
        const isInternalModule = arkanalyzer_1.ts.isIdentifier(node.name); // 内部模块名称是标识符
        const isExternalModule = arkanalyzer_1.ts.isStringLiteral(node.name); // 外部模块名称是字符串字面量
        if (isExternalModule) { // 外部模块声明，不需要处理
            return;
        }
        ;
        if (isInternalModule) {
            let text = node.getText();
            if (moduleBlock) {
                text = node.getFullText();
            }
            ;
            if (arkanalyzer_1.ts.isModuleDeclaration(node) || moduleBlock) {
                const moduleTokens = Array.from(node.getChildren());
                const moduleKeywordNode = moduleTokens.find(token => token.kind === arkanalyzer_1.ts.SyntaxKind.ModuleKeyword);
                if (moduleKeywordNode && moduleKeywordNode.getText() === "module") {
                    // 创建缺陷报告和修复建议
                    let sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
                    const originTsPosition = arkanalyzer_1.LineColPosition.buildFromNode(node, sourceFile);
                    let defect = this.createDefect(arkFile, originTsPosition, text, moduleBlock);
                    const fixKeyword = "namespace";
                    let ruleFix = this.createFix(moduleKeywordNode, fixKeyword);
                    this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
                }
                ;
            }
            ;
        }
        ;
        // 递归处理嵌套的模块声明
        if (node.body && arkanalyzer_1.ts.isModuleBlock(node.body)) {
            for (const statement of node.body.statements) {
                if (arkanalyzer_1.ts.isModuleDeclaration(statement)) {
                    this.processModuleDeclaration(statement, arkFile, astRoot, true);
                }
                ;
            }
            ;
        }
        ;
    }
    ;
    createDefect(arkFile, originTsPosition, keyword, moduleBlock) {
        if (moduleBlock) {
            const containsNewline = keyword.includes('\r\n') || keyword.includes('\n');
            if (containsNewline) {
                keyword = keyword.replace('\r\n', '').replace('\n', '');
            }
            ;
        }
        ;
        const filePath = arkFile.getFilePath();
        let lineNum = originTsPosition.getLineNo();
        let startColum = keyword.indexOf("module") + 1;
        let endColumn = startColum + "module".length;
        if (keyword.includes("declare")) {
            startColum = keyword.indexOf("declare") + 1;
            endColumn = keyword.indexOf("module") + "declare".length;
        }
        ;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(lineNum, startColum, endColumn, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.defects.push(defect);
        DefectsList_1.RuleListUtil.push(defect);
        return defect;
    }
    ;
    createFix(child, code) {
        return { range: [child.getStart(), child.getEnd()], text: code };
    }
    ;
    isTsFile(filePath) {
        return filePath.toLowerCase().endsWith('.ts');
    }
    ;
}
exports.PreferNamespaceKeywordCheck = PreferNamespaceKeywordCheck;
;
