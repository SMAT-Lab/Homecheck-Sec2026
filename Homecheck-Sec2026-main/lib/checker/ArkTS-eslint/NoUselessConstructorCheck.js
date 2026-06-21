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
exports.NoUselessConstructorCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUselessConstructorCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/no-useless-constructor.md',
    description: 'Useless constructor.',
};
const constructorIndexReg = /\bconstructor\s*\(/;
const codeArgReg = /^...\s*/;
const modifierRegex = /\b(readonly|private|public|protected)\b/;
//不必要的构造函数包括：空的构造函数，或者构造函数中直接执行父类构造函数的逻辑。
class NoUselessConstructorCheck {
    metaData = gMetaData;
    constructor_ = 'constructor';
    super_ = 'super';
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Matchers_1.MatcherTypes.CLASS,
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.clsMatcher,
            callback: this.check,
        };
        return [matchBuildCb];
    }
    check = (targetArkClass) => {
        const severity = this.rule.alert ?? this.metaData.severity;
        this.arkClassProcess(targetArkClass, severity);
    };
    arkClassProcess(arkClass, severity) {
        const arkMeths = arkClass.getMethods();
        const superClassName = arkClass.getSuperClassName();
        for (const arkMethod of arkMeths) {
            const argsrt = arkMethod.getParameters();
            const code = arkMethod.getCode() ?? '';
            //不是构造方法直接跳过 
            const isConstructor = this.checkAccessibilityConstructor(code, superClassName);
            if (!isConstructor || (isConstructor && this.srgUsedModifiers(code, argsrt))) {
                continue;
            }
            let args = arkMethod.getParameters().map((param) => param.getName()); //由于构造函数的特殊性可以用长度推算出stmt的长度
            const stmts = arkMethod.getBody()?.getCfg().getStmts() ?? [];
            let lineCode = arkMethod.getLine() ?? 0;
            let lineColCode = arkMethod.getColumn() ?? 0;
            //记录构造方法头
            const headConstructStmt = stmts[0];
            const arkFilePath = arkMethod.getDeclaringArkFile().getFilePath();
            this.modifyArrayStmts(stmts, args.length); //获取构造方法内逻辑-----args.length为参数赋值stmts
            //1.构造函数方法体为空 && 没有继承其它class 2.迎合最新版去除参数条件
            if (stmts.length === 0 && superClassName === '') {
                this.addIssueReport_01([lineCode, lineColCode, code], arkFilePath, this.constructor_, severity);
                continue;
            }
            // 调用方法：
            let { stmtsNumber, superStmt, superaArgs } = this.getStartStmtNumber(stmts, headConstructStmt);
            //2.当只有super()并且都无参数 或者 参数相同(明字+数量)----->无奈之举:无法获到usedStmts[]
            if (stmts.length === 1 && stmtsNumber === 0) {
                //判断(明字+数量)---->明确条件逻辑拆分
                const arraysAreEqual = (arr1, arr2) => JSON.stringify(arr1.sort()) === JSON.stringify(arr2.sort());
                if (superaArgs.length === 0 && args.length === 0) {
                    this.addIssueReport_01([lineCode, lineColCode, code], arkFilePath, this.constructor_, severity);
                }
                if (superaArgs.length > 0 &&
                    superaArgs.length === args.length &&
                    arraysAreEqual(superaArgs, args)) {
                    this.addIssueReport_01([lineCode, lineColCode, code], arkFilePath, this.constructor_, severity);
                }
            }
        }
    }
    //判断构造方法参数是否是被 public private protect修饰
    srgUsedModifiers(text, args) {
        const modifer = ['public', 'private', 'protected'];
        const argsNum = args.length;
        if (argsNum > 0) {
            const textreplace = text.replace(' ', '');
            const startIndex = textreplace.indexOf('constructor(');
            const lastName = args[argsNum - 1].getName();
            const lastArgName = lastName === 'ArrayBindingPattern' ? args[argsNum - 1].getArrayElements()[0].getName() : lastName;
            const lastIndex = text.lastIndexOf(lastArgName);
            const subString = text.substring(startIndex, lastIndex);
            return modifierRegex.test(subString);
        }
        return false;
    }
    //判定是否是符合要求的构造方法名
    checkAccessibilityConstructor(text, superClassname) {
        const constructorIndex = text.search(constructorIndexReg);
        if (constructorIndex === -1 || constructorIndex > 15) {
            return false;
        }
        const startString = text.substring(0, constructorIndex).trim();
        switch (startString) {
            case 'protected':
            case 'private':
                return false;
            case 'public':
                if (superClassname !== '') {
                    return false;
                }
                break;
        }
        return true;
    }
    // 获取构造方法体内的stmts和构造方法内的参数stmts
    modifyArrayStmts(arr, countToRemove) {
        // 确保 countToRemove 合理
        if (countToRemove < 0) {
            return arr;
        }
        // 删除前 countToRemove + 1 个元素
        arr.splice(0, countToRemove + 1);
        // 删除最后两个元素（如果数组长度允许）
        arr.length = Math.max(0, arr.length - 2);
        return arr; // 返回修改后的数组
    }
    //是否是执行语句
    getInvokeExprFromStmt(stmt) {
        if (stmt instanceof lib_1.ArkInvokeStmt) {
            return stmt.getInvokeExpr();
        }
        else if (stmt instanceof lib_1.ArkAssignStmt) {
            const rightOp = stmt.getRightOp();
            if (rightOp instanceof lib_1.AbstractInvokeExpr) {
                return rightOp;
            }
        }
        return null;
    }
    addIssueReport(stmt, name, severity) {
        const warnInfo = this.getLineAndColumn(stmt, name);
        if (warnInfo.line > 0) {
            const defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defect, undefined));
            DefectsList_1.RuleListUtil.push(defect);
        }
    }
    addIssueReport_01(linePos, filePath, name, severity) {
        const warnInfo = this.getLineAndColumnMethod(linePos, filePath, name);
        if (warnInfo.line > 0) {
            const defect = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defect, undefined));
            DefectsList_1.RuleListUtil.push(defect);
        }
    }
    getLineAndColumn(stmt, name) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            let startCol = originPosition.getColNo();
            const pos = originText.indexOf(name);
            if (pos !== -1) {
                startCol += pos;
                const endCol = startCol + name.length - 1;
                const originPath = arkFile.getFilePath();
                return { line, startCol, endCol, filePath: originPath };
            }
        }
        else {
            logger.debug('originStmt or arkFile is null');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
    getLineAndColumnMethod(linePos, arkFilePath, name) {
        const line = linePos[0];
        if (arkFilePath) {
            let startCol = linePos[1];
            const pos = linePos[2].indexOf(name);
            if (pos !== -1) {
                startCol += pos;
                const endCol = startCol + name.length - 1;
                const originPath = arkFilePath;
                return { line, startCol, endCol, filePath: originPath };
            }
        }
        else {
            logger.debug('originStmt or arkFile is null');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
    getStartStmtNumber(stmts, headConstructStmt) {
        let stmtsNumber = 0;
        let superStmt = headConstructStmt;
        let superaArgs = [];
        for (const stmt of stmts) {
            const invokeExpr = this.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                stmtsNumber++;
                continue;
            }
            const methodSign = invokeExpr.getMethodSignature();
            const methodName = methodSign.getMethodSubSignature().getMethodName();
            const args = invokeExpr.getArgs();
            if (methodName === this.super_) {
                superStmt = stmt;
                for (const arg of args) {
                    let argcode = arg.toString().replace(codeArgReg, '');
                    superaArgs.push(argcode);
                }
                break;
            }
            stmtsNumber++;
        }
        return { stmtsNumber, superStmt, superaArgs };
    }
}
exports.NoUselessConstructorCheck = NoUselessConstructorCheck;
