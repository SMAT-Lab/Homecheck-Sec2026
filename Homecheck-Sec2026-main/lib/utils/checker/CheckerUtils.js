"use strict";
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
exports.CheckerUtils = void 0;
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
const Stmt_1 = require("arkanalyzer/lib/core/base/Stmt");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Expr_1 = require("arkanalyzer/lib/core/base/Expr");
const Local_1 = require("arkanalyzer/lib/core/base/Local");
const path_1 = __importDefault(require("path"));
const arkanalyzer_1 = require("arkanalyzer");
const Scope_1 = require("../../model/Scope");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'CheckUtils');
class CheckerUtils {
    /**
     * 从给定的语句中获取调用表达式
     * @param stmt - 要处理的语句
     * @returns 如果找到调用表达式，则返回 AbstractInvokeExpr，否则返回 null
     */
    static getInvokeExprFromStmt(stmt) {
        if (stmt instanceof Stmt_1.ArkInvokeStmt) {
            return stmt.getInvokeExpr();
        }
        else if (stmt instanceof Stmt_1.ArkAssignStmt) {
            const rightOp = stmt.getRightOp();
            if (rightOp instanceof Expr_1.AbstractInvokeExpr) {
                return rightOp;
            }
        }
        return null;
    }
    /**
     * 从给定的语句中获取调用表达式（Await）
     * @param stmt - 要处理的语句
     * @returns 如果找到调用表达式，则返回 AbstractInvokeExpr，否则返回 null
     */
    static getInvokeExprFromAwaitStmt(stmt) {
        if (stmt instanceof Stmt_1.ArkInvokeStmt) {
            return stmt.getInvokeExpr();
        }
        else if (stmt instanceof Stmt_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp();
            if (rightOp instanceof Expr_1.AbstractInvokeExpr) {
                return rightOp;
            }
            else if (rightOp instanceof Expr_1.ArkAwaitExpr) {
                let promise = rightOp.getPromise();
                if (!(promise instanceof Local_1.Local)) {
                    return null;
                }
                let declaringStmt = promise.getDeclaringStmt();
                if (!(declaringStmt instanceof Stmt_1.ArkAssignStmt)) {
                    return null;
                }
                rightOp = declaringStmt.getRightOp();
                if (rightOp instanceof Expr_1.AbstractInvokeExpr) {
                    return rightOp;
                }
            }
        }
        return null;
    }
    /**
     * 获取语句的Scope类型
     * @param stmt 语句对象
     * @returns Scope类型
     */
    static getScopeType(stmt) {
        const text = stmt.getOriginalText() ?? '';
        if (!text) {
            return Scope_1.ScopeType.UNKNOWN_TYPE;
        }
        if (text.startsWith('for (') || text.startsWith('for(')) {
            return Scope_1.ScopeType.FOR_CONDITION_TYPE;
        }
        else if (text.startsWith('while (') || text.startsWith('while(')) {
            return Scope_1.ScopeType.WHILE_TYPE;
        }
        else if (text.startsWith('if (') || text.startsWith('if(')) {
            return Scope_1.ScopeType.IF_TYPE;
        }
        return Scope_1.ScopeType.UNKNOWN_TYPE;
    }
    /**
     * 判断给定的语句是否是声明语句
     * @param defName - 要检查的变量名
     * @param stmt - 要检查的语句
     * @returns 如果语句是声明语句，则返回true，否则返回false
     */
    static isDeclaringStmt(defName, stmt) {
        const text = stmt.getOriginalText() ?? '';
        if (text) {
            if (text.includes('let ' + defName) || text.includes('const ' + defName) ||
                text.includes('var ' + defName)) {
                const c = text[text.indexOf(' ' + defName) + defName.length + 1];
                if (c === ' ' || c === ':' || c === '=') {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * 获取语句中临时变量的位置
     * @param stmt 语句
     * @returns 临时变量的位置
     */
    static wherIsTemp(stmt) {
        let def = stmt.getDef();
        if (def instanceof Local_1.Local) {
            if (def.getName().includes('%')) {
                return Scope_1.TempLocation.LEFT;
            }
        }
        if (stmt instanceof Stmt_1.ArkAssignStmt) {
            let right = stmt.getRightOp();
            if (right instanceof Local_1.Local) {
                if (right.getName().includes('%')) {
                    return Scope_1.TempLocation.RIGHT;
                }
            }
        }
        return Scope_1.TempLocation.NOFOUND;
    }
    /**
     * 根据文件路径获取ArkFile对象
     * @param scene Scene
     * @param absolutePath 文件的绝对路径
     * @returns 返回对应的ArkFile对象，如果未找到则返回null
     */
    static getArkFileByFilePath(scene, absolutePath) {
        const relativePath = path_1.default.relative(scene.getRealProjectDir(), absolutePath);
        const fileSign = new arkanalyzer_1.FileSignature(scene.getProjectName(), relativePath);
        return scene.getFile(fileSign);
    }
    /**
     * 获取参数的右值
     * @param arg - 参数
     * @param arkClass - ArkClass对象
     * @returns Value | null - 返回参数的右值，如果不存在则返回null
     */
    static getArgRight(arg, arkClass) {
        if (!(arg instanceof Local_1.Local)) {
            return arg;
        }
        let decStmt = arg.getDeclaringStmt();
        if (!(decStmt instanceof Stmt_1.ArkAssignStmt)) {
            return null;
        }
        let rightOp = decStmt.getRightOp();
        if (!(rightOp instanceof arkanalyzer_1.ArkInstanceFieldRef)) {
            return rightOp;
        }
        let field = arkClass.getField(rightOp.getFieldSignature());
        if (!field) {
            return null;
        }
        for (let initializer of field.getInitializer()) {
            if (!(initializer instanceof Stmt_1.ArkAssignStmt)) {
                continue;
            }
            return initializer.getRightOp();
        }
        return null;
    }
}
exports.CheckerUtils = CheckerUtils;
