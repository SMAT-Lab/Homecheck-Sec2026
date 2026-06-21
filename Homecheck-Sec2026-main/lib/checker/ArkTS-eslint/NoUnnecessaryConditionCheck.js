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
exports.NoUnnecessaryConditionCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const ArkBaseModel_1 = require("arkanalyzer/lib/core/model/ArkBaseModel");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'NoUnnecessaryConditionCheck');
const gMetaData = {
    severity: 1,
    ruleDocPath: "docs/no-unnecessary-condition.md",
    description: "Disallow conditionals where the type is always truthy or always falsy.",
    messages: {
        alwaysTruthy: 'Unnecessary conditional, value is always truthy.',
        alwaysFalsy: 'Unnecessary conditional, value is always falsy.',
        alwaysTruthyFunc: 'This callback should return a conditional, but return is always truthy.',
        alwaysFalsyFunc: 'This callback should return a conditional, but return is always falsy.',
        neverNullish: 'Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined.',
        alwaysNullish: 'Unnecessary conditional, left-hand side of `??` operator is always `null` or `undefined`.',
        literalBooleanExpression: 'Unnecessary conditional, both sides of the expression are literal values.',
        noOverlapBooleanExpression: 'Unnecessary conditional, the types have no overlap.',
        never: 'Unnecessary conditional, value is `never`.',
        neverOptionalChain: 'Unnecessary optional chain on a non-nullish value.',
        noStrictNullCheck: 'This rule requires the `strictNullChecks` compiler option to be turned on to function correctly.',
    }
};
class NoUnnecessaryConditionCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    ARRAY_PREDICATE_FUNCTIONS = new Set(['filter', 'find', 'some', 'every']);
    BOOL_OPERATORS = new Set(['<', '>', '<=', '>=', '==', '===', '!=', '!==']);
    line = 0;
    col = 0;
    locationInfos = [];
    globalStmt;
    rootNode;
    globalMethod;
    option;
    useMethod = [];
    stmtCache = new Map();
    nullishType = [arkanalyzer_1.NullType, arkanalyzer_1.UndefinedType];
    defaultOptions = {
        allowConstantLoopConditions: false,
        allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: false,
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatcherCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcherCb];
    }
    check = (arkFile) => {
        this.locationInfos = [];
        const code = arkFile.getCode();
        if (!code) {
            return;
        }
        this.stmtCache.clear();
        this.option = this.rule && this.rule.option[0] ? this.rule.option[0] : this.defaultOptions;
        arkFile.getClasses().forEach(cls => this.checkClass(cls));
        // 输出结果
        this.locationInfos.forEach(loc => {
            this.addIssueReportNodeFix(loc, arkFile);
        });
    };
    isLiteralType(type) {
        return type instanceof arkanalyzer_1.LiteralType || type instanceof arkanalyzer_1.BooleanType || type instanceof arkanalyzer_1.UndefinedType ||
            type instanceof arkanalyzer_1.NullType || type instanceof arkanalyzer_1.VoidType;
    }
    isNullishType(value) {
        return this.nullishType.some(t => value instanceof t);
    }
    isPossiblyNullish(value) {
        return this.unionTypeParts(value).some(t => this.isNullishType(t));
    }
    isAlwaysNullish(value) {
        return this.unionTypeParts(value).every(t => this.isNullishType(t));
    }
    isTruthyLiteral(value) {
        if (!value) {
            return false;
        }
        if (!(value instanceof arkanalyzer_1.LiteralType)) {
            return false;
        }
        if (value.getLiteralName() === true || value.getLiteralName()) {
            return true;
        }
        return false;
    }
    isFalsyLiteral(value) {
        if (!value) {
            return false;
        }
        if (value instanceof arkanalyzer_1.LiteralType) {
            if (value.getLiteralName() === false) {
                return true;
            }
            if (['0', 'false', ''].includes(value.getLiteralName().toString())) {
                return true;
            }
        }
        if ([arkanalyzer_1.NullType, arkanalyzer_1.UndefinedType].some(ty => value instanceof ty)) {
            return true;
        }
        return false;
    }
    /**
     * 检查是否存在至少一个类型是true类型
     * @param value
     * @returns
     */
    isPossiblyTruthy(value) {
        if (!value) {
            return false;
        }
        //处理联合类型中包含交集类型的情况
        let types = this.unionTypeParts(value).map(type => this.unionTypeParts(type));
        //检查是否存在至少一个类型不是false类型
        return types.some(intersectionParts => 
        //交集类型中只要有一个是true，则返回true
        intersectionParts.every(t => !this.isFalsyLiteral(t)));
    }
    /**
     * 检查是否存在至少一个类型是false类型
     * @param value
     * @returns
     */
    isPossiblyFalsy(value) {
        if (!value) {
            return false;
        }
        //处理联合类型
        return this.unionTypeParts(value)
            //处理联合类型中包含交集类型的情况
            .flatMap(type => this.unionTypeParts(type))
            //过滤掉非true类型
            .filter(t => !this.isTruthyLiteral(t))
            //检查是否存在至少一个类型是false类型
            .some(l => (l instanceof arkanalyzer_1.LiteralType && ['false', '0', ''].includes(l.getLiteralName().toString())) ||
            [arkanalyzer_1.NullType, arkanalyzer_1.UndefinedType, arkanalyzer_1.NumberType, arkanalyzer_1.StringType,
                arkanalyzer_1.BooleanType, arkanalyzer_1.BigIntType, arkanalyzer_1.UnclearReferenceType].some(ty => l instanceof ty));
    }
    checkClass(arkClass) {
        const methods = arkClass.getMethods(true);
        this.useMethod = [];
        methods.forEach(method => {
            this.checkMethod(method);
        });
    }
    checkMethod(arkMethod) {
        const stmts = arkMethod.getBody()?.getCfg().getStmts();
        const methodName = arkMethod.getSignature().getMethodSubSignature().getMethodName();
        if (this.useMethod.includes(methodName)) {
            return;
        }
        this.globalMethod = arkMethod;
        this.useMethod.push(methodName);
        stmts?.forEach(stmt => {
            this.checkStmt(stmt);
        });
    }
    checkStmt(arkStmt) {
        if (this.checkStmtIf(arkStmt)) {
            return;
        }
        this.globalStmt = arkStmt;
        let originCode = arkStmt.getOriginalText();
        if (!originCode) {
            return;
        }
        const astNode = arkanalyzer_1.AstTreeUtils.getASTNode('temp', originCode);
        if (astNode) {
            this.locationInfos.push(...this.checkCondition(astNode));
        }
    }
    checkLogicalExpressionForUnnecessaryConditionals(stmt, node, results) {
        if (!(stmt instanceof arkanalyzer_1.ArkNormalBinopExpr || stmt instanceof arkanalyzer_1.ArkConditionExpr)) {
            return;
        }
        if (!node) {
            return;
        }
        if (stmt.getOperator() === arkanalyzer_1.NormalBinaryOperator.NullishCoalescing) {
            this.checkNodeForNullish(stmt.getOp1(), node?.left, results);
            return;
        }
        this.checkNode(stmt.getOp1(), node?.left, results);
    }
    checkCallExpression(stmt, node, results) {
        if (!node) {
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkInvokeStmt) {
            stmt = stmt.getInvokeExpr();
        }
        if (!(stmt instanceof arkanalyzer_1.ArkInstanceInvokeExpr)) {
            return;
        }
        if (node && this.isArrayPredicateFunction(stmt, node) && node?.arguments.length) {
            this.checkArrayPredicateFunction(stmt, node, results);
        }
    }
    checkArrayPredicateFunction(stmt, node, results) {
        if (!node) {
            return;
        }
        const callback = stmt.getArg(0);
        const argument = node?.arguments[0];
        if (callback instanceof arkanalyzer_1.Local && callback.getType() instanceof arkanalyzer_1.FunctionType && argument &&
            (arkanalyzer_1.ts.isArrowFunction(argument) || arkanalyzer_1.ts.isFunctionExpression(argument))) {
            const methodName = callback.getName();
            const method = this.globalMethod.getDeclaringArkClass().getMethodWithName(methodName);
            let stmts = method?.getBody()?.getCfg().getStmts();
            if (stmts && stmts[0]) {
                this.checkNode(stmts[0], argument.body, results);
                return;
            }
            let returnType = method?.getReturnType() ? this.unionTypeParts(method?.getReturnType()) : [];
            if (returnType.length === 0 ||
                returnType.some(t => t instanceof arkanalyzer_1.AnyType || t instanceof arkanalyzer_1.UnknownType)) {
                return;
            }
            if (!returnType.some(t => this.isPossiblyFalsy(t))) {
                this.reportIssue(argument.body, 'alwaysTruthyFunc', results);
                return;
            }
            if (!returnType.some(t => this.isPossiblyTruthy(t))) {
                this.reportIssue(argument.body, 'alwaysFalsyFunc', results);
                return;
            }
        }
    }
    isArrayPredicateFunction(stmt, node) {
        if (!node) {
            return false;
        }
        const methodName = stmt.getMethodSignature().getMethodSubSignature().getMethodName();
        if (node && this.ARRAY_PREDICATE_FUNCTIONS.has(methodName) &&
            this.isArrayType(stmt.getBase(), node)) {
            return true;
        }
        return false;
    }
    isArrayType(value, node) {
        if (!node) {
            return false;
        }
        const type = value.getType();
        return type instanceof arkanalyzer_1.ArrayType || type instanceof arkanalyzer_1.TupleType;
    }
    checkIfLoopIsNecessaryConditional(stmt, node, results) {
        if (!node) {
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkConditionExpr) {
            let op1 = stmt.getOp1();
            let op2 = stmt.getOp2();
            if (this.option.allowConstantLoopConditions &&
                this.isTruthyLiteral(op1.getType()) && this.isTruthyLiteral(op2.getType())) {
                return;
            }
        }
        this.checkNode(stmt, node, results);
    }
    checkAssignmentExpression(stmt, node, results) {
        if (!node) {
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            if (node && [arkanalyzer_1.ts.SyntaxKind.AmpersandAmpersandEqualsToken, arkanalyzer_1.ts.SyntaxKind.BarBarEqualsToken].
                includes(node?.operatorToken?.kind)) {
                this.checkNode(stmt.getOp1(), node?.left, results);
            }
            else if (node && node?.operatorToken?.kind === arkanalyzer_1.ts.SyntaxKind.QuestionQuestionEqualsToken) {
                this.checkNodeForNullish(stmt.getOp1(), node?.left, results);
            }
        }
    }
    checkNodeForNullish(stmt, node, results) {
        if (!node) {
            return;
        }
        const type = this.getConstrainedType(stmt, node);
        if (type instanceof arkanalyzer_1.UndefinedType) {
            return;
        }
        if (type instanceof arkanalyzer_1.AnyType || type instanceof arkanalyzer_1.UnknownType) {
            return;
        }
        let messageId = null;
        if (type instanceof arkanalyzer_1.NeverType) {
            messageId = 'never';
        }
        else if (type && !this.isPossiblyNullish(type)) {
            if (!(stmt instanceof arkanalyzer_1.ArkArrayRef ||
                (node && arkanalyzer_1.ts.isElementAccessExpression(node) &&
                    arkanalyzer_1.ts.isLiteralExpression(node?.argumentExpression))) &&
                !arkanalyzer_1.ts.isNonNullChain(node)) {
                if (type instanceof arkanalyzer_1.UnclearReferenceType) {
                    return;
                }
                messageId = 'neverNullish';
            }
        }
        else if (type && this.isAlwaysNullish(type)) {
            messageId = 'alwaysNullish';
        }
        if (messageId) {
            this.reportIssue(node, messageId, results);
        }
    }
    checkNode(stmt, node, results, isUnaryNotArgument = false) {
        if (!node) {
            return;
        }
        if (arkanalyzer_1.ts.isParenthesizedExpression(node)) {
            this.checkNode(stmt, node?.expression, results, isUnaryNotArgument);
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp();
            if ([Constant_1.StringConstant, Constant_1.NumberConstant, Constant_1.BooleanConstant]
                .some(value => rightOp instanceof value) &&
                [arkanalyzer_1.ArkNormalBinopExpr, arkanalyzer_1.ArkConditionExpr].every(value => !(rightOp instanceof value))) {
                return;
            }
            if (!(rightOp instanceof Constant_1.UndefinedConstant)) {
                stmt = rightOp;
            }
        }
        if (stmt instanceof arkanalyzer_1.Local && stmt.getDeclaringStmt() && stmt.getName().includes('%')) {
            //处理这种嵌套的逻辑表达式(a || b) && c
            let decalarationStmt = stmt.getDeclaringStmt();
            this.checkNode(decalarationStmt, node, results);
            return;
        }
        this.checkExpressionNode(stmt, node, results, isUnaryNotArgument);
    }
    checkExpressionNode(stmt, node, results, isUnaryNotArgument = false) {
        if (node && arkanalyzer_1.ts.isPrefixUnaryExpression(node)) {
            if (stmt instanceof arkanalyzer_1.ArkConditionExpr &&
                stmt.getOp2() instanceof arkanalyzer_1.Constant &&
                stmt.getOperator() === '!=') {
                this.checkNode(stmt.getOp1(), node, results);
                return;
            }
            if (!(stmt instanceof arkanalyzer_1.ArkUnopExpr)) {
                return;
            }
            let op = stmt.getOp();
            if (stmt.getOperator() === arkanalyzer_1.UnaryOperator.LogicalNot) {
                if (op instanceof arkanalyzer_1.Local && op.getDeclaringStmt() && op.getName().includes('%')) {
                    let decalarationStmt = op.getDeclaringStmt();
                    this.checkNode(decalarationStmt, node.operand, results, !isUnaryNotArgument);
                    return;
                }
                this.checkNode(op, node.operand, results, !isUnaryNotArgument);
                return;
            }
        }
        if (stmt instanceof arkanalyzer_1.ArkArrayRef ||
            (node && arkanalyzer_1.ts.isElementAccessExpression(node) && arkanalyzer_1.ts.isLiteralExpression(node.argumentExpression))) {
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr &&
            stmt.getOperator() !== arkanalyzer_1.NormalBinaryOperator.NullishCoalescing && node &&
            arkanalyzer_1.ts.isBinaryExpression(node)) {
            //这里检查右值，左值在checkLogicalExpressionForUnnecessaryConditionals方法里检查
            this.checkNode(stmt.getOp2(), node.right, results);
            return;
        }
        this.checkNodeOther(stmt, node, results, isUnaryNotArgument);
    }
    checkNodeOther(stmt, node, results, isUnaryNotArgument = false) {
        let type = this.getConstrainedType(stmt, node);
        //<T extends string>(x: T)
        if (type instanceof arkanalyzer_1.GenericType) {
            type = type.getConstraint() ? type.getConstraint() : arkanalyzer_1.AnyType.getInstance();
        }
        if (type instanceof arkanalyzer_1.ClassType) {
            //目前类似new Boolean(true),这种基础类型的参数未能解析，所以返回默认值
            let clsName = type.getClassSignature().getClassName();
            if (clsName === 'Boolean') {
                type = new arkanalyzer_1.LiteralType(false);
            }
            if (clsName === 'String') {
                type = new arkanalyzer_1.LiteralType('');
            }
            if (clsName === 'Number') {
                type = new arkanalyzer_1.LiteralType(1);
            }
            if (clsName === 'Array') {
                type = new arkanalyzer_1.ArrayType(arkanalyzer_1.AnyType.getInstance(), 1);
            }
        }
        if (type instanceof arkanalyzer_1.FunctionType) {
            type = new arkanalyzer_1.LiteralType(true);
        }
        node = this.getReportedNode(node);
        if (type && this.unionTypeParts(type).some(ty => ty instanceof arkanalyzer_1.AnyType || ty instanceof arkanalyzer_1.UnknownType)) {
            return;
        }
        let messageId = null;
        if (type instanceof arkanalyzer_1.NeverType) {
            messageId = 'never';
        }
        else if (type && !this.isPossiblyTruthy(type)) {
            messageId = !isUnaryNotArgument ? 'alwaysFalsy' : 'alwaysTruthy';
        }
        else if (type && !this.isPossiblyFalsy(type)) {
            messageId = !isUnaryNotArgument ? 'alwaysTruthy' : 'alwaysFalsy';
        }
        if (messageId) {
            this.reportIssue(node, messageId, results);
        }
    }
    getReportedNode(node) {
        if (arkanalyzer_1.ts.isPrefixUnaryExpression(node)) {
            return this.getReportedNode(node?.operand);
        }
        if (arkanalyzer_1.ts.isParenthesizedExpression(node) ||
            arkanalyzer_1.ts.isTypeOfExpression(node) ||
            arkanalyzer_1.ts.isCallExpression(node) ||
            arkanalyzer_1.ts.isAwaitExpression(node)) {
            return this.getReportedNode(node?.expression);
        }
        return node;
    }
    getConstrainedTypeOfArkConditionExpr(stmt, node, num = 0) {
        let op1 = stmt.getOp1();
        let op2 = stmt.getOp2();
        let op1Type = this.getConstrainedType(op1, node, num);
        //如果条件表达式是a=1,则op1Type为1
        if (arkanalyzer_1.ts.isIdentifier(node) && arkanalyzer_1.ts.isBinaryExpression(node.parent)) {
            node = node.parent;
        }
        if (arkanalyzer_1.ts.isBinaryExpression(node) && node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            if (arkanalyzer_1.ts.isLiteralExpression(node.right)) {
                op1Type = new arkanalyzer_1.LiteralType(node.right.text);
            }
            else if (arkanalyzer_1.ts.isParenthesizedExpression(node.right) && arkanalyzer_1.ts.isLiteralExpression(node.right.expression)) {
                op1Type = new arkanalyzer_1.LiteralType(node.right.expression.text);
            }
        }
        //特殊情况，function类型在条件表达式中，则返回true
        if (op1Type instanceof arkanalyzer_1.FunctionType && stmt.getUses().some(use => use instanceof arkanalyzer_1.ArkIfStmt)) {
            return new arkanalyzer_1.LiteralType(true);
        }
        let op2Type = this.getConstrainedType(op2, node);
        if (!(op1Type instanceof arkanalyzer_1.LiteralType)) {
            return op1Type;
        }
        if (op1Type instanceof arkanalyzer_1.LiteralType && op2Type instanceof arkanalyzer_1.LiteralType) {
            if (['===', '=='].includes(stmt.getOperator())) {
                return new arkanalyzer_1.LiteralType(op1Type.getLiteralName() === op2Type.getLiteralName());
            }
            if (['!==', '!='].includes(stmt.getOperator())) {
                return new arkanalyzer_1.LiteralType(op1Type.getLiteralName() !== op2Type.getLiteralName());
            }
            if (stmt.getOperator() === '>') {
                return new arkanalyzer_1.LiteralType(op1Type.getLiteralName() > op2Type.getLiteralName());
            }
            if (stmt.getOperator() === '<') {
                return new arkanalyzer_1.LiteralType(op1Type.getLiteralName() < op2Type.getLiteralName());
            }
            if (stmt.getOperator() === '>=') {
                return new arkanalyzer_1.LiteralType(op1Type.getLiteralName() >= op2Type.getLiteralName());
            }
            if (stmt.getOperator() === '<=') {
                return new arkanalyzer_1.LiteralType(op1Type.getLiteralName() <= op2Type.getLiteralName());
            }
        }
        return op2Type;
    }
    getConstrainedTypeOfArkNewExpr(stmt, node) {
        let type = undefined;
        if (arkanalyzer_1.ts.isNewExpression(node) && node?.arguments && node?.arguments[0] && arkanalyzer_1.ts.isLiteralExpression(node?.arguments[0])) {
            let argument = node?.arguments[0];
            if (argument?.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword) {
                type = new arkanalyzer_1.LiteralType(true);
            }
            if (argument?.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword) {
                type = new arkanalyzer_1.LiteralType(false);
            }
            if (arkanalyzer_1.ts.isStringLiteral(argument) || arkanalyzer_1.ts.isNumericLiteral(argument) || arkanalyzer_1.ts.isBigIntLiteral(argument)) {
                type = new arkanalyzer_1.LiteralType(argument.text);
            }
            return type;
        }
        return stmt.getClassType();
    }
    getConstrainedType(stmt, node, num = 0) {
        let type = undefined;
        try {
            if (num > 5) {
                return type;
            }
            num++;
            if (stmt instanceof arkanalyzer_1.ArkConditionExpr) {
                return this.getConstrainedTypeOfArkConditionExpr(stmt, node, num);
            }
            if (stmt instanceof arkanalyzer_1.ArkTypeOfExpr && arkanalyzer_1.ts.isTypeOfExpression(node)) {
                return arkanalyzer_1.StringType.getInstance();
            }
            if (stmt instanceof arkanalyzer_1.ArkNewExpr) {
                return this.getConstrainedTypeOfArkNewExpr(stmt, node);
            }
            //字面量类型
            if (stmt instanceof arkanalyzer_1.Constant) {
                return this.getConstrainedTypeOfConstant(stmt, node);
            }
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                return this.getConstrainedTypeOfArkAssignStmt(stmt, node);
            }
            if (stmt instanceof arkanalyzer_1.ArkInstanceFieldRef) {
                return stmt.getFieldSignature().getType();
            }
            if (stmt instanceof arkanalyzer_1.ArkAwaitExpr) {
                return this.getConstrainedType(stmt.getPromise(), node);
            }
            if (stmt instanceof arkanalyzer_1.Local) {
                if (!stmt.getName().includes('%')) {
                    type = this.getTypeByName(stmt.getName());
                }
                let decalarationStmt = stmt.getDeclaringStmt();
                if (!type && decalarationStmt) {
                    return this.getConstrainedType(decalarationStmt, node);
                }
                //如果变量声明没有类型，则通过声明语句获取类型
                if (!type && stmt.getType()) {
                    type = stmt.getType();
                }
                return type;
            }
        }
        catch (error) {
            return undefined;
        }
        return this.getConstrainedTypeOther(stmt, node);
    }
    getConstrainedTypeOfConstant(stmt, node) {
        if (stmt instanceof Constant_1.StringConstant || stmt instanceof Constant_1.NumberConstant || stmt instanceof Constant_1.BooleanConstant) {
            return new arkanalyzer_1.LiteralType(stmt.getValue());
        }
        return stmt.getType();
    }
    getConstrainedTypeOfArkAssignStmt(stmt, node) {
        let type = undefined;
        const leftOp = stmt.getLeftOp();
        const rightOp = stmt.getRightOp();
        if (leftOp instanceof arkanalyzer_1.Local && !leftOp.getName().includes('%')) {
            if (rightOp instanceof Constant_1.NumberConstant || rightOp instanceof Constant_1.StringConstant || rightOp instanceof Constant_1.BooleanConstant) {
                return leftOp.getConstFlag() ? new arkanalyzer_1.LiteralType(rightOp.getValue()) : rightOp.getType();
            }
            type = this.getConstrainedType(leftOp, node);
        }
        //左侧没有声明，则通过右侧的类型推断
        if (!type || type instanceof arkanalyzer_1.UnknownType) {
            return this.getConstrainedType(rightOp, node);
        }
        return type;
    }
    getConstrainedTypeOther(stmt, node) {
        let type = undefined;
        if (stmt instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            let base = stmt.getBase();
            let arg0 = stmt.getArg(0);
            if (base.getType() instanceof arkanalyzer_1.ClassType && base.getName() === 'Promise') {
                if (arg0 && arg0 instanceof arkanalyzer_1.Constant) {
                    type = new arkanalyzer_1.LiteralType(arg0.getValue());
                }
                else {
                    type = base.getType();
                }
                return type;
            }
            return stmt.getMethodSignature().getMethodSubSignature().getReturnType();
        }
        if (stmt instanceof arkanalyzer_1.AbstractInvokeExpr) {
            //调用表达式，如果是调用方法，则判断其方法返回类型
            const methodName = stmt.getMethodSignature().getMethodSubSignature().getMethodName();
            const method = this.globalMethod.getDeclaringArkClass().getMethodWithName(methodName);
            if (method) {
                this.useMethod.push(methodName);
                type = method.getReturnType();
                if (type instanceof arkanalyzer_1.VoidType && method.containsModifier(ArkBaseModel_1.ModifierType.ASYNC)) {
                    type = new arkanalyzer_1.UnclearReferenceType('Promise');
                }
            }
            return type;
        }
        if (stmt instanceof arkanalyzer_1.AbstractFieldRef) {
            //变量使用，其中包含了调用变量例如：a.b.c
            const fieldSignature = stmt.getFieldSignature();
            return fieldSignature.getType();
        }
        if (stmt instanceof arkanalyzer_1.ClassType) {
            return stmt;
        }
        if (stmt instanceof arkanalyzer_1.ArkPtrInvokeExpr ||
            stmt instanceof arkanalyzer_1.ArkParameterRef) {
            return stmt.getType();
        }
        return type;
    }
    checkStmtIf(arkStmt) {
        if (arkStmt.getOriginalText() === '') {
            return true;
        }
        this.line = arkStmt.getOriginPositionInfo().getLineNo();
        this.col = arkStmt.getOriginPositionInfo().getColNo();
        if (arkStmt instanceof arkanalyzer_1.ArkAssignStmt && arkStmt.getRightOp().getType() instanceof arkanalyzer_1.NumberType) {
            return true;
        }
        return false;
    }
    checkCondition(sourceFile) {
        const results = [];
        this.rootNode = sourceFile.statements[0];
        if (!this.rootNode) {
            return results;
        }
        if (arkanalyzer_1.ts.isExpressionStatement(this.rootNode)) {
            this.rootNode = this.rootNode?.expression;
        }
        if (this.rootNode.getText().includes('?.')) {
            this.checkOptionalChain(this.globalStmt, this.rootNode, results);
        }
        this.visitCheck(this.globalStmt, this.rootNode, results);
        return results;
    }
    checkOptionalChain(stmt, node, results) {
        if (!node) {
            return;
        }
        if (arkanalyzer_1.ts.isPropertyAccessExpression(node) || arkanalyzer_1.ts.isCallExpression(node) || arkanalyzer_1.ts.isElementAccessExpression(node)) {
            this.checkOptionalChainStmt(node, stmt, results);
        }
        arkanalyzer_1.ts.forEachChild(node, (child) => this.checkOptionalChain(stmt, child, results));
    }
    checkOptionalChainStmt(node, stmt, results) {
        if (!node.getText() || !node.getText().includes('?')) {
            return;
        }
        if (!node.expression || !node.expression.getText()) {
            return;
        }
        let objName = node.expression.getText();
        if (stmt instanceof arkanalyzer_1.ArkInvokeStmt && stmt.getInvokeExpr()) {
            let invokeExpr = stmt.getInvokeExpr();
            if (invokeExpr instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
                let type = invokeExpr.getBase().getType();
                if (invokeExpr.getBase().getName() === objName) {
                    this.checkOptionalChainType(node, type, results);
                }
            }
            else {
                let type = stmt.getInvokeExpr().getType();
                this.checkOptionalChainType(node, type, results);
            }
        }
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt && stmt.getRightOp() && stmt.getRightOp() instanceof arkanalyzer_1.Local) {
            this.checkChainStmtOfRightOp(node, stmt, results);
        }
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt && stmt.getLeftOp() && stmt.getLeftOp() instanceof arkanalyzer_1.Local) {
            this.checkChainStmtOfLeftOp(node, stmt, results);
        }
    }
    checkChainStmtOfRightOp(node, stmt, results) {
        let objName = node?.expression.getText();
        let op2 = stmt.getRightOp();
        if (op2 instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            let methodName = op2.getMethodSignature().getMethodSubSignature().getMethodName();
            if (methodName === 'Array') {
                this.reportOptionalChainIssue(node, results);
                return;
            }
            let returnType = op2.getMethodSignature().getMethodSubSignature().getReturnType();
            this.checkOptionalChainType(node, returnType, results);
        }
        if (op2 instanceof arkanalyzer_1.ArkNewArrayExpr) {
            let baseType = op2.getBaseType();
            this.checkOptionalChainType(node, baseType, results);
        }
        if (op2 instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            let baseType = op2.getBase().getType();
            if (op2.getBase().getName() === objName) {
                this.checkOptionalChainType(node, baseType, results);
            }
        }
        if (op2 instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            let baseType = op2.getBase().getType();
            if (op2.getBase().getName() === objName) {
                this.checkOptionalChainType(node, baseType, results);
            }
        }
    }
    checkChainStmtOfLeftOp(node, stmt, results) {
        let objName = node?.expression.getText();
        let op1 = stmt.getLeftOp();
        let declaringStmt = op1.getDeclaringStmt();
        if (declaringStmt && declaringStmt instanceof arkanalyzer_1.ArkAssignStmt) {
            const declaringRightOp = declaringStmt.getRightOp();
            if (declaringRightOp instanceof arkanalyzer_1.ArkInstanceFieldRef) {
                let base = declaringRightOp.getBase().getType();
                if (declaringRightOp.getBase().getName() === objName) {
                    this.checkOptionalChainType(node, base, results);
                }
            }
        }
        let startingStmt = declaringStmt?.getCfg().getStartingStmt().getCfg().getStartingStmt();
        if (startingStmt && startingStmt instanceof arkanalyzer_1.ArkAssignStmt) {
            const startingRightOp = startingStmt.getRightOp();
            if (startingRightOp instanceof arkanalyzer_1.ArkParameterRef) {
                const rightOpType = startingRightOp.getType();
                this.checkOptionalChainType(node, rightOpType, results);
            }
        }
    }
    checkOptionalChainType(node, opType, results) {
        let isUnknownType = opType instanceof arkanalyzer_1.UnknownType || opType instanceof arkanalyzer_1.VoidType;
        if (isUnknownType) {
            return;
        }
        let isNullType = opType instanceof arkanalyzer_1.NullType;
        let isUndefinedType = opType instanceof arkanalyzer_1.UndefinedType;
        if (!(opType instanceof arkanalyzer_1.UnionType) && !isNullType && !isUndefinedType) {
            this.reportOptionalChainIssue(node, results);
        }
        if (opType instanceof arkanalyzer_1.UnionType) {
            let hasNullOrUndefined = this.unionTypeParts(opType).some(ty => ty instanceof arkanalyzer_1.NullType || ty instanceof arkanalyzer_1.UndefinedType);
            if (opType && !hasNullOrUndefined) {
                this.reportOptionalChainIssue(node, results);
            }
        }
    }
    getQuestionDotToken(node) {
        if (arkanalyzer_1.ts.isPropertyAccessExpression(node) && node?.questionDotToken) {
            return node?.questionDotToken;
        }
        if (arkanalyzer_1.ts.isCallExpression(node) && node?.questionDotToken) {
            return node?.questionDotToken;
        }
        if (arkanalyzer_1.ts.isElementAccessChain(node) && node?.questionDotToken) {
            return node?.questionDotToken;
        }
        return undefined;
    }
    reportOptionalChainIssue(node, results) {
        const questionDotToken = this.getQuestionDotToken(node);
        if (!questionDotToken) {
            return;
        }
        let characterLength;
        if (arkanalyzer_1.ts.isCallExpression(node) || arkanalyzer_1.ts.isElementAccessExpression(node) || arkanalyzer_1.ts.isBinaryExpression(node)) {
            // 对于 CallExpression 和 ElementAccessExpression
            characterLength = 2; // ?. 的长度为2
        }
        else {
            // 对于 PropertyAccessExpression
            characterLength = 1; // ? 的长度为1
        }
        // 获取行列号
        const { line, character } = this.rootNode.getSourceFile().getLineAndCharacterOfPosition(questionDotToken.getStart());
        const startLine = this.line + line;
        const endCol = this.col + character + characterLength;
        const startCol = this.col + character;
        let start = 0;
        const end = start + characterLength;
        results.push({
            fileName: this.rootNode.getSourceFile().fileName,
            line: startLine,
            startCol: startCol,
            endCol: endCol,
            start: start,
            end: end,
            nameStr: '?.',
            description: this.metaData.messages.neverOptionalChain,
            messageId: 'neverOptionalChain'
        });
    }
    isConditionNode(node) {
        return (arkanalyzer_1.ts.isIfStatement(node) || arkanalyzer_1.ts.isForStatement(node) || arkanalyzer_1.ts.isWhileStatement(node) ||
            arkanalyzer_1.ts.isDoStatement(node) || arkanalyzer_1.ts.isConditionalExpression(node));
    }
    visitCheck(stmt, node, results) {
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            stmt = stmt.getRightOp();
        }
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr && (!arkanalyzer_1.ts.isBinaryExpression(node) || node.right.getText() !== stmt.getOp2().toString())) {
            node = this.checkLocal(stmt, stmt.toString(), node) ?? node;
        }
        if (node && arkanalyzer_1.ts.isBinaryExpression(node)) {
            if (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
                node = node.right;
                this.visitCheck(stmt, node, results);
                return;
            }
            if ([
                arkanalyzer_1.ts.SyntaxKind.QuestionQuestionEqualsToken, arkanalyzer_1.ts.SyntaxKind.BarBarEqualsToken,
                arkanalyzer_1.ts.SyntaxKind.AmpersandAmpersandEqualsToken
            ].includes(node.operatorToken.kind)) {
                this.checkAssignmentExpression(stmt, node, results);
            }
            else if ([
                arkanalyzer_1.NormalBinaryOperator.NullishCoalescing,
                arkanalyzer_1.NormalBinaryOperator.LogicalOr,
                arkanalyzer_1.NormalBinaryOperator.LogicalAnd
            ].
                some(op => stmt instanceof arkanalyzer_1.ArkNormalBinopExpr && stmt.getOperator() === op)) {
                this.checkLogicalExpressionForUnnecessaryConditionals(stmt, node, results);
            }
            else {
                this.checkIfBinaryExpressionIsNecessaryConditional(stmt, node, results);
            }
        }
        this.visitCheckOfArkIfStmt(stmt, node, results);
        if (arkanalyzer_1.ts.isCallExpression(node) && stmt instanceof arkanalyzer_1.ArkInvokeStmt) {
            this.checkCallExpression(stmt, node, results);
        }
    }
    visitCheckOfArkIfStmt(stmt, node, results) {
        if (!node) {
            return;
        }
        if (!(stmt instanceof arkanalyzer_1.ArkIfStmt)) {
            return;
        }
        stmt = stmt.getConditionExpr();
        if (stmt instanceof arkanalyzer_1.ArkConditionExpr && !this.isConditionNode(node)) {
            node = this.checkLocal(stmt, stmt.toString(), node) ?? node;
            if (this.isConditionNode(node?.parent)) {
                node = node?.parent;
            }
        }
        let test = node;
        if (!test) {
            return;
        }
        if (arkanalyzer_1.ts.isDoStatement(node) || arkanalyzer_1.ts.isIfStatement(node) || arkanalyzer_1.ts.isWhileStatement(node)) {
            node = node?.expression;
        }
        if (arkanalyzer_1.ts.isConditionalExpression(node) || arkanalyzer_1.ts.isForStatement(node)) {
            if (!node?.condition) {
                return;
            }
            node = node?.condition;
        }
        this.visitCheckOfArkIfStmtOther(stmt, node, test, results);
    }
    visitCheckOfArkIfStmtOther(stmt, test, node, results) {
        if (!test || !node) {
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkConditionExpr && stmt.getOp1() instanceof arkanalyzer_1.Local) {
            let op1 = stmt.getOp1();
            let decalarationStmt = op1.getDeclaringStmt();
            if (decalarationStmt && decalarationStmt instanceof arkanalyzer_1.ArkAssignStmt &&
                op1.getName().includes('%') && decalarationStmt.getRightOp() instanceof arkanalyzer_1.ArkNormalBinopExpr) {
                stmt = decalarationStmt;
            }
        }
        if (arkanalyzer_1.ts.isDoStatement(test) || arkanalyzer_1.ts.isForStatement(test) || arkanalyzer_1.ts.isWhileStatement(test)) {
            this.checkIfLoopIsNecessaryConditional(stmt, node, results);
        }
        if (arkanalyzer_1.ts.isConditionalExpression(test) || arkanalyzer_1.ts.isIfStatement(test) ||
            stmt instanceof arkanalyzer_1.ArkConditionExpr) {
            this.checkNode(stmt, node, results);
        }
    }
    matchNormalBinopExpr(stmt, stmtStr, node) {
        let op1 = stmt.getOp1();
        let op2 = stmt.getOp2();
        let nodeText = '';
        let stmtStrs = stmtStr.split(stmt.getOperator());
        if (op1.getType() instanceof arkanalyzer_1.FunctionType && stmtStrs[0].includes('%') && arkanalyzer_1.ts.isConditionalExpression(node)) {
            let op1ReplaceText = this.getNormalBinopExprText(op1, node);
            nodeText = arkanalyzer_1.ts.isParenthesizedExpression(node?.condition) ? `(${op1ReplaceText})` : op1ReplaceText;
            stmtStrs[0] = this.replacePlaceholder(stmtStrs[0], op1ReplaceText);
        }
        if (stmtStr.includes('%') && arkanalyzer_1.ts.isBinaryExpression(node)) {
            if (op1 instanceof arkanalyzer_1.Local && op1.getName().includes('%')) {
                let op1ReplaceText = this.getNormalBinopExprText(op1, node);
                nodeText = arkanalyzer_1.ts.isParenthesizedExpression(node?.left) ? `(${op1ReplaceText})` : op1ReplaceText;
                stmtStrs[0] = this.replacePlaceholder(stmtStrs[0], nodeText);
            }
            if (op2 instanceof arkanalyzer_1.Local && op2.getName().includes('%')) {
                let op2ReplaceText = this.getNormalBinopExprText(op2, node);
                nodeText = arkanalyzer_1.ts.isParenthesizedExpression(node?.right) ? `(${op2ReplaceText})` : op2ReplaceText;
                stmtStrs[1] = this.replacePlaceholder(stmtStrs[1], nodeText);
            }
        }
        stmtStr = (stmt instanceof arkanalyzer_1.ArkConditionExpr &&
            [Constant_1.BooleanConstant, Constant_1.StringConstant, Constant_1.NumberConstant, arkanalyzer_1.LiteralType]
                .some(ty => op2 instanceof ty)) ?
            stmtStrs[0] : stmtStrs.join(stmt.getOperator()).toString();
        return stmtStr.trim();
    }
    checkLocal(stmt, stmtStr, node) {
        let isReplace = false;
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            let op1 = stmt.getOp1();
            let op2 = stmt.getOp2();
            if (arkanalyzer_1.ts.isBinaryExpression(node) &&
                stmt.getOperator() === node?.operatorToken.getText() &&
                (op2 instanceof arkanalyzer_1.Local && op2.getName() === node?.right.getText() ||
                    op1 instanceof arkanalyzer_1.Local && op1.getName() === node?.left.getText())) {
                return node;
            }
            stmtStr = this.matchNormalBinopExpr(stmt, stmtStr, node);
        }
        if (stmt instanceof arkanalyzer_1.ArkConditionExpr) {
            stmtStr = this.matchNormalBinopExpr(stmt, stmtStr, node);
        }
        let childtext = node?.getText().replace('?.', '.').replace('new', '');
        if (childtext.trim() === stmtStr.trim()) {
            isReplace = true;
            return node;
        }
        if (!isReplace) {
            let childs = node?.getChildren();
            for (const child of childs) {
                let result = this.checkLocal(stmt, stmtStr, child);
                if (result) {
                    return result;
                }
            }
        }
        return undefined;
    }
    getNormalBinopExprText(stmt, node) {
        if (!node) {
            return stmt.toString();
        }
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            return this.matchNormalBinopExpr(stmt, stmt.toString(), node);
        }
        if (stmt instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            return `${stmt.getBase().getName()}.${stmt.getFieldSignature().getFieldName()}`;
        }
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            return this.getNormalBinopExprText(stmt.getRightOp(), node);
        }
        if (stmt instanceof arkanalyzer_1.ArkNewExpr) {
            const className = stmt.getClassType().getClassSignature().getClassName();
            const cls = this.globalMethod.getDeclaringArkClass().getDeclaringArkFile().getClassWithName(className);
            const code = cls?.getCode();
            return code ?? className;
        }
        if (stmt instanceof arkanalyzer_1.Local) {
            const decalarationStmt = stmt.getDeclaringStmt();
            if (decalarationStmt instanceof arkanalyzer_1.ArkAssignStmt) {
                return this.getNormalBinopExprText(decalarationStmt, node);
            }
            if (!decalarationStmt && stmt.getType() instanceof arkanalyzer_1.FunctionType) {
                const method = this.globalMethod.getDeclaringArkClass().getMethodWithName(stmt.getName());
                const methodCode = method?.getCode();
                if (methodCode) {
                    return methodCode;
                }
            }
        }
        return stmt.toString();
    }
    replacePlaceholder(input, replacement) {
        // 使用正则表达式匹配 % 后面跟随字母或数字的占位符
        return input.replace(/%\w+/g, replacement);
    }
    checkIfBinaryExpressionIsNecessaryConditional(stmt, node, results) {
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            stmt = stmt.getRightOp();
        }
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr || stmt instanceof arkanalyzer_1.ArkConditionExpr) {
            if (!this.BOOL_OPERATORS.has(stmt.getOperator())) {
                return;
            }
            let leftType = this.getConstrainedType(stmt.getOp1(), node.left);
            let rightType = this.getConstrainedType(stmt.getOp2(), node.right);
            if (leftType === undefined || rightType === undefined) {
                return;
            }
            if (this.isLiteralType(leftType) && this.isLiteralType(rightType)) {
                this.reportIssue(node, 'literalBooleanExpression', results);
                return;
            }
            const isComparable = (type, types) => {
                // Allow comparison to `any`, `unknown` or a naked type parameter.
                types.push(arkanalyzer_1.AnyType.getInstance(), arkanalyzer_1.UnknownType.getInstance());
                // Allow loose comparison to nullish values.
                if (node && (node.operatorToken.getText() === '==' || node.operatorToken.getText() === '!=')) {
                    types.push(arkanalyzer_1.NullType.getInstance(), arkanalyzer_1.UndefinedType.getInstance(), arkanalyzer_1.VoidType.getInstance());
                }
                return types.some(t => t === type);
            };
            if ((leftType instanceof arkanalyzer_1.UndefinedType &&
                !isComparable(rightType, [arkanalyzer_1.UndefinedType.getInstance(), arkanalyzer_1.VoidType.getInstance()])) ||
                (rightType instanceof arkanalyzer_1.UndefinedType &&
                    !isComparable(leftType, [arkanalyzer_1.AnyType.getInstance(), arkanalyzer_1.UnknownType.getInstance()])) ||
                (leftType instanceof arkanalyzer_1.NullType && !isComparable(rightType, [arkanalyzer_1.NullType.getInstance()])) ||
                (rightType instanceof arkanalyzer_1.NullType && !isComparable(leftType, [arkanalyzer_1.NullType.getInstance()]))) {
                this.reportIssue(node, 'noOverlapBooleanExpression', results);
                return;
            }
        }
    }
    unionTypeParts(type) {
        if (type instanceof arkanalyzer_1.UnionType || type instanceof arkanalyzer_1.IntersectionType) {
            return type.getTypes();
        }
        return [type];
    }
    getVariableType(ast, name, leftOp) {
        if (arkanalyzer_1.ts.isVariableStatement(ast)) {
            let declaration = ast.declarationList.declarations.find(declaration => arkanalyzer_1.ts.isIdentifier(declaration.name) && declaration.name.getText() === name);
            if (declaration) {
                return this.getVariableType(declaration, name, leftOp);
            }
        }
        if (arkanalyzer_1.ts.isVariableDeclaration(ast)) {
            if (ast.type) {
                if (ast.type?.kind === arkanalyzer_1.ts.SyntaxKind.StringKeyword) {
                    return arkanalyzer_1.StringType.getInstance();
                }
                if (ast.type?.kind === arkanalyzer_1.ts.SyntaxKind.NumberKeyword) {
                    return arkanalyzer_1.NumberType.getInstance();
                }
                if (ast.type?.kind === arkanalyzer_1.ts.SyntaxKind.BooleanKeyword) {
                    return arkanalyzer_1.BooleanType.getInstance();
                }
                return undefined;
            }
            if (ast.initializer) {
                if (leftOp.getConstFlag() && [
                    arkanalyzer_1.ts.SyntaxKind.NumericLiteral,
                    arkanalyzer_1.ts.SyntaxKind.StringLiteral,
                ].includes(ast.initializer?.kind)) {
                    return new arkanalyzer_1.LiteralType(ast.initializer.getText());
                }
                if (arkanalyzer_1.ts.SyntaxKind.TrueKeyword === ast.initializer?.kind) {
                    return new arkanalyzer_1.LiteralType(true);
                }
                if (arkanalyzer_1.ts.SyntaxKind.FalseKeyword === ast.initializer?.kind) {
                    return new arkanalyzer_1.LiteralType(false);
                }
            }
        }
        return undefined;
    }
    /**
     * 获取变量的实际类型
     * @param name 变量名
     * @returns 变量的实际类型
     */
    getTypeByName(name) {
        let type = undefined;
        //先检查是否当前方法入参变量
        this.globalMethod.getParameters().forEach(parameter => {
            if (parameter.getName() === name) {
                type = parameter.getType();
            }
        });
        if (type) {
            return type;
        }
        //再检查是否当前方法的局部变量
        let declarStmt;
        let stmts = this.globalMethod.getBody()?.getCfg().getStmts() ?? [];
        let seekIndex = stmts.length - 1;
        for (let i = 0; i < stmts.length - 1; i++) {
            let stmt = stmts[i];
            if (stmt === this.globalStmt) {
                seekIndex = i;
                break;
            }
        }
        //根据当前Stmt下标，从后往前遍历，找到变量声明语句或者赋值语句
        for (let i = seekIndex; i >= 0; i--) {
            let seekStmt = stmts[i];
            if (seekStmt instanceof arkanalyzer_1.ArkAssignStmt && seekStmt.getLeftOp() instanceof arkanalyzer_1.Local) {
                let leftLocal = seekStmt.getLeftOp();
                if (leftLocal.getName() === name) {
                    declarStmt = seekStmt;
                    break;
                }
            }
        }
        if (!declarStmt) {
            declarStmt = this.getDeclarStmt(stmts, name, seekIndex);
        }
        if (declarStmt instanceof arkanalyzer_1.ArkAssignStmt) {
            type = this.getTypeByArkAssignStmt(declarStmt, name);
        }
        if (!type) {
            let method = this.globalMethod.getDeclaringArkClass().getMethodWithName(name);
            if (method) {
                type = new arkanalyzer_1.FunctionType(method.getSignature());
            }
        }
        return type;
    }
    getDeclarStmt(stmts, name, seekIndex) {
        let declarStmt;
        for (let i = seekIndex; i < stmts.length - 1; i++) {
            let seekStmt = stmts[i];
            if (seekStmt instanceof arkanalyzer_1.ArkAssignStmt &&
                seekStmt.getLeftOp() instanceof arkanalyzer_1.Local) {
                let leftLocal = seekStmt.getLeftOp();
                if (leftLocal.getName() === name) {
                    declarStmt = seekStmt;
                    break;
                }
            }
        }
        return declarStmt;
    }
    getTypeByArkAssignStmt(declarStmt, name) {
        let type = undefined;
        let rightOp = declarStmt.getRightOp();
        let leftOp = declarStmt.getLeftOp();
        type = this.getTypeByArkAssignStmtOther(declarStmt, name);
        // 如果左操作数是联合类型，且右操作数不是undefined，则取右操作数的类型
        if (leftOp.getType() instanceof arkanalyzer_1.UnionType && !(rightOp instanceof Constant_1.UndefinedConstant)) {
            type = rightOp.getType();
        }
        if (!type && leftOp instanceof arkanalyzer_1.Local && leftOp.getConstFlag() &&
            (rightOp instanceof Constant_1.NumberConstant || rightOp instanceof Constant_1.StringConstant || rightOp instanceof Constant_1.BooleanConstant)) {
            return new arkanalyzer_1.LiteralType(rightOp.getValue());
        }
        if (!type && rightOp || (type instanceof arkanalyzer_1.UnknownType && !(rightOp instanceof arkanalyzer_1.UnknownType))) {
            type = rightOp.getType();
        }
        if (type instanceof arkanalyzer_1.UnknownType && leftOp instanceof arkanalyzer_1.Local && rightOp instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            let clsName = rightOp.getBase().getName();
            let arg0 = rightOp.getArg(0);
            if (rightOp.getBase().getType() instanceof arkanalyzer_1.ClassType && clsName === 'Promise' && arg0 && arg0 instanceof arkanalyzer_1.Constant) {
                type = arg0.getType();
            }
        }
        return type;
    }
    getTypeByArkAssignStmtOther(declarStmt, name) {
        let type = undefined;
        let leftOp = declarStmt.getLeftOp();
        let ast = arkanalyzer_1.AstTreeUtils.getASTNode('temp', declarStmt.getOriginalText() ?? '');
        let astNode = ast.statements[0];
        if (leftOp instanceof arkanalyzer_1.Local && (arkanalyzer_1.ts.isVariableStatement(astNode) || arkanalyzer_1.ts.isVariableDeclaration(astNode))) {
            type = this.getVariableType(astNode, name, leftOp);
        }
        if (!type && leftOp.getType()) {
            //如果左操作为有效类型则取左操作数的类型
            type = leftOp.getType();
        }
        return type;
    }
    // 辅助方法：创建和添加问题报告
    reportIssue(node, messageId, results) {
        if (!node) {
            return;
        }
        const { line, character } = this.rootNode.getSourceFile().getLineAndCharacterOfPosition(node?.getStart());
        const assertionName = node?.getText();
        const start = node?.getStart();
        const end = node?.getEnd();
        const endCharacter = character + assertionName.length;
        results.push({
            fileName: this.rootNode.getSourceFile().fileName,
            line: this.line + line,
            startCol: this.col + character,
            endCol: this.col + endCharacter,
            start: start,
            end: end,
            nameStr: assertionName,
            description: this.metaData.messages[messageId],
            messageId: messageId
        });
    }
    // 创建修复对象 
    ruleFix(loc, sourceFile) {
        const [start, end] = this.getFixRange(loc, sourceFile);
        return { range: [start, end], text: '' };
    }
    // 获取起始位置和结束位置
    getFixRange(loc, sourceFile) {
        const startPosition = this.getLineStartPosition(sourceFile, loc.line) + loc.startCol - 1;
        const endPosition = startPosition + loc.end;
        return [startPosition, endPosition];
    }
    // 获取相对全文起始位置
    getLineStartPosition(sourceFile, lineNumber) {
        // 将字符串按行分割成数组
        const lines = sourceFile.getFullText().split('\n');
        // 检查行号是否有效
        if (lineNumber < 1 || lineNumber > lines.length) {
            return 0; // 行号无效，返回 null
        }
        // 计算指定行的起始位置
        let position = 0;
        for (let i = 0; i < lineNumber - 1; i++) {
            position += lines[i].length + 1; // 加 1 是为了包括换行符
        }
        return position;
    }
    addIssueReportNodeFix(loc, arkFile) {
        const filePath = arkFile.getFilePath();
        const severity = this.rule.alert ?? this.metaData.severity;
        if (loc.description) {
            this.metaData.description = loc.description;
        }
        if (loc.nameStr === '?.') {
            const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
            let defectFix = new Defects_1.Defects(loc.line, loc.startCol, loc.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
            let fix = this.ruleFix(loc, sourceFile);
            this.issues.push(new Defects_1.IssueReport(defectFix, fix));
            DefectsList_1.RuleListUtil.push(defectFix);
        }
        else {
            let defect = new Defects_1.Defects(loc.line, loc.startCol, loc.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
            this.issues.push(new Defects_1.IssueReport(defect, undefined));
            DefectsList_1.RuleListUtil.push(defect);
        }
    }
}
exports.NoUnnecessaryConditionCheck = NoUnnecessaryConditionCheck;
