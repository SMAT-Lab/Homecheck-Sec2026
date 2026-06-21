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
exports.MaxLinesCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'MaxLinesCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/max-lines.md',
    description: 'File has too many lines (${actual}). Maximum allowed is ${max}',
};
class Option {
    max;
    skipBlankLines;
    skipComments;
}
class MaxLinesCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    defalutOptions = [{ max: 300, skipBlankLines: true, skipComments: true }];
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
    getOption = () => {
        let option = this.defalutOptions[0];
        if (this.rule && this.rule.option[0]) {
            option = this.rule.option[0];
        }
        return option;
    };
    check = (target) => {
        let sourceCodelines = target.getCode()?.split('\n') ?? [];
        let opt = this.getOption();
        let lines = sourceCodelines.map((text, i) => ({
            lineNUmber: i + 1,
            text
        }));
        /*
         * If file ends with a linebreak, `sourceCodelines` will have one extra empty line at the end.
         * That isn't a real line, so we shouldn't count it.
         */
        if (lines.length > 1 && lines[lines.length - 1].text === '') {
            lines.pop();
        }
        // 忽略空格
        if (opt.skipBlankLines) {
            lines = lines.filter((l) => l.text.trim() !== '');
        }
        // 忽略注释
        if (opt.skipComments) {
            let comments = [];
            let commentLines = [];
            let manyComments = false;
            for (let index = 0; index < lines.length; index++) {
                let l = lines[index];
                if (l.text.trim().startsWith('//')) {
                    comments.push(l);
                    commentLines.push(l.lineNUmber);
                }
                if (l.text.trim().startsWith('/*')) {
                    manyComments = true;
                    comments.push(l);
                    commentLines.push(l.lineNUmber);
                    if (l.text.trim().endsWith('*/')) {
                        manyComments = false;
                    }
                    else {
                        continue;
                    }
                }
                if (l.text.trim().includes('/*')) {
                    manyComments = true;
                    if (l.text.trim().endsWith('*/')) {
                        manyComments = false;
                    }
                    else {
                        continue;
                    }
                }
                if (manyComments) {
                    if (l.text.trim().endsWith('*/')) {
                        manyComments = false;
                    }
                    comments.push(l);
                    commentLines.push(l.lineNUmber);
                }
            }
            lines = lines.filter((l) => !commentLines.includes(l.lineNUmber));
        }
        if (lines.length > opt.max) {
            const loc = {
                start: {
                    line: lines[opt.max].lineNUmber,
                    column: 0
                },
                end: {
                    line: sourceCodelines.length,
                    column: sourceCodelines[sourceCodelines.length - 1].length
                }
            };
            this.addIssueReport(target, loc.start.line, loc.end.column, opt.max, lines.length);
        }
    };
    addIssueReport(arkFile, lineNum, column, max, actual) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let filePath = arkFile.getFilePath();
        let description = `File has too many lines (${actual}). Maximum allowed is ${max}`;
        let defect = new Defects_1.Defects(lineNum, 1, column, description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
}
exports.MaxLinesCheck = MaxLinesCheck;
