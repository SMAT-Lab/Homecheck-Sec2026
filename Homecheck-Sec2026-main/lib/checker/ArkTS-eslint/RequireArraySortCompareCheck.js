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
exports.RequireArraySortCompareCheck = void 0;
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const CheckerUtils_1 = require("../../utils/checker/CheckerUtils");
const Defects_1 = require("../../model/Defects");
const defaultOptions = {
    ignoreStringArrays: true,
};
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'RequireArraySortCompareCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/require-array-sort-compare.md',
    description: `Require 'compare' argument.`,
};
//此规则旨在确保本机排序方法的所有调用都提供 ，同时忽略对用户定义方法的调用
class RequireArraySortCompareCheck {
    metaData = gMetaData;
    SHORT_STR = 'sort';
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Matchers_1.MatcherTypes.CLASS,
    };
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        class: [this.clsMatcher],
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check,
        };
        return [matchBuildCb];
    }
    check = (targetMtd) => {
        const stmts = targetMtd.getBody()?.getCfg().getStmts() ?? [];
        const options = this.rule.option[0];
        const mergedOptions = {
            ...defaultOptions,
            ...options,
        };
        for (const stmt of stmts) {
            const invokeExpr = CheckerUtils_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            const methodSign = invokeExpr.getMethodSignature();
            const methodDetails = invokeExpr;
            const methodName = methodSign.getMethodSubSignature().getMethodName(); //被调用方法名
            const args = invokeExpr.getArgs(); //参数是否为空判断compare函数依据>0;
            const invokeType = methodDetails.base?.type
                ? methodDetails.base.type.toString()
                : ''; //调用方类型
            const invokeObject = methodDetails.base?.type?.classSignature; //是否是对象
            //判断short调用方是否是对象，是否是string数组，short内是否实现compare函数:
            if (methodName === this.SHORT_STR &&
                !invokeObject &&
                this.isRegularArray(invokeType)) {
                if (mergedOptions.ignoreStringArrays) {
                    if (!(args.length > 0 || invokeType.includes('string[]'))) {
                        this.addIssueReport(stmt);
                    }
                }
                else {
                    if (!(args.length > 0)) {
                        this.addIssueReport(stmt);
                    }
                }
            }
        }
    };
    //是否是常规数组
    isRegularArray(type) {
        const regularArrayTypes = [
            'string[]',
            'number[]',
            'any[]',
            'boolean[]',
            'object[]',
            'undefined[]',
            'null[]',
            'Array<any>'
        ];
        //填坑最新ast 解析会将any 类型具体解析
        return regularArrayTypes.includes(type) || type.includes('|');
    }
    addIssueReport(stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt);
        let defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getLineAndColumn(stmt) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            const startCol = originPosition.getColNo();
            const pos = originText.indexOf(this.SHORT_STR);
            if (pos !== -1) {
                const startColOffset = startCol + pos;
                const endCol = startColOffset + this.SHORT_STR.length - 1;
                const originPath = arkFile.getFilePath();
                return { line, startCol, endCol, filePath: originPath };
            }
        }
        else {
            logger.debug('arkFile is null');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.RequireArraySortCompareCheck = RequireArraySortCompareCheck;
