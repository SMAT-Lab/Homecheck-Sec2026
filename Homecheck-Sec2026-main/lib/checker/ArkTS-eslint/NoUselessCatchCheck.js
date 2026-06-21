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
exports.NoUselessCatchCheck = void 0;
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
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUselessCatchCheck');
class NoUselessCatchCheck {
    rule;
    defects = [];
    issues = [];
    filePath = '';
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-useless-catch.md',
        description: 'Disallow unnecessary catch clauses.',
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatcher];
    }
    ;
    check = (target) => {
        this.filePath = target.getFilePath();
        const myInvalidPositions = this.checkAction(target);
        myInvalidPositions.forEach((warnInfo) => {
            this.addIssueReport(warnInfo);
        });
    };
    checkAction(target) {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const warnInfos = [];
        this.traverseAST(sourceFile, warnInfos);
        return warnInfos;
    }
    ;
    traverseAST(node, warnInfos) {
        if (arkanalyzer_1.ts.isCatchClause(node)) {
            this.checkCatchClause(node, warnInfos);
        }
        ;
        arkanalyzer_1.ts.forEachChild(node, (childNode) => this.traverseAST(childNode, warnInfos));
    }
    ;
    checkCatchClause(node, warnInfos) {
        if (node.block.statements.length !== 1) {
            return;
        }
        ;
        const stmt = node.block.statements[0];
        if (!arkanalyzer_1.ts.isThrowStatement(stmt) || !stmt.expression || !arkanalyzer_1.ts.isIdentifier(stmt.expression)) {
            return;
        }
        ;
        const catchVariable = node.variableDeclaration?.name;
        if (!catchVariable || !arkanalyzer_1.ts.isIdentifier(catchVariable) || stmt.expression.text !== catchVariable.text) {
            return;
        }
        ;
        this.addWarningForCatchClause(node, warnInfos);
    }
    ;
    addWarningForCatchClause(node, warnInfos) {
        const parentTryStatement = node.parent;
        if (!arkanalyzer_1.ts.isTryStatement(parentTryStatement)) {
            return;
        }
        ;
        const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(parentTryStatement.finallyBlock ? node.getStart() : parentTryStatement.getStart());
        warnInfos.push({
            message: parentTryStatement.finallyBlock
                ? 'Unnecessary catch clause'
                : 'Unnecessary try/catch wrapper',
            line: line + 1,
            character: character + 1,
            endCol: character + 1 + (parentTryStatement.finallyBlock
                ? node.getWidth()
                : parentTryStatement.getWidth())
        });
    }
    addIssueReport(warnInfo) {
        this.metaData.description = warnInfo.message;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defect = new Index_1.Defects(warnInfo.line, warnInfo.character, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, this.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
}
exports.NoUselessCatchCheck = NoUselessCatchCheck;
