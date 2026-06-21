"use strict";
/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
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
exports.PreferConstCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const FixUtils_1 = require("../../utils/common/FixUtils");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'PreferConstCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/prefer-const-check.md',
    description: 'is never reassigned. Use \'const\' instead.'
};
class PreferConstCheck {
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
    check = (arkFile) => {
        for (let clazz of arkFile.getClasses()) {
            for (let method of clazz.getMethods()) {
                this.processMethod(method, arkFile);
            }
        }
    };
    processMethod(method, arkFile) {
        for (let stmt of method.getCfg()?.getStmts() ?? []) {
            let scope = stmt.scope;
            if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            let leftOp = stmt.getLeftOp();
            if (!(leftOp instanceof arkanalyzer_1.Local)) {
                continue;
            }
            if (leftOp.getName().includes('%') || leftOp.getName() === 'this') {
                continue;
            }
            if (!this.isVariableModified(leftOp, scope) && !leftOp.getConstFlag()) {
                // 创建issue
                let defect = this.createDefect(arkFile, stmt, leftOp.getName());
                if (!defect) {
                    continue;
                }
                // 创建fix
                let fix = this.createFix(arkFile, stmt, leftOp);
                this.issues.push(new Defects_1.IssueReport(defect, fix));
            }
        }
    }
    isVariableModified(leftOp, scope) {
        for (let def of scope.defList) {
            if (def.getName() !== leftOp.getName()) {
                continue;
            }
            if (def.redefInfo.size !== 0) {
                return true;
            }
            else {
                return false;
            }
        }
        return false;
    }
    createDefect(arkFile, stmt, keyword) {
        const filePath = arkFile.getFilePath();
        let text = stmt.getOriginalText();
        if (!text) {
            return null;
        }
        let originalPosition = stmt.getOriginPositionInfo();
        let lineNum = originalPosition.getLineNo();
        let startColum = originalPosition.getColNo() + text.indexOf(keyword);
        let endColumn = startColum + keyword.length - 1;
        const severity = this.rule.alert ?? this.metaData.severity;
        let description = `\`${keyword}\`` + this.metaData.description;
        return new Defects_1.Defects(lineNum, startColum, endColumn, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
    }
    createFix(arkFile, stmt, leftOp) {
        let text = stmt.getOriginalText();
        if (!text) {
            return undefined;
        }
        let range = this.getRangeBySourceFile(arkFile, text, leftOp.getName());
        let start = FixUtils_1.FixUtils.getRangeStart(arkFile, stmt);
        return { range: [start + range[0], start + range[1]], text: 'const' };
    }
    getRangeBySourceFile(arkFile, code, varName) {
        let stmtAst = arkanalyzer_1.AstTreeUtils.getASTNode(arkFile.getName(), code);
        for (let child of stmtAst.statements) {
            if (!(arkanalyzer_1.ts.isVariableStatement(child))) {
                return [0, 0];
            }
            for (let declaration of child.declarationList.declarations) {
                if (declaration.name.getText() !== varName) {
                    return [0, 0];
                }
                let firstToken = child.getFirstToken();
                if (firstToken) {
                    return [firstToken.getStart(), firstToken.getEnd()];
                }
            }
        }
        return [0, 0];
    }
}
exports.PreferConstCheck = PreferConstCheck;
