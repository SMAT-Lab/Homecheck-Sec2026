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
exports.NoCycleCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoCycleCheck');
let originalFilePath = '';
let projectDir = '';
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/no-cycle-check.md',
    description: 'Cyclic dependency is prohibited. The call chain here is as follows: '
};
class NoCycleCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [matchFileCb];
    }
    /**
     * 循环依赖检测.
     *
     * @param arkFile
     */
    check = (arkFile) => {
        originalFilePath = arkFile.getFilePath();
        projectDir = arkFile.getProjectDir();
        let scene = arkFile.getScene();
        let originalImportInfos = arkFile.getImportInfos();
        let refChainInfo = originalFilePath.substring(projectDir.length, originalFilePath.length);
        let refFileSignatureChain = new Set();
        this.getImportByRecursion(scene, originalImportInfos, refChainInfo, refFileSignatureChain);
    };
    /**
     * 递归获取依赖.
     *
     * @param scene
     * @param importInfos
     * @param refChainInfo
     * @param refFileSignatureChain
     */
    getImportByRecursion(scene, importInfos, refChainInfo, refFileSignatureChain) {
        for (let importInfo of importInfos) {
            let importFilePath = importInfo.getLazyExportInfo()?.getDeclaringArkFile().getFilePath();
            let reportLine = importInfo.getOriginTsPosition().getLineNo();
            let reportColumn = 1;
            let reportEndColumn = reportColumn + importInfo.getTsSourceCode().length;
            refChainInfo = refChainInfo + '%' + reportLine + '%' + reportColumn + '%' + reportEndColumn;
            refChainInfo = refChainInfo + '\n>>' + importFilePath?.substring(projectDir.length, importFilePath.length);
            if (!importFilePath) {
                continue;
            }
            let fileSignature = importInfo.getLazyExportInfo()?.getDeclaringArkFile().getFileSignature() ?? new lib_1.FileSignature('', '');
            let importInfos1 = scene.getFile(fileSignature)?.getImportInfos();
            if (importFilePath === originalFilePath) {
                this.reportIssue(reportLine, reportColumn, reportEndColumn, refChainInfo);
                break;
            }
            else if (refFileSignatureChain.has(fileSignature)) {
                // 说明调用链有其他文件之间的循环依赖，等到查询对应文件时再上报
                continue;
            }
            else {
                if (importInfos1) {
                    refFileSignatureChain.add(fileSignature);
                    this.getImportByRecursion(scene, importInfos1, refChainInfo, refFileSignatureChain);
                }
            }
        }
    }
    /**
     * 拼接issue.
     *
     * @param lineNum
     * @param startColumn
     * @param endColunm
     * @param refChainInfo
     */
    reportIssue(lineNum, startColumn, endColunm, refChainInfo) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let description = this.metaData.description + refChainInfo;
        let defects = new Index_1.Defects(lineNum, startColumn, endColunm, description, severity, this.rule.ruleId, originalFilePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.NoCycleCheck = NoCycleCheck;
