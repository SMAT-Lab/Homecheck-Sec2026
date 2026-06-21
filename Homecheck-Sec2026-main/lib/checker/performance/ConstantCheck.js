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
exports.ConstantCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const Matchers_1 = require("../../matcher/Matchers");
const CheckerStorage_1 = require("../../utils/common/CheckerStorage");
const Defects_1 = require("../../model/Defects");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_2 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ConstantCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/constant-check.md',
    description: 'Variables that are not changed should be declared as "const".'
};
class ConstantCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (targetFile) => {
        let firstScope = CheckerStorage_1.CheckerStorage.getInstance().getScope(targetFile.getFilePath());
        if (firstScope === undefined) {
            logger.warn('Scope is undefined.');
            return;
        }
        let scope = [firstScope];
        this.scopeListProcess(scope);
    };
    isConst(stmt) {
        const text = stmt.getOriginalText();
        if (text && text.length !== 0) {
            if (text.includes('const')) {
                return true;
            }
        }
        else {
            logger.warn('Get origin text failed, line = ' + stmt.getOriginPositionInfo());
        }
        return false;
    }
    scopeListProcess(scopeList) {
        for (let scope of scopeList) {
            for (let variable of scope.defList) {
                let def = variable.defStmt.getDef();
                if (!(def instanceof lib_1.Local) || def.getName().includes('%')) {
                    continue;
                }
                if (!this.isConst(variable.defStmt) && variable.redefInfo.size === 0) {
                    this.addIssueReport(variable);
                }
            }
            if (scope.childScopeList.length !== 0) {
                this.scopeListProcess(scope.childScopeList);
            }
        }
    }
    addIssueReport(variable) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(variable, variable.defStmt.getOriginPositionInfo().getLineNo());
        let defects = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_2.IssueReport(defects, undefined));
    }
    getLineAndColumn(variable, tsLine) {
        const arkFile = variable.defStmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        const originText = variable.defStmt.getOriginalText();
        if (arkFile && originText && originText.length !== 0) {
            const pos = originText.indexOf(' ' + variable.getName());
            if (pos !== -1) {
                const startCol = variable.defStmt.getOriginPositionInfo().getColNo() + pos + 1;
                const endCol = startCol + variable.getName().length - 1;
                const originPath = arkFile.getFilePath();
                return { line: tsLine, startCol: startCol, endCol: endCol, filePath: originPath };
            }
        }
        else {
            logger.warn('Get originStmt failed.');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.ConstantCheck = ConstantCheck;
