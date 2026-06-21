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
exports.NoNewWrappersCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoNewWrappersCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/no-new-wrappers.md',
    description: 'Do not use String as a constructor.'
};
;
;
class NoNewWrappersCheck {
    globalConfigRegex = /new String|new Number|new Boolean/;
    metaData = gMetaData;
    WRAPPERS_STR = 'string';
    CREAER_STR = 'new String';
    CREAERNUM_STR = 'new Number';
    CREAERBOOL_STR = 'new Boolean';
    rule;
    defects = [];
    issues = [];
    currentFilePath = '';
    arkFile;
    comments = [];
    fieldMatcher = {
        matcherType: Index_1.MatcherTypes.FIELD,
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
    };
    methodMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
        class: [this.clsMatcher],
        file: [this.fileMatcher],
    };
    registerMatchers() {
        const methodMatcherCb = {
            matcher: this.methodMatcher,
            callback: this.check,
        };
        const fieldMatcherCb = {
            matcher: this.fieldMatcher,
            callback: this.check,
        };
        return [methodMatcherCb, fieldMatcherCb];
    }
    ;
    check = (target) => {
        let newFile;
        if (target instanceof arkanalyzer_1.ArkMethod) {
            newFile = target.getDeclaringArkFile();
            this.updateFileContext(newFile);
            this.processStatements(target.getBody()?.getCfg().getStmts() ?? []);
        }
        else if (target instanceof arkanalyzer_1.ArkField) {
            newFile = target.getDeclaringArkClass().getDeclaringArkFile();
            this.updateFileContext(newFile);
            this.processStatements(target.getInitializer());
        }
        ;
    };
    updateFileContext(newFile) {
        const newFilePath = newFile.getFilePath();
        // 只有当文件路径改变时才更新文件上下文和重新解析注释
        if (this.currentFilePath !== newFilePath) {
            this.arkFile = newFile;
            this.currentFilePath = newFilePath;
            this.comments = this.getAllComments(this.arkFile.getCode());
        }
        ;
    }
    processStatements(stmts) {
        for (const stmt of stmts) {
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                continue;
            }
            ;
            const text = stmt.getOriginalText() ?? '';
            if (text && this.containsWrapperConstructor(text, stmt)) {
                this.addIssueReport(stmt);
            }
            ;
        }
        ;
    }
    ;
    containsWrapperConstructor(text, stmt) {
        let eqIndex = text.indexOf('=') ?? -1;
        if (eqIndex === -1) {
            // 非赋值语句需要检查的情况
            if (stmt instanceof arkanalyzer_1.ArkInvokeStmt) {
                const blockStmts = stmt.getCfg()?.getStmts();
                if (blockStmts) {
                    return this.checkBlockStmts(blockStmts, stmt);
                }
                ;
            }
            ;
        }
        else {
            const textStr = text.split('=');
            if (textStr.length > 1) {
                /**
                 *  需要检查当前作用域中是否有变量声明覆盖了这些构造函数
                 *  需要检查是否有模块导入覆盖了这些构造函数
                 *  需要检查全局变量配置
                 */
                const isGlobalConstructor = this.isGlobalConstructor(textStr[1]?.trim(), stmt);
                return isGlobalConstructor && this.globalConfigRegex.test(textStr[1]?.trim());
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkBlockStmts(blockStmts, stmt) {
        for (const blockStmt of blockStmts) {
            if (!(blockStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            ;
            const textStr = blockStmt.getOriginalText() ?? '';
            if (textStr) {
                const isGlobalConstructor = this.isGlobalConstructor(textStr, stmt);
                return isGlobalConstructor && this.globalConfigRegex.test(textStr);
            }
            ;
        }
        ;
        return false;
    }
    isGlobalConstructor(text, stmt) {
        let className = '';
        if (text.includes('(') && text.includes('new ')) {
            className = text.split('(')[0].replace('new ', '');
        }
        else if (text.includes('new ')) {
            className = text.replace('new ', '');
        }
        ;
        if (className.startsWith('return ')) {
            className = className.replace('return ', '');
        }
        ;
        if (className.endsWith(';')) {
            className = className.replace(';', '');
        }
        ;
        // 1. 检查当前作用域是否有同名变量声明
        let isDeclared = this.checkDeclared(className, stmt);
        // 2. 检查是否有同名模块导入
        let isImported = this.checkImported(className);
        // 3. 检查当前文件是否有全局变量配置
        let isGlobal = this.checkGlobalConfig(className);
        return (isImported || isDeclared || isGlobal) ? false : true;
    }
    checkDeclared(className, stmt) {
        let isDeclared = false;
        let blocks = stmt.getCfg()?.getBlocks();
        if (!blocks) {
            return isDeclared;
        }
        ;
        for (const block of blocks) {
            let stmts = block.getStmts();
            for (const stmt of stmts) {
                if (stmt instanceof arkanalyzer_1.ArkAssignStmt && stmt.getLeftOp().toString() === className) {
                    isDeclared = true;
                    break;
                }
                ;
            }
            ;
        }
        ;
        return isDeclared;
    }
    checkImported(className) {
        let isImported = false;
        let imports = this.arkFile?.getImportInfos();
        if (!imports) {
            return isImported;
        }
        ;
        for (const importInfo of imports) {
            if (importInfo.getImportClauseName() === className) {
                isImported = true;
                break;
            }
            ;
        }
        ;
        return isImported;
    }
    checkGlobalConfig(className) {
        let isGlobal = false;
        // 获取当前文件的所有注释
        if (!this.comments) {
            return isGlobal;
        }
        ;
        for (const comment of this.comments) {
            if (comment.globalConfigs) {
                const config = comment.globalConfigs.get(className);
                if (config && config === 'off') {
                    isGlobal = true;
                }
                ;
            }
            ;
        }
        ;
        return isGlobal;
    }
    getAllComments(code) {
        const comments = [];
        const commentRegex = /\/\/(.*)|\/\*([\s\S]*?)\*\//g;
        const globalConfigRegex = /\/\*\s*global\s+([^*]*?)\s*\*\//;
        const variableConfigRegex = /(\w+)\s*:\s*(off|readable|writable|writeable)/g;
        let match;
        while ((match = commentRegex.exec(code)) !== null) {
            const fullMatch = match[0];
            // 检查是否是全局配置注释
            const globalMatch = globalConfigRegex.exec(fullMatch);
            let globalConfigs;
            if (globalMatch) {
                globalConfigs = new Map();
                const configText = globalMatch[1];
                let configMatch;
                while ((configMatch = variableConfigRegex.exec(configText)) !== null) {
                    const [, varName, config] = configMatch;
                    globalConfigs.set(varName, config);
                    comments.push({
                        fullMatch,
                        globalConfigs,
                    });
                }
                ;
            }
            ;
        }
        ;
        return comments;
    }
    ;
    addIssueReport(stmt) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(stmt);
        const description = 'Do not use ' + warnInfo.name + ' as a constructor';
        let defect = new Index_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, description, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    getLineAndColumn(stmt) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (arkFile) {
            const originText = stmt.getOriginalText() ?? '';
            let startCol = originPosition.getColNo();
            if (/new String/.test(originText?.trim())) {
                return this.getWrapperPosition(originText, this.CREAER_STR, startCol, line, arkFile, 'String');
            }
            else if (/new Number/.test(originText?.trim())) {
                return this.getWrapperPosition(originText, this.CREAERNUM_STR, startCol, line, arkFile, 'Number');
            }
            else if (/new Boolean/.test(originText?.trim())) {
                return this.getWrapperPosition(originText, this.CREAERBOOL_STR, startCol, line, arkFile, 'Boolean');
            }
            ;
        }
        else {
            logger.debug('arkFile is null');
        }
        ;
        return { line: -1, startCol: -1, endCol: -1, name: '', filePath: '' };
    }
    ;
    getWrapperPosition(text, wrapperStr, startCol, line, arkFile, name) {
        const pos = text.indexOf(wrapperStr);
        if (pos !== -1) {
            startCol += pos;
            const endCol = startCol + wrapperStr.length - 1;
            const originPath = arkFile.getFilePath();
            return { line, startCol, endCol, name, filePath: originPath };
        }
        ;
        return { line: -1, startCol: -1, endCol: -1, name: '', filePath: '' };
    }
    ;
}
exports.NoNewWrappersCheck = NoNewWrappersCheck;
