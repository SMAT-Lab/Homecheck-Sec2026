"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoImpliedEvalCheck = void 0;
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
const arkanalyzer_1 = require("arkanalyzer");
const Matchers_1 = require("../../matcher/Matchers");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const G_META_DATA = {
    severity: 2,
    ruleDocPath: 'docs/no-implied-eval.md',
    description: 'Implied eval. Consider passing a function.',
};
const FUNCTION_CONSTRUCTOR = 'Function';
const GLOBAL_CANDIDATES = new Set(['global', 'window', 'globalThis']);
const EVAL_LIKE_METHODS = new Set(['setImmediate', 'setInterval', 'setTimeout', 'execScript']);
class NoImpliedEvalCheck {
    defects = [];
    issues = [];
    metaData = G_META_DATA;
    rule;
    buildMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
    };
    registerMatchers() {
        const matchBuildCallback = {
            matcher: this.buildMatcher,
            callback: this.check
        };
        return [matchBuildCallback];
    }
    ;
    check = (arkMethod) => {
        const scene = arkMethod.getDeclaringArkFile().getScene();
        const statements = arkMethod.getBody()?.getCfg().getStmts() ?? [];
        for (const statement of statements) {
            if (statement instanceof arkanalyzer_1.ArkInvokeStmt) {
                this.handleArkInvokeStmt(statement, scene);
            }
            else if (statement instanceof arkanalyzer_1.ArkAssignStmt) {
                this.handleArkAssignStmt(statement);
            }
            ;
        }
        ;
    };
    handleArkInvokeStmt(statement, scene) {
        const originalText = statement.getOriginalText();
        if (!originalText) {
            return;
        }
        ;
        const filteredEvalLikeMethods = this.filterEvalLikeMethods(statement);
        const hasEvalLikeMethod = this.hasEvalLikeMethod(originalText, filteredEvalLikeMethods);
        const invokeExpression = statement.getInvokeExpr();
        if (hasEvalLikeMethod) {
            if (this.shouldSkipInvokeExpression(invokeExpression)) {
                return;
            }
            const argumentsList = invokeExpression.getArgs();
            if (this.hasInvalidArgsTypes(argumentsList, scene, originalText)) {
                this.handleInvalidArgs(statement, originalText);
            }
        }
        else if (originalText.includes(FUNCTION_CONSTRUCTOR)) {
            if (!this.isValidFunctionCall(originalText)) {
                return;
            }
            ;
            this.handleFunctionConstructorInInvoke(statement, invokeExpression);
        }
        ;
    }
    ;
    handleInvalidArgs(statement, originalText) {
        let regex = /(?:setTimeout|setInterval|setImmediate|execScript)\((.*?)(?:,|\))/;
        const match = originalText.match(regex);
        let text = match ? match[1].trim() : originalText;
        const isGlobalCandidate = this.hasGlobalCandidate(originalText);
        if (isGlobalCandidate) {
            text = this.getValueAst(originalText);
        }
        ;
        const finalText = text !== undefined ? text : originalText;
        this.addIssueReport(statement, finalText, this.metaData.description);
    }
    ;
    handleFunctionConstructorInInvoke(statement, invokeExpression) {
        if (!(invokeExpression instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
            return;
        }
        ;
        const baseType = invokeExpression.getBase()?.getType()?.getTypeString();
        if (!baseType || !this.isFunctionConstructor(baseType)) {
            return;
        }
        ;
        const base = invokeExpression.getBase();
        if (!(base instanceof arkanalyzer_1.Local)) {
            return;
        }
        ;
        const baseDeclaringStatement = base.getDeclaringStmt();
        if (!(baseDeclaringStatement instanceof arkanalyzer_1.ArkAssignStmt)) {
            return;
        }
        ;
        const rightOperand = baseDeclaringStatement.getRightOp();
        if (rightOperand instanceof arkanalyzer_1.ArkNewExpr) {
            const errorMessage = 'Implied eval. Do not use the Function constructor to create functions.';
            this.addIssueReport(statement, 'new', errorMessage);
        }
        ;
    }
    ;
    handleArkAssignStmt(statement) {
        const originalText = statement.getOriginalText();
        if (!originalText) {
            return;
        }
        ;
        if (originalText.includes(FUNCTION_CONSTRUCTOR)) {
            if (!this.isValidFunctionCall(originalText)) {
                return;
            }
            ;
            const errorMessage = 'Implied eval. Do not use the Function constructor to create functions.';
            const rightValue = statement.getRightOp();
            if (rightValue instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
                this.handleInstanceInvokeInAssign(statement, rightValue, errorMessage);
            }
            else if (rightValue instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
                this.handleStaticInvokeInAssign(statement, rightValue, errorMessage);
            }
            ;
        }
        ;
    }
    ;
    isValidFunctionCall(originalText) {
        const validPatterns = [
            // 处理 Function() 形式
            /\s*(?:let|var|const)?\s+\w+\s*=\s*Function\(\)/,
            // 处理 new Function(...) 形式
            /\s*(?:let|var|const)?\s+\w+\s*=\s*new\s+Function\([^)]*\)/,
            // 处理 window.Function() 形式
            /\s*(?:let|var|const)?\s+\w+\s*=\s*window.Function\(\)/,
            // 处理 new window.Function() 形式
            /\s*(?:let|var|const)?\s+\w+\s*=\s*new\s+window.Function\(\)/,
            // 处理 window['Function']() 形式
            /\s*(?:let|var|const)?\s+\w+\s*=\s*window\['Function']\(\)/,
            // 处理 new window['Function']() 形式
            /\s*(?:let|var|const)?\s+\w+\s*=\s*new\s+window\['Function']\(\)/
        ];
        return validPatterns.some(pattern => pattern.test(originalText));
    }
    ;
    handleInstanceInvokeInAssign(statement, rightValue, errorMessage) {
        const base = rightValue.getBase();
        if (base instanceof arkanalyzer_1.Local) {
            const baseType = rightValue.getBase().getType();
            if (baseType instanceof arkanalyzer_1.FunctionType || baseType instanceof arkanalyzer_1.UnknownType) {
                this.addIssueReport(statement, base.getName(), errorMessage);
            }
            ;
        }
        ;
    }
    ;
    handleStaticInvokeInAssign(statement, rightValue, errorMessage) {
        const methodName = rightValue.getMethodSignature()?.getMethodSubSignature()?.getMethodName();
        if (methodName) {
            this.addIssueReport(statement, methodName, errorMessage);
        }
        ;
    }
    ;
    filterEvalLikeMethods(statement) {
        const methods = new Set(EVAL_LIKE_METHODS);
        const file = statement.getCfg().getDeclaringMethod().getDeclaringArkClass().getDeclaringArkFile();
        file.getImportInfos().forEach(importInfo => {
            const importName = importInfo.getImportClauseName();
            if (methods.has(importName)) {
                methods.delete(importName);
            }
            ;
        });
        const classMethods = statement.getCfg().getDeclaringMethod().getDeclaringArkClass().getMethods();
        classMethods.forEach(method => {
            const methodName = method.getName();
            if (methods.has(methodName)) {
                methods.delete(methodName);
            }
            ;
        });
        return methods;
    }
    ;
    hasGlobalCandidate(originalText) {
        return Array.from(GLOBAL_CANDIDATES).some(method => originalText.includes(method));
    }
    ;
    hasEvalLikeMethod(originalText, methods) {
        return Array.from(methods).some(method => originalText.includes(method));
    }
    ;
    shouldSkipInvokeExpression(invokeExpression) {
        if (invokeExpression instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            const base = invokeExpression.getBase();
            if (base instanceof arkanalyzer_1.Local) {
                const name = base.getName();
                const hasGlobalCandidate = Array.from(GLOBAL_CANDIDATES).some(method => name === method);
                return !hasGlobalCandidate;
            }
            ;
        }
        ;
        return false;
    }
    ;
    hasInvalidArgsTypes(argumentsList, scene, originalText) {
        const argsMax = argumentsList.length;
        const leftType = argumentsList[0]?.getType();
        const rightType = argumentsList[1]?.getType();
        const isInvalidBasicTypes = argsMax === 1
            ? !(leftType instanceof arkanalyzer_1.FunctionType)
            : !(leftType instanceof arkanalyzer_1.FunctionType) || !(rightType instanceof arkanalyzer_1.NumberType);
        if (!isInvalidBasicTypes) {
            return false;
        }
        ;
        const leftTypeValue = leftType?.getTypeString();
        if (leftTypeValue === 'Function') {
            return false;
        }
        ;
        if (argumentsList[0] instanceof arkanalyzer_1.Local) {
            if (this.isValidBinopExpr(argumentsList[0])) {
                return false;
            }
            ;
            if (leftType instanceof arkanalyzer_1.UnknownType) {
                return !this.handleUnknownType(argumentsList[0], scene, originalText);
            }
            ;
        }
        ;
        return true;
    }
    ;
    isValidBinopExpr(leftValue) {
        const declaringStatement = leftValue.getDeclaringStmt();
        if (declaringStatement instanceof arkanalyzer_1.ArkAssignStmt) {
            const declaringRightValue = declaringStatement.getRightOp();
            if (declaringRightValue instanceof arkanalyzer_1.ArkNormalBinopExpr) {
                const rightOp1 = declaringRightValue.getOp1();
                const rightOp2 = declaringRightValue.getOp2();
                if (rightOp1 && rightOp2) {
                    const type1 = rightOp1.getType();
                    const type2 = rightOp2.getType();
                    return type1 instanceof arkanalyzer_1.FunctionType && type2 instanceof arkanalyzer_1.FunctionType;
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    handleUnknownType(leftValue, scene, originalText) {
        const declaringStatement = leftValue.getDeclaringStmt();
        if (declaringStatement instanceof arkanalyzer_1.ArkAssignStmt) {
            const declaringRightValue = declaringStatement.getRightOp();
            if (declaringRightValue instanceof arkanalyzer_1.ArkStaticFieldRef) {
                return this.isFunctionType(declaringRightValue.getFieldSignature().getType());
            }
            else if (declaringRightValue instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
                const base = declaringRightValue.getBase();
                if (base instanceof arkanalyzer_1.Local) {
                    return base.getType() instanceof arkanalyzer_1.UnknownType
                        ? this.handleBaseUnknownType(base, scene, originalText)
                        : this.isFunctionType(base.getType());
                }
                ;
            }
            else if (declaringRightValue instanceof arkanalyzer_1.ArkInstanceFieldRef) {
                return this.handleInstanceFieldRef(declaringRightValue, scene, originalText);
            }
            else if (declaringRightValue instanceof arkanalyzer_1.ArkPtrInvokeExpr) {
                return this.handlePtrInvokeExpr(declaringRightValue);
            }
            ;
        }
        ;
        return false;
    }
    ;
    handleBaseUnknownType(base, scene, originalText) {
        const declaringStmt = base.getDeclaringStmt();
        if (declaringStmt instanceof arkanalyzer_1.ArkAssignStmt) {
            const right = declaringStmt.getRightOp();
            if (right instanceof arkanalyzer_1.ArkInstanceFieldRef) {
                return this.handleInstanceFieldRef(right, scene, originalText);
            }
            ;
        }
        ;
        return false;
    }
    ;
    handleInstanceFieldRef(declaringRightValue, scene, originalText) {
        const mFieldSignature = declaringRightValue.getFieldSignature();
        if (mFieldSignature instanceof arkanalyzer_1.FieldSignature) {
            const getDeclaringSignature = mFieldSignature.getDeclaringSignature();
            if (getDeclaringSignature instanceof arkanalyzer_1.ClassSignature) {
                const mClass = scene.getClass(getDeclaringSignature);
                const mFields = mClass?.getFields();
                if (mFields && mFields.length > 0) {
                    return this.checkFields(mFields);
                }
                else {
                    return this.checkBase(declaringRightValue, originalText);
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkInitializerForFunctionType(initializer) {
        for (const minitializer of initializer) {
            if (minitializer instanceof arkanalyzer_1.ArkAssignStmt) {
                const type = minitializer.getRightOp().getType();
                if (type instanceof arkanalyzer_1.FunctionType) {
                    return true;
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkFields(mFields) {
        for (const field of mFields) {
            const initializer = field.getInitializer();
            if (!initializer) {
                continue;
            }
            ;
            if (this.checkInitializerForFunctionType(initializer)) {
                return true;
            }
            ;
        }
        ;
        return false;
    }
    ;
    checkBase(declaringRightValue, originalText) {
        const base = declaringRightValue.getBase();
        if (base instanceof arkanalyzer_1.Local) {
            const baseDeclaringStatement = base.getDeclaringStmt();
            if (baseDeclaringStatement instanceof arkanalyzer_1.ArkAssignStmt) {
                const baseDeclaringStmtText = baseDeclaringStatement.getOriginalText();
                if (baseDeclaringStmtText) {
                    return this.checkTypeAst(baseDeclaringStmtText, originalText);
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    handlePtrInvokeExpr(declaringRightValue) {
        const funcPtrLocal = declaringRightValue.getFuncPtrLocal();
        if (funcPtrLocal instanceof arkanalyzer_1.Local) {
            const type = funcPtrLocal.getType();
            if (type instanceof arkanalyzer_1.FunctionType) {
                const methodSignature = type.getMethodSignature();
                if (methodSignature instanceof arkanalyzer_1.MethodSignature) {
                    return this.isReturnTypeFunctionType(methodSignature);
                }
                ;
            }
            ;
        }
        ;
        return false;
    }
    ;
    isReturnTypeFunctionType(methodSignature) {
        const getMethodSubSignature = methodSignature.getMethodSubSignature();
        if (getMethodSubSignature instanceof arkanalyzer_1.MethodSubSignature) {
            const returnType = getMethodSubSignature.getReturnType();
            return returnType instanceof arkanalyzer_1.FunctionType;
        }
        ;
        return false;
    }
    ;
    isFunctionType(type) {
        return type instanceof arkanalyzer_1.FunctionType;
    }
    ;
    isFunctionConstructor(baseType) {
        return baseType.includes('Function') || baseType.includes('window.Function') || baseType.includes('window[\'Function\']');
    }
    ;
    checkTypeAst(baseDeclaringStmtText, originalText) {
        const ast = arkanalyzer_1.AstTreeUtils.getASTNode('checkTypeAst.ts', baseDeclaringStmtText);
        const visit = (node) => {
            return this.checkMethodDeclaration(node, originalText);
        };
        return visit(ast);
    }
    ;
    checkMethodDeclaration(node, originalText) {
        if (arkanalyzer_1.ts.isMethodDeclaration(node)) {
            if (arkanalyzer_1.ts.isIdentifier(node.name)) {
                const name = node.name.text;
                if (originalText.includes(name)) {
                    return true;
                }
                ;
            }
            ;
        }
        ;
        return arkanalyzer_1.ts.forEachChild(node, (childNode) => this.checkMethodDeclaration(childNode, originalText)) || false;
    }
    ;
    getValueAst(originalText) {
        const ast = arkanalyzer_1.AstTreeUtils.getASTNode('getValueAst.ts', originalText);
        const visit = (node) => {
            if (arkanalyzer_1.ts.isCallExpression(node)) {
                if (node.arguments.length > 0) {
                    const text = node.arguments[0].getText();
                    return text;
                }
                ;
            }
            ;
            const result = arkanalyzer_1.ts.forEachChild(node, visit);
            return result || originalText;
        };
        return visit(ast);
    }
    ;
    addIssueReport(statement, name, errorMessage) {
        const warnInfo = this.getLineAndColumn(statement, name);
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = (new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, errorMessage, severity, this.rule.ruleId, warnInfo.filePath, this.metaData.ruleDocPath, true, false, false));
        this.issues.push(new Defects_1.IssueReport(defect, undefined));
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    getLineAndColumn(statement, name) {
        const arkFile = statement.getCfg()?.getDeclaringMethod().getDeclaringArkClass().getDeclaringArkFile();
        if (arkFile) {
            const originText = statement.getOriginalText() ?? '';
            const pos = originText.indexOf(name);
            if (pos !== -1) {
                const originPosition = statement.getOriginPositionInfo();
                const line = originPosition.getLineNo();
                let startCol = originPosition.getColNo();
                startCol += pos;
                const endCol = startCol + name.length - 1;
                const originPath = arkFile.getFilePath();
                return { line, startCol, endCol, filePath: originPath };
            }
            ;
        }
        ;
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
    ;
}
exports.NoImpliedEvalCheck = NoImpliedEvalCheck;
;
