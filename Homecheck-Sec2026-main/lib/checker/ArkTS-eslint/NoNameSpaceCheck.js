"use strict";
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
exports.NoNameSpaceCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoNameSpaceCheck');
class NoNameSpaceCheck {
    issues = [];
    defaultOptions = [
        {
            allowDeclarations: false,
            allowDefinitionFiles: true,
        },
    ];
    rule;
    defects = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-namespace.md',
        description: 'ES2015 module syntax is preferred over namespaces.',
    };
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    check = (target) => {
        if (target) {
            const filePath = target.getFilePath();
            let map = new Map();
            if (filePath.endsWith(".ts")) {
                const namespaces = target.getAllNamespacesUnderThisFile();
                namespaces.forEach(namespace => {
                    this.executeCheck(namespace, target, false, map);
                });
                this.excuteReport(map, target);
            }
        }
    };
    excuteReport(map, target) {
        map.forEach(v => {
            if (!v.isDeclare || !this.getOption()[0].allowDeclarations) {
                const col = v.text.startsWith('export ') ? v.col + 7 : v.col;
                this.addIssueReport(target, v.line, col);
            }
        });
    }
    executeCheck(namespaces, target, parentIsDeclare, map) {
        const codes = namespaces.getCodes();
        const lineCols = namespaces.getLineColPairs();
        const innerNamespaces = namespaces.getNamespaces();
        for (let j = 0; j < codes.length; j++) {
            const line = lineCols[j][0];
            const col = lineCols[j][1];
            const key = `${line}:${col}`;
            const value = {
                line: line, col: col, isDeclare: false, text: codes[j]
            };
            let str = codes[j].trim();
            const index = str.indexOf('{');
            let name = '';
            if (index < 0) {
                if (str.endsWith(';')) {
                    name = str.substring(0, str.length - 1).trim();
                }
                else {
                    name = str;
                }
            }
            else {
                name = str.substring(0, str.indexOf('{')).trim();
            }
            if (!name.endsWith(`'`) && !name.endsWith('global')) {
                value.isDeclare = this.isDeclare(str) || parentIsDeclare;
                if (!map.has(key) || !map.get(key)?.isDeclare) {
                    map.set(key, value);
                }
            }
            this.checkChild(innerNamespaces, line, codes, j, lineCols, target, str, parentIsDeclare, map);
        }
    }
    checkChild(innerNamespaces, line, codes, j, lineCols, target, str, parentIsDeclare, map) {
        innerNamespaces.forEach((innerNamespace, index) => {
            const lcs = innerNamespace.getLineColPairs();
            const l = lcs[0][0];
            if (l >= line) {
                this.checkLine(codes, j, lineCols, index, l, innerNamespace, target, str, parentIsDeclare, map);
            }
        });
    }
    checkLine(codes, j, lineCols, index, l, innerNamespace, target, str, parentIsDeclare, map) {
        const isNotLast = codes.length - 1 > j;
        if (isNotLast) {
            const lastl = lineCols[index + 1][0];
            if (l < lastl) {
                this.executeCheck(innerNamespace, target, this.isDeclare(str) || parentIsDeclare, map);
            }
        }
        else {
            this.executeCheck(innerNamespace, target, this.isDeclare(str) || parentIsDeclare, map);
        }
    }
    isDeclare(str) {
        return str.startsWith('declare') || str.startsWith('export declare');
    }
    addIssueReport(target, line, col) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line, col, col, this.metaData.description, severity, this.rule.ruleId, target.getFilePath(), this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getOption() {
        let option;
        if (this.rule && this.rule.option) {
            option = this.rule.option;
            if (option[0]) {
                if (!option[0]?.allowDeclarations) {
                    option[0].allowDeclarations = false;
                }
                if (!option[0]?.allowDefinitionFiles) {
                    option[0].allowDefinitionFiles = true;
                }
                return option;
            }
        }
        return this.defaultOptions;
    }
}
exports.NoNameSpaceCheck = NoNameSpaceCheck;
