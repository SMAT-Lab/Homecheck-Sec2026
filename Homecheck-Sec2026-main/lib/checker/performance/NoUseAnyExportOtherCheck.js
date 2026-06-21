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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoUseAnyExportOtherCheck = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const path_1 = __importDefault(require("path"));
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUseAnyExportOtherCheck');
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/no-use-any-export-other-check.md',
    description: 'Do not use export * to export types and data defined in the other module.'
};
class NoUseAnyExportOtherCheck {
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
        this.processExportInfos(arkFile, arkFile.getExportInfos());
        for (const namespace of arkFile.getAllNamespacesUnderThisFile()) {
            this.processExportInfos(arkFile, namespace.getExportInfos());
        }
    };
    processExportInfos(arkFile, exportInfos) {
        for (let exportInfo of exportInfos) {
            let clauseName = exportInfo.getExportClauseName();
            let nameBeforeAs = exportInfo.getNameBeforeAs();
            let exportFrom = exportInfo.getFrom();
            if (!exportFrom) {
                continue;
            }
            let exportName = path_1.default.basename(exportFrom);
            let fileName = path_1.default.basename(arkFile.getFilePath()).replace(/.ets|.ts$/gi, '');
            if ((clauseName === '*' || nameBeforeAs === '*') && exportName !== fileName) {
                this.reportIssue(arkFile, exportInfo);
            }
        }
    }
    reportIssue(arkFile, exportInfo) {
        let arkFilePath = arkFile.getFilePath();
        let text = exportInfo.getTsSourceCode();
        let originPosition = exportInfo.getOriginTsPosition();
        let lineNum = originPosition.getLineNo();
        let startColumn = originPosition.getColNo();
        let endColumn = startColumn + text.length - 1;
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Defects_1.Defects(lineNum, startColumn, endColumn, this.metaData.description, severity, this.rule.ruleId, arkFilePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.NoUseAnyExportOtherCheck = NoUseAnyExportOtherCheck;
