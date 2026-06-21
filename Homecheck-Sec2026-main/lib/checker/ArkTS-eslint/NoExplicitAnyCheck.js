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
exports.NoExplicitAnyCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const TypeUtils_1 = require("../../utils/checker/TypeUtils");
const DefectsList_1 = require("../../utils/common/DefectsList");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoExplicitAnyCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-explicit-any.md",
    description: "Require Promise-like statements to be handled appropriately"
};
const messages = {
    suggestNever: "Use `never` instead, this is useful when instantiating generic type parameters that you don't need to know the type of.",
    suggestUnknown: 'Use `unknown` instead, this will force you to explicitly, and safely assert the type is correct.',
    unexpectedAny: 'Unexpected any. Specify a different type.',
};
class NoExplicitAnyCheck {
    issues = [];
    defects = [];
    metaData = gMetaData;
    rule;
    classMatcher = {
        matcherType: Matchers_1.MatcherTypes.CLASS,
    };
    registerMatchers() {
        const classMatcherCb = {
            matcher: this.classMatcher,
            callback: this.check
        };
        return [classMatcherCb];
    }
    defaultOption = { "ignoreRestArgs": false, "fixToUnknown": false };
    option = this.defaultOption;
    arkFile;
    check = (target) => {
        this.arkFile = target.getDeclaringArkFile();
        const originPath = this.arkFile.getName();
        if (!this.isTsFile(originPath)) {
            return;
        }
        if (this.rule && this.rule.option && this.rule.option[0]) {
            this.option = this.rule.option[0];
        }
        if (this.option.ignoreRestArgs) {
            return;
        }
        ;
        const genericTypes = target.getGenericsTypes();
        genericTypes?.forEach((type) => {
            if (this.isAnyType(type)) {
                this.addIssueReport(target);
            }
        });
        target.getFields().forEach((field) => {
            const signature = field.getSignature();
            if (!signature) {
                return;
            }
            const fieldCode = field.getCode();
            if (this.isHasAny(fieldCode)) {
                this.addIssueReport(field);
            }
            const stmts = field.getInitializer();
            if (stmts.length <= 0) {
                return;
            }
            this.checkStmts(stmts);
        });
        target.getMethods().forEach((method) => {
            this.checkMethod(method);
        });
    };
    checkStmts(stmts) {
        stmts.forEach((stmt) => {
            if (this.isHasAny(stmt.getOriginalText() ?? '')) {
                this.addIssueReport(stmt);
                return;
            }
        });
    }
    checkMethod(method) {
        const code = method.getCode() ?? '';
        if (this.isHasAny(code)) {
            this.addIssueReport(method);
            return;
        }
        const blocks = method.getBody()?.getCfg().getBlocks();
        blocks?.forEach((block) => {
            this.checkStmts(block.getStmts());
        });
    }
    isAnyType(type) {
        return (0, TypeUtils_1.isAppointType)(arkanalyzer_1.AnyType.getInstance(), type);
    }
    addIssueReport(stmt) {
        const posArr = this.getLineAndColumn(stmt, 'any');
        posArr.forEach((pos) => {
            const defect = this.createDefect(pos, this.arkFile.getFilePath());
            if (!defect) {
                return;
            }
            //创建fix
            let fix = this.createFix(pos);
            this.issues.push(new Defects_1.IssueReport(defect, fix));
            DefectsList_1.RuleListUtil.push(defect);
        });
    }
    createDefect(pos, filePath, message) {
        const msg = message ?? messages.unexpectedAny;
        const severity = this.rule.alert ?? this.metaData.severity;
        return new Defects_1.Defects(pos.line, pos.startCol, pos.endCol, msg, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
    }
    createFix(pos) {
        const ranges = this.getRangeFromLineAndColumn(pos.line, pos.startCol, pos.line, pos.endCol);
        return { range: ranges, text: 'unknown' };
    }
    /**
     * 获取指定文本在 ArkMethod 或 Stmt 对象中的行号和起始列号信息
     * @param data ArkMethod 或 Stmt 对象，需要在其中查找指定文本
     * @param text 需要查找的文本内容
     * @returns 包含行号和起始列号信息的数组，每个元素是一个包含 line 和 start 属性的对象
     */
    getLineAndColumn(data, text) {
        const set = new Set();
        if (data instanceof arkanalyzer_1.ArkMethod) {
            this.processArkMethod(data, text, set);
        }
        else if (data instanceof arkanalyzer_1.Stmt) {
            this.processStmt(data, text, set);
        }
        else if (data instanceof arkanalyzer_1.ArkField) {
            this.processArkField(data, text, set);
        }
        else if (data instanceof arkanalyzer_1.ArkClass) {
            this.processArkClass(data, text, set);
        }
        return set;
    }
    processArkClass(data, text, set) {
        const line = data.getLine();
        const col = data.getColumn();
        let code = data.getCode() ?? '';
        const posArr = this.getAllIndices(code, text);
        posArr.forEach((pos) => {
            pos.line += line;
            pos.startCol = pos.startCol + (pos.line === line ? col : 1);
            pos.endCol = pos.endCol + (pos.line === line ? col : 1);
            set.add(pos);
        });
    }
    /**
     * 处理 ArkField 对象，查找指定文本在方法代码中的位置，并将位置信息添加到数组中
     * @param data ArkField 对象，包含方法的相关信息
     * @param text 需要在方法代码中查找的文本
     * @param arr 用于存储找到的文本位置信息的数组，每个元素是一个包含行号和起始列号的对象
     */
    processArkField(data, text, set) {
        const originPosition = data.getOriginPosition();
        const line = originPosition.getLineNo();
        const col = originPosition.getColNo();
        const posArr = this.getAllIndices(data.getCode() ?? '', text);
        posArr.forEach((pos) => {
            pos.line += line;
            pos.startCol += col;
            pos.endCol += col;
            set.add(pos);
        });
    }
    /**
     * 处理 ArkMethod 对象，查找指定文本在方法代码中的位置，并将位置信息添加到数组中
     * @param data ArkMethod 对象，包含方法的相关信息
     * @param text 需要在方法代码中查找的文本
     * @param set 用于存储找到的文本位置信息的数组，每个元素是一个包含行号和起始列号的对象
     */
    processArkMethod(data, text, set) {
        let line = data.getLine() ?? this.getFirstDeclareLine(data);
        const col = data.getColumn() ?? this.getFirstDeclareColumns(data);
        const posArr = this.getAllIndices(data.getCode() ?? '', text);
        posArr.forEach((pos) => {
            pos.line += line;
            pos.startCol = pos.startCol + (pos.line === line ? col : 1);
            pos.endCol = pos.endCol + (pos.line === line ? col : 1);
            set.add(pos);
        });
    }
    /**
     * 处理语句对象，查找指定文本在语句中的位置，并将位置信息添加到数组中
     * @param data 语句对象，包含语句的相关信息
     * @param text 需要在语句中查找的文本
     * @param arr 用于存储找到的文本位置信息的数组，每个元素是一个包含行号和起始列号的对象
     */
    processStmt(data, text, set) {
        const originPosition = data.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const col = originPosition.getColNo();
        let code = data.getOriginalText() ?? '';
        const posArr = this.getAllIndices(code, text);
        posArr.forEach((pos) => {
            pos.line += line;
            pos.startCol += col;
            pos.endCol += col;
            set.add(pos);
        });
    }
    /**
     * 获取 ArkMethod 对象中第一个声明的行位置
     * @param data ArkMethod 对象，包含方法声明信息
     * @returns 第一个声明行的数值位置。如果无法获取行信息，返回默认值 0
     */
    getFirstDeclareLine(data) {
        const declareLines = data.getDeclareLines();
        if (declareLines) {
            return declareLines[0];
        }
        logger.debug('declareLines is null');
        return 0;
    }
    /**
     * 获取 ArkMethod 对象中第一个声明的行位置
     * @param data ArkMethod 对象，包含方法声明信息
     * @returns 第一个声明行的数值位置。如果无法获取行信息，返回默认值 0
     */
    getFirstDeclareColumns(data) {
        const declareColumns = data.getDeclareColumns();
        if (declareColumns) {
            return declareColumns[0];
        }
        logger.debug('declareColumns is null');
        return 0;
    }
    /**
     * 获取目标字符在源字符串中所有出现位置的索引
     * @param source 源字符串，用于查找目标字符
     * @param targetChar 目标字符，需要在源字符串中查找的字符
     * @returns 包含所有匹配索引的数组，如果没有匹配则返回空数组
     */
    getAllIndices(source, targetChar) {
        const set = new Set();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('source', source);
        const visitNode = (node) => {
            if (node.getText() === targetChar) {
                const { line: textLine, character: textCharacter } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                set.add({ line: textLine, startCol: textCharacter, endCol: textCharacter + targetChar.length });
            }
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return set;
    }
    isHasAny(code) {
        const regex = /(?<![a-zA-Z0-9-])any(?![a-zA-Z0-9-])/g;
        const indexes = Array.from(code.matchAll(regex)).map(m => m.index);
        return indexes.length > 0;
    }
    isTsFile(filePath) {
        return filePath.toLowerCase().endsWith('.ts');
    }
    getRangeFromLineAndColumn(startLine, startCol, endLine, endCol) {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('source', this.arkFile.getCode() ?? '');
        const start = sourceFile.getPositionOfLineAndCharacter(startLine - 1, startCol - 1); // 转换为 0 基索引
        const end = sourceFile.getPositionOfLineAndCharacter(endLine - 1, endCol - 1); // 转换为 0 基索引
        return [start, end];
    }
}
exports.NoExplicitAnyCheck = NoExplicitAnyCheck;
