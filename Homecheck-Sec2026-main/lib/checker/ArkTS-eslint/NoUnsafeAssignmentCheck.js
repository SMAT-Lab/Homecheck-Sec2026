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
exports.NoUnsafeAssignmentCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const TypeUtils_1 = require("../../utils/checker/TypeUtils");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnsafeAssignmentCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: "docs/no-unsafe-assignment.md",
    description: "Disallow assigning a value with type `any` to variables and properties.",
};
class NoUnsafeAssignmentCheck {
    defects = [];
    issues = [];
    metaData = gMetaData;
    rule;
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    arkFile;
    check = (target) => {
        this.arkFile = target;
        const originPath = target.getName();
        if (!this.isTsFile(originPath)) {
            return;
        }
        target.getNamespaces().forEach((namespace) => {
            this.checkClass(namespace.getClasses());
        });
        this.checkClass(target.getClasses());
    };
    checkClass(mClasses) {
        mClasses.forEach((clazz) => {
            const mFields = clazz.getFields();
            this.checkFields(mFields);
            const mMethods = clazz.getMethods();
            this.checkMethod(mMethods);
        });
    }
    checkMethod(mMethods) {
        mMethods.forEach((method) => {
            const blocks = method.getCfg()?.getBlocks();
            if (!blocks) {
                return;
            }
            blocks.forEach((block) => {
                const stmts = block.getStmts();
                this.checkStmts(stmts);
            });
        });
    }
    checkStmts(stmts) {
        stmts.forEach((stmt) => {
            const originalText = stmt.getOriginalText();
            if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt) || !this.isHasAssignment(originalText ?? '')) {
                return;
            }
            if (originalText?.includes('catch')) {
                return;
            }
            let leftText = '';
            const leftOp = stmt.getLeftOp();
            if (leftOp instanceof arkanalyzer_1.Local && !leftOp.getName().startsWith('%')) {
                leftText = leftOp.getName();
            }
            else if (leftOp instanceof arkanalyzer_1.ArkStaticFieldRef || leftOp instanceof arkanalyzer_1.ArkInstanceFieldRef) {
                leftText = leftOp.getFieldName();
            }
            else if (leftOp instanceof arkanalyzer_1.ArkNormalBinopExpr) {
                leftText = this.getLeftTextByAst(stmt.getOriginalText() ?? '');
            }
            if (this.shouldSaveError(stmt) && leftText.length > 0) {
                this.saveError(stmt, leftText);
            }
        });
    }
    shouldSaveError(stmt) {
        const rightOp = stmt.getRightOp();
        const leftOp = stmt.getLeftOp();
        const originalText = stmt.getOriginalText() ?? '';
        // 提取判断逻辑为辅助函数
        if (this.isInvalidRightOp(rightOp)) {
            return false;
        }
        if (this.isContainsCompoundAssignmentOperators(originalText)) {
            return false;
        }
        if (this.isInvalidTypeCombination(leftOp, rightOp, originalText)) {
            return false;
        }
        if (this.isSafeInvokeExpression(rightOp)) {
            return false;
        }
        return true;
    }
    // 辅助函数：检查右操作数是否无效
    isInvalidRightOp(rightOp) {
        let isInvalid = false;
        if (rightOp instanceof arkanalyzer_1.Local) {
            const type = rightOp.getType();
            if (type instanceof arkanalyzer_1.ArrayType) {
                const declaringStmt = rightOp.getDeclaringStmt();
                if (declaringStmt instanceof arkanalyzer_1.ArkAssignStmt) {
                    const rightOp = declaringStmt.getRightOp();
                    isInvalid = this.isInvalidRightOp(rightOp);
                }
            }
            if (rightOp.getName() === 'this' && rightOp.getType() instanceof arkanalyzer_1.ClassType) {
                isInvalid = true;
            }
        }
        else if (rightOp instanceof arkanalyzer_1.ArkNewArrayExpr) {
            const size = rightOp.getSize();
            if (size instanceof Constant_1.NumberConstant && Number(size.getValue()) === 0) {
                return true;
            }
        }
        return isInvalid;
    }
    // 辅助函数：检查类型组合是否无效
    isInvalidTypeCombination(leftOp, rightOp, originalText) {
        const rightType = this.getType(rightOp);
        const leftType = this.getType(leftOp);
        if (!this.isAnyType(rightType) && !this.isUnknowType(rightType)) {
            return true;
        }
        if (this.isLeftHasDeclarationType(originalText) && this.isUnknowType(leftType)) {
            return true;
        }
        return false;
    }
    // 辅助函数：检查是否为安全的调用表达式
    isSafeInvokeExpression(rightOp) {
        return (rightOp instanceof arkanalyzer_1.ArkStaticInvokeExpr && this.isArkStaticInvokeExprSafe(rightOp)) ||
            (rightOp instanceof arkanalyzer_1.ArkInstanceInvokeExpr && this.isArkInstanceInvokeExprSafe(rightOp));
    }
    /**
     * 判断代码中是否包含复合赋值运算符
     * 复合赋值运算符包括：+=, -=, *=, /=, %=, &=, |=, ^=, <<=, >>=, >>>=
     *
     * @param sourceCode
     * @returns
     */
    isContainsCompoundAssignmentOperators(sourceCode) {
        const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('source', sourceCode);
        let containsOperator = false;
        const visitNode = (node) => {
            if (arkanalyzer_1.ts.isBinaryExpression(node)) {
                const operator = node.operatorToken.kind;
                if (operator === arkanalyzer_1.ts.SyntaxKind.PlusEqualsToken || // +=
                    operator === arkanalyzer_1.ts.SyntaxKind.AsteriskEqualsToken || // *=
                    operator === arkanalyzer_1.ts.SyntaxKind.MinusEqualsToken || // -=
                    operator === arkanalyzer_1.ts.SyntaxKind.SlashEqualsToken || // /=
                    operator === arkanalyzer_1.ts.SyntaxKind.PercentEqualsToken || // %=
                    operator === arkanalyzer_1.ts.SyntaxKind.AmpersandEqualsToken || // &=
                    operator === arkanalyzer_1.ts.SyntaxKind.BarEqualsToken || // |=
                    operator === arkanalyzer_1.ts.SyntaxKind.CaretEqualsToken || // ^=
                    operator === arkanalyzer_1.ts.SyntaxKind.LessThanLessThanEqualsToken || // <<=
                    operator === arkanalyzer_1.ts.SyntaxKind.GreaterThanGreaterThanEqualsToken || // >>=
                    operator === arkanalyzer_1.ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken // >>>=
                ) {
                    containsOperator = true;
                    return;
                }
            }
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return containsOperator;
    }
    checkFields(mFields) {
        mFields.forEach((field) => {
            const fieldInitializer = field.getInitializer();
            this.checkStmts(fieldInitializer);
        });
    }
    getType(value) {
        if (value instanceof arkanalyzer_1.Local) {
            let type = value.getType();
            if (type instanceof arkanalyzer_1.ClassType) {
                type = this.checkClassTypeHasAnyOrUnknown(type);
            }
            return type;
        }
        else if (value instanceof arkanalyzer_1.ArkArrayRef) {
            return value.getBase().getType();
        }
        else if (value instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            if (value.getFieldSignature() && value.getFieldSignature().getType()) {
                return value.getFieldSignature().getType();
            }
        }
        else if (value instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            return this.getArkNormalBinopExprRealType(value);
        }
        else if (value instanceof arkanalyzer_1.ArkStaticFieldRef) {
            return value.getFieldSignature().getType();
        }
        else if (value instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            const args = value.getArgs();
            const arg = args.find((arg) => {
                if (this.isAnyType(arg.getType()) || this.isUnknowType(arg.getType())) {
                    arg;
                }
            });
            return arg ? arg.getType() : value.getMethodSignature().getMethodSubSignature().getReturnType();
        }
        else if (value instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            const args = value.getArgs();
            const arg = args.find((arg) => {
                if (this.isAnyType(arg.getType()) || this.isUnknowType(arg.getType())) {
                    arg;
                }
            });
            return arg ? arg.getType() : value.getMethodSignature().getMethodSubSignature().getReturnType();
        }
        else if (value instanceof arkanalyzer_1.ArkCastExpr) {
            return value.getType();
        }
        return undefined;
    }
    checkClassTypeHasAnyOrUnknown(type) {
        let mType = type;
        const classSignature = type.getClassSignature();
        const className = classSignature.getClassName();
        const realGenericTypes = type.getRealGenericTypes();
        const declaringFileSignature = classSignature.getDeclaringFileSignature();
        const fileName = declaringFileSignature.getFileName();
        if (className === 'RegExp' ||
            className === 'Array' ||
            className === 'Map' ||
            className === 'Set' ||
            className === 'Boolean' ||
            className === 'String' ||
            className === 'Number' ||
            className === 'Promise' ||
            fileName !== '%unk') {
            realGenericTypes?.forEach((genericType) => {
                if (this.isAnyType(genericType)) {
                    mType = arkanalyzer_1.AnyType.getInstance();
                }
                else if (this.isUnknowType(genericType)) {
                    mType = arkanalyzer_1.UnknownType.getInstance();
                }
            });
        }
        else if (fileName === '%unk') {
            mType = arkanalyzer_1.UnknownType.getInstance();
        }
        return type;
    }
    getArkNormalBinopExprRealType(data) {
        const op1 = data.getOp1();
        const op2 = data.getOp2();
        // 检查是否为字符串类型
        if (this.isStringTypeOperation(data, op1, op2)) {
            return arkanalyzer_1.StringType.getInstance();
        }
        // 检查是否为 Any 或 Unknown 类型
        const anyOrUnknownType = this.getAnyOrUnknownType(op1, op2);
        if (anyOrUnknownType) {
            return anyOrUnknownType;
        }
        // 检查操作数是否为 Local 类型并获取其声明的类型
        const op1Type = this.getTypeFromLocal(op1);
        if (op1Type) {
            return op1Type;
        }
        const op2Type = this.getTypeFromLocal(op2);
        if (op2Type) {
            return op2Type;
        }
        return undefined;
    }
    // 辅助函数：检查是否为字符串类型操作
    isStringTypeOperation(data, op1, op2) {
        return data.getOperator() === '+' &&
            (op1.getType() instanceof arkanalyzer_1.StringType || op2.getType() instanceof arkanalyzer_1.StringType);
    }
    // 辅助函数：检查是否为 Any 或 Unknown 类型
    getAnyOrUnknownType(op1, op2) {
        if (this.isAnyType(op1.getType()) || this.isAnyType(op2.getType())) {
            return arkanalyzer_1.AnyType.getInstance();
        }
        if (this.isUnknowType(op1.getType()) || this.isUnknowType(op2.getType())) {
            return arkanalyzer_1.UnknownType.getInstance();
        }
        return undefined;
    }
    // 辅助函数：从 Local 类型中获取声明的类型
    getTypeFromLocal(op) {
        if (op instanceof arkanalyzer_1.Local && op.getName().startsWith('%')) {
            const stmt = op.getDeclaringStmt();
            if (stmt && stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                return this.getType(stmt.getRightOp());
            }
        }
        return undefined;
    }
    isArkInstanceInvokeExprSafe(data) {
        let isSafe = true;
        const methodInfo = data.getMethodSignature()?.getMethodSubSignature();
        if (methodInfo.getReturnType() && this.isAnyType(methodInfo.getReturnType())) {
            isSafe = false;
        }
        const args = data.getArgs();
        args.forEach((arg) => {
            if (arg.getType() && this.isAnyType(arg.getType())) {
                isSafe = false;
            }
        });
        return isSafe;
    }
    isArkStaticInvokeExprSafe(data) {
        let isSafe = true;
        const methodInfo = data.getMethodSignature()?.getMethodSubSignature();
        const methodName = methodInfo.getMethodName();
        if (methodName === 'RegExp' || methodName === 'Boolean' || methodName === 'Number' || methodName === '"parseInt"') {
            return isSafe;
        }
        if (methodInfo.getReturnType() && this.isAnyType(methodInfo.getReturnType())) {
            isSafe = false;
        }
        const args = data.getArgs();
        args.forEach((arg) => {
            if (arg.getType() && this.isAnyType(arg.getType())) {
                isSafe = false;
            }
        });
        return isSafe;
    }
    saveError(stmt, leftText = '') {
        let posArr = this.getLineAndColumnByAst(stmt, leftText);
        if (posArr.size <= 0) {
            posArr = this.getLineAndColumnFromStmt(stmt, leftText);
        }
        posArr.forEach((pos) => {
            if (pos) {
                const message = 'Unsafe assignment of an `any` value.';
                this.addIssueReport(pos, message);
            }
        });
    }
    getLineAndColumnFromStmt(stmt, leftText = '') {
        const set = new Set();
        const arkFile = stmt.getCfg()?.getDeclaringMethod().getDeclaringArkFile();
        if (!stmt.getOriginalText()) {
            return set;
        }
        if (this.isFieldRefAssignment(stmt)) {
            this.addFieldRefPosition(stmt, leftText, set);
        }
        else {
            this.addOperandPosition(stmt, arkFile, set);
        }
        return set;
    }
    // 辅助函数：检查是否为字段引用赋值
    isFieldRefAssignment(stmt) {
        return stmt instanceof arkanalyzer_1.ArkAssignStmt &&
            (stmt.getLeftOp() instanceof arkanalyzer_1.ArkInstanceFieldRef || stmt.getLeftOp() instanceof arkanalyzer_1.ArkStaticFieldRef);
    }
    // 辅助函数：添加字段引用的位置信息
    addFieldRefPosition(stmt, leftText, set) {
        const originPosition = stmt.getOriginPositionInfo();
        const line = originPosition.getLineNo();
        const startCol = originPosition.getColNo();
        const endCol = startCol + leftText.length;
        set.add({ line, startCol, endCol });
    }
    // 辅助函数：添加操作数的位置信息
    addOperandPosition(stmt, arkFile, set) {
        const positions = stmt.getOperandOriginalPositions();
        if (!positions || positions.length < 1) {
            logger.debug('positions is empty');
            return;
        }
        const index = this.getOperandIndex(stmt);
        const position = positions[index];
        if (!arkFile) {
            logger.debug('originStmt or arkFile is null');
            return;
        }
        const line = position.getFirstLine();
        const startCol = position.getFirstCol();
        const endCol = position.getLastCol();
        set.add({ line, startCol, endCol });
    }
    // 辅助函数：获取操作数索引
    getOperandIndex(stmt) {
        return stmt instanceof arkanalyzer_1.ArkAssignStmt && stmt.getRightOp() instanceof arkanalyzer_1.ArkArrayRef ? 1 : 0;
    }
    isAnyType(type) {
        if (!type) {
            return false;
        }
        return (0, TypeUtils_1.isAppointType)(arkanalyzer_1.AnyType.getInstance(), type);
    }
    isUnknowType(type) {
        if (!type) {
            return false;
        }
        return (0, TypeUtils_1.isAppointType)(arkanalyzer_1.UnknownType.getInstance(), type);
    }
    addIssueReport(pos, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        let defects = new Defects_1.Defects(pos.line, pos.startCol, pos.endCol, message, severity, this.rule.ruleId, this.arkFile.getFilePath(), this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
    /**
     * 获取指定文本在 ArkMethod 或 Stmt 对象中的行号和起始列号信息
     * @param data ArkMethod 或 Stmt 对象，需要在其中查找指定文本
     * @param text 需要查找的文本内容
     * @returns 包含行号和起始列号信息的数组，每个元素是一个包含 line 和 start 属性的对象
     */
    getLineAndColumnByAst(data, text) {
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
            pos.startCol = pos.startCol + (pos.line === line ? col : 1);
            pos.endCol = pos.endCol + (pos.line === line ? col : 1);
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
        const isTargetNode = (node) => {
            return ((arkanalyzer_1.ts.isLabeledStatement(node) && node.label.getText() === targetChar) ||
                (arkanalyzer_1.ts.isVariableDeclaration(node) && node.name.getText() === targetChar) ||
                (arkanalyzer_1.ts.isBindingElement(node) && !arkanalyzer_1.ts.isArrayBindingPattern(node.parent) && node.name.getText() === targetChar) ||
                (arkanalyzer_1.ts.isBinaryExpression(node) && node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken && node.left.getText() === targetChar));
        };
        const isPartialMatchNode = (node) => {
            return ((arkanalyzer_1.ts.isLabeledStatement(node) && node.label.getText().includes(targetChar)) ||
                (arkanalyzer_1.ts.isVariableDeclaration(node) && node.name.getText().includes(targetChar)) ||
                (arkanalyzer_1.ts.isBindingElement(node) && !arkanalyzer_1.ts.isArrayBindingPattern(node.parent) && node.name.getText().includes(targetChar)) ||
                (arkanalyzer_1.ts.isBinaryExpression(node) && node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken && node.left.getText().includes(targetChar)));
        };
        const addPositionToSet = (node) => {
            const { line: startLine, character: startCol } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const { line: endLine, character: endCol } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
            set.add({ line: startLine, startCol: startCol, endCol: endCol });
        };
        const visitNode = (node) => {
            if (isTargetNode(node) || isPartialMatchNode(node)) {
                addPositionToSet(node);
                return;
            }
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return set;
    }
    /**
     * 是否包含赋值运算
     * @param source 源字符串，用于查找目标字符
     * @returns
     */
    isHasAssignment(source) {
        let isHasAssignment = false;
        const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('source', source);
        const visitNode = (node) => {
            if (arkanalyzer_1.ts.isLabeledStatement(node) ||
                arkanalyzer_1.ts.isVariableDeclaration(node) ||
                arkanalyzer_1.ts.isBindingElement(node) ||
                (arkanalyzer_1.ts.isBinaryExpression(node) && node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken)) {
                isHasAssignment = true;
                return;
            }
            // 递归遍历子节点
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return isHasAssignment;
    }
    /**
     * 获取赋值表达式左侧的文本内容
     * @param source 源字符串，用于查找目标字符
     * @returns 左侧内容
     */
    getLeftTextByAst(source) {
        let leftText = '';
        const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('source', source);
        const visitNode = (node) => {
            if (arkanalyzer_1.ts.isLabeledStatement(node)) {
                leftText = node.label.getText();
                return;
            }
            if (arkanalyzer_1.ts.isVariableDeclaration(node)) {
                leftText = node.name.getText();
                return;
            }
            if (arkanalyzer_1.ts.isBindingElement(node)) {
                leftText = node.name.getText();
                return;
            }
            if (arkanalyzer_1.ts.isBinaryExpression(node)) {
                leftText = node.left.getText();
                return;
            }
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return leftText;
    }
    /**
     * 获取表达式左侧是否有类型申明
     * @param source 源字符串，用于查找目标字符
     * @returns 包含所有匹配索引的数组，如果没有匹配则返回空数组
     */
    isLeftHasDeclarationType(source) {
        let isLeftHasDeclarationType = false;
        const sourceFile = arkanalyzer_1.AstTreeUtils.getASTNode('source', source);
        const visitNode = (node) => {
            // 检查变量声明是否有显式类型
            if (arkanalyzer_1.ts.isVariableDeclaration(node)) {
                isLeftHasDeclarationType = node.type !== undefined;
            }
            // 检查函数参数是否有显式类型
            if (arkanalyzer_1.ts.isParameter(node)) {
                isLeftHasDeclarationType = node.type !== undefined;
            }
            // 检查函数返回值是否有显式类型
            if (arkanalyzer_1.ts.isFunctionDeclaration(node) || arkanalyzer_1.ts.isMethodDeclaration(node) || arkanalyzer_1.ts.isArrowFunction(node)) {
                isLeftHasDeclarationType = node.type !== undefined;
            }
            // 检查属性声明是否有显式类型
            if (arkanalyzer_1.ts.isPropertyDeclaration(node)) {
                isLeftHasDeclarationType = node.type !== undefined;
            }
            arkanalyzer_1.ts.forEachChild(node, visitNode);
        };
        visitNode(sourceFile);
        return isLeftHasDeclarationType;
    }
    isTsFile(filePath) {
        return filePath.toLowerCase().endsWith('.ts');
    }
}
exports.NoUnsafeAssignmentCheck = NoUnsafeAssignmentCheck;
