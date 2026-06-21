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
exports.ForeachIndexCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ForeachIndexCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/foreach-index-check.md',
    description: 'For a sound rendering performance, avoid using the index as the return value or part of the return value for the keyGenerator parameter of ForEach.'
};
class ForeachIndexCheck {
    metaData = gMetaData;
    FOREACH_STR = 'ForEach';
    CREAER_STR = 'create';
    supportFileType = ['.ets'];
    rule;
    defects = [];
    issues = [];
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
        category: [ArkClass_1.ClassCategory.STRUCT]
    };
    buildMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        class: [this.clsMatcher],
        name: ['build']
    };
    builderMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        decorators: ['Builder']
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        const matchBuilderCb = {
            matcher: this.builderMatcher,
            callback: this.check
        };
        return [matchBuildCb, matchBuilderCb];
    }
    check = (targetMtd) => {
        const stmts = targetMtd.getBody()?.getCfg().getStmts() ?? [];
        for (const stmt of stmts) {
            const invokeExpr = Index_1.CheckerUtils.getInvokeExprFromStmt(stmt);
            if (!invokeExpr) {
                continue;
            }
            const methodSign = invokeExpr.getMethodSignature();
            const className = methodSign.getDeclaringClassSignature().getClassName();
            const methodName = methodSign.getMethodSubSignature().getMethodName();
            const argsNum = invokeExpr.getArgs().length;
            if (className === this.FOREACH_STR && methodName === this.CREAER_STR && argsNum === 3 &&
                this.checkIndexArg(invokeExpr.getArgs(), targetMtd.getDeclaringArkFile().getScene())) {
                this.addIssueReport(stmt);
            }
        }
    };
    checkIndexArg(args, scene) {
        const keyType = args[2].getType();
        if (keyType instanceof arkanalyzer_1.FunctionType) {
            const keyGenerator = scene.getMethod(keyType.getMethodSignature());
            if (!keyGenerator) {
                return false;
            }
            const params = keyGenerator.getParameters();
            if (params.length === 2) {
                return this.checkIndexUsedInBody(keyGenerator, params[1].getName());
            }
            else {
                const itemType = args[1].getType();
                if (itemType instanceof arkanalyzer_1.FunctionType) {
                    return scene.getMethod(itemType.getMethodSignature())?.getParameters().length === 2;
                }
            }
        }
        return false;
    }
    checkIndexUsedInBody(keyGenerator, targeName) {
        for (const stmt of keyGenerator.getCfg()?.getStmts() ?? []) {
            if (stmt instanceof arkanalyzer_1.ArkReturnStmt) {
                const op = stmt.getOp();
                if (op instanceof arkanalyzer_1.Local && this.isUsedIndexInLocal(op, stmt, targeName)) {
                    return true;
                }
                else if (op instanceof arkanalyzer_1.AbstractInvokeExpr && this.isUsedIndexInInvokeExpr(op, stmt, targeName)) {
                    return true;
                }
            }
        }
        return false;
    }
    isUsedIndexInLocal(op, curStmt, targeName) {
        if (op.getName().includes('%')) {
            const defStmt = op.getDeclaringStmt();
            if (!defStmt || !(defStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                return false;
            }
            const rightOp = defStmt.getRightOp();
            if (rightOp instanceof arkanalyzer_1.Local) {
                return this.isUsedIndexInLocal(rightOp, defStmt, targeName);
            }
            else if (rightOp instanceof arkanalyzer_1.ArkNormalBinopExpr) {
                return this.isUsedIndexInBinop(rightOp, defStmt, targeName);
            }
            else if (rightOp instanceof arkanalyzer_1.AbstractInvokeExpr) {
                return this.isUsedIndexInInvokeExpr(rightOp, defStmt, targeName);
            }
        }
        else {
            if (op.getName() === targeName && !this.isVarDefInScope(targeName, curStmt.scope)) {
                return true;
            }
        }
        return false;
    }
    isUsedIndexInInvokeExpr(invokeExpr, stmt, targeName) {
        const args = invokeExpr.getArgs();
        for (const arg of args) {
            if (arg instanceof arkanalyzer_1.Local && this.isUsedIndexInLocal(arg, stmt, targeName)) {
                return true;
            }
            else if (arg instanceof arkanalyzer_1.AbstractInvokeExpr && this.isUsedIndexInInvokeExpr(arg, stmt, targeName)) {
                return true;
            }
        }
        if (invokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            const base = invokeExpr.getBase();
            if (base instanceof arkanalyzer_1.Local) {
                return this.isUsedIndexInLocal(base, stmt, targeName);
            }
        }
        return false;
    }
    isUsedIndexInBinop(ops, defStmt, targeName) {
        const op1 = ops.getOp1();
        const op2 = ops.getOp2();
        if (op1 instanceof arkanalyzer_1.Local) {
            if (this.isUsedIndexInLocal(op1, defStmt, targeName)) {
                return true;
            }
        }
        if (op2 instanceof arkanalyzer_1.Local) {
            return this.isUsedIndexInLocal(op2, defStmt, targeName);
        }
        return false;
    }
    isVarDefInScope(targeName, scope) {
        if (!scope || scope.scopeLevel < 1) {
            return false;
        }
        for (const def of scope.defList ?? []) {
            if (def.getName() === targeName) {
                return true;
            }
        }
        return this.isVarDefInScope(targeName, scope.parentScope);
    }
    addIssueReport(stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt);
        if (warnInfo.line <= 0 || warnInfo.startCol <= 0 || !this.supportFileType.some(type => (warnInfo.filePath.endsWith(type)))) {
            return;
        }
        let defects = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
    getLineAndColumn(stmt) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            let startCol = originPosition.getColNo();
            const pos = originText.indexOf(this.FOREACH_STR);
            if (pos !== -1) {
                startCol += pos;
                const endCol = startCol + this.FOREACH_STR.length - 1;
                const originPath = arkFile.getFilePath();
                return { line, startCol, endCol, filePath: originPath };
            }
        }
        else {
            logger.debug('Get arkFile failed.');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.ForeachIndexCheck = ForeachIndexCheck;
