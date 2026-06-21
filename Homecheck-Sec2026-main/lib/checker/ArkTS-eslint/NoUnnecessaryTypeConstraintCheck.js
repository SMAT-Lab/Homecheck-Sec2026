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
exports.NoUnnecessaryTypeConstraintCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ForeachArgsCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/no-unnecessary-type-constraint.md",
    description: "Disallow unnecessary constraints on generic types"
};
class NoUnnecessaryTypeConstraintCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Matchers_1.MatcherTypes.CLASS,
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.clsMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (targetClass) => {
        const severity = this.rule.alert ?? this.metaData.severity;
        if (!this.getFileExtension(targetClass.getDeclaringArkFile().getName(), 'ts')) {
            return;
        }
        if (targetClass.getCode()) {
            let genericDeclaration = this.getGenericDeclaration(targetClass.getCode() ?? '');
            if (genericDeclaration.text) {
                this.reportIssue(targetClass.getDeclaringArkFile(), targetClass.getLine() ?? 0, targetClass.getColumn() ?? 0, genericDeclaration.text, genericDeclaration.message, severity);
            }
        }
        for (let method of targetClass.getMethods()) {
            this.processArkMethod(method, severity);
        }
    };
    processArkMethod(method, severity) {
        if (method.getCode()) {
            let genericDeclaration = this.getGenericDeclaration(method.getCode() ?? '');
            if (genericDeclaration.text) {
                if (method.getColumn() !== null && method.getLine() !== null) {
                    this.reportIssue(method.getDeclaringArkFile(), method.getLine() ?? 0, method.getColumn() ?? 0, genericDeclaration.text, genericDeclaration.message, severity);
                }
            }
        }
        this.processAliasTypes(method, severity);
        this.processStatements(method, severity);
    }
    processAliasTypes(method, severity) {
        const aliasTypeMap = method.getBody()?.getAliasTypeMap() ?? [];
        for (let aliasType of aliasTypeMap) {
            aliasType.forEach((generic) => {
                this.processGenericArray(generic, method, severity);
            });
        }
    }
    processGenericArray(generic, method, severity) {
        if (generic instanceof Array) {
            generic.forEach((genericType) => {
                this.checkGenericType(genericType, method, severity);
            });
        }
    }
    checkGenericType(genericType, method, severity) {
        if (genericType instanceof arkanalyzer_1.ArkAliasTypeDefineStmt) {
            const genericDeclaration = this.getGenericDeclaration(genericType.getOriginalText() ?? '');
            if (genericDeclaration.text) {
                this.reportIssue(method.getDeclaringArkFile(), genericType.getOriginPositionInfo().getLineNo() ?? 0, genericType.getOriginPositionInfo().getColNo() ?? 0, genericDeclaration.text, genericDeclaration.message, severity);
            }
        }
    }
    processStatements(method, severity) {
        const stmts = method.getBody()?.getCfg()?.getStmts() ?? [];
        for (let stmt of stmts) {
            if (stmt.getOriginalText()) {
                const genericDeclaration = this.getGenericDeclaration(stmt.getOriginalText() ?? '');
                if (genericDeclaration.text) {
                    this.reportIssue(method.getDeclaringArkFile(), stmt.getOriginPositionInfo().getLineNo() ?? 0, stmt.getOriginPositionInfo().getColNo() ?? 0, genericDeclaration.text, genericDeclaration.message, severity);
                }
            }
        }
    }
    getFileExtension(filePath, filetype) {
        const match = filePath.match(/\.([0-9a-zA-Z]+)$/);
        if (match) {
            const extension = match[1];
            return extension === filetype;
        }
        return false;
    }
    getGenericDeclaration(str) {
        let match = str.match(/^[^({]*/);
        let result = match ? match[0] : str;
        const regex = /<\w+\s+extends\s+(any|unknown)>/;
        const genericTypeRegex = /<(\w+)\s+extends\s+(\w+)>/;
        const matchType = result.match(genericTypeRegex);
        let genericParam = '';
        let typeConstraint = '';
        if (matchType && matchType.length >= 3) {
            genericParam = matchType[1] || '';
            typeConstraint = matchType[2] || '';
        }
        return {
            message: `Constraining the generic type \`${genericParam}\` to \`${typeConstraint}\` does nothing and is unnecessary.`,
            text: regex.test(result) ? result : '',
        };
    }
    reportIssue(arkFile, lineNum, colum, text, message, severity) {
        if (arkFile) {
            let startColum = colum + text.indexOf('<') + 1;
            let endColum = colum + text.indexOf('>');
            const filePath = arkFile.getFilePath();
            let defect = new Defects_1.Defects(lineNum, startColum, endColum, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defect, undefined));
            DefectsList_1.RuleListUtil.push(defect);
        }
        else {
            logger.debug('originStmt or arkFile is null');
        }
    }
}
exports.NoUnnecessaryTypeConstraintCheck = NoUnnecessaryTypeConstraintCheck;
