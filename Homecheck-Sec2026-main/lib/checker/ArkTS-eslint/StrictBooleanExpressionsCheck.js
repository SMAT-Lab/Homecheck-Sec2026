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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrictBooleanExpressionsCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const ArkBaseModel_1 = require("arkanalyzer/lib/core/model/ArkBaseModel");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Constant_1 = require("arkanalyzer/lib/core/base/Constant");
const ArkMethodBuilder_1 = require("arkanalyzer/lib/core/model/builder/ArkMethodBuilder");
//strict-boolean-expressions-check
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/strict-boolean-expressions.md',
    description: 'Disallow certain types in boolean expressions',
    requiresTypeChecking: true,
    //将这里面的改成 StrictBooleanExpressionsCheck中需要上报的消息类型
    messages: {
        conditionErrorOther: 'Unexpected value in conditional. ' +
            'A boolean expression is required.',
        conditionErrorAny: 'Unexpected any value in conditional. An explicit comparison or type cast is required.',
        conditionErrorNullish: 'Unexpected nullish value in conditional. The condition is always false.',
        conditionErrorNullableBoolean: 'Unexpected nullable boolean value in conditional. ' +
            'Please handle the nullish case explicitly.',
        conditionErrorString: 'Unexpected string value in conditional. ' +
            'An explicit empty string check is required.',
        conditionErrorNullableString: 'Unexpected nullable string value in conditional. ' +
            'Please handle the nullish/empty cases explicitly.',
        conditionErrorNumber: 'Unexpected number value in conditional. ' +
            'An explicit zero/NaN check is required.',
        conditionErrorNullableNumber: 'Unexpected nullable number value in conditional. ' +
            'Please handle the nullish/zero/NaN cases explicitly.',
        conditionErrorObject: 'Unexpected object value in conditional. ' +
            'The condition is always true.',
        conditionErrorNullableObject: 'Unexpected nullable object value in conditional. ' +
            'An explicit null check is required.',
        conditionErrorNullableEnum: 'Unexpected nullable enum value in conditional. ' +
            'Please handle the nullish/zero/NaN cases explicitly.',
        noStrictNullCheck: 'This rule requires the `strictNullChecks` compiler option to be turned on to function correctly.',
        conditionFixDefaultFalse: 'Explicitly treat nullish value the same as false (`value ?? false`)',
        conditionFixDefaultEmptyString: 'Explicitly treat nullish value the same as an empty string (`value ?? \'\'`)',
        conditionFixDefaultZero: 'Explicitly treat nullish value the same as 0 (`value ?? 0`)',
        conditionFixCompareNullish: 'Change condition to check for null/undefined (`value != null`)',
        conditionFixCastBoolean: 'Explicitly cast value to a boolean (`Boolean(value)`)',
        conditionFixCompareTrue: 'Change condition to check if true (`value === true`)',
        conditionFixCompareFalse: 'Change condition to check if false (`value === false`)',
        conditionFixCompareStringLength: 'Change condition to check string\'s length (`value.length !== 0`)',
        conditionFixCompareEmptyString: 'Change condition to check for empty string (`value !== \'\'`)',
        conditionFixCompareZero: 'Change condition to check for 0 (`value !== 0`)',
        conditionFixCompareNaN: 'Change condition to check for NaN (`!Number.isNaN(value)`)',
    }
};
const a_r = new RegExp(/\[|\]/g);
const b_r = new RegExp(/\s*/g);
const c_r = new RegExp(/[()]/g);
const d_r = new RegExp(/\[([^\]]+)\]/g);
const ConstantType = [Constant_1.StringConstant, Constant_1.NumberConstant, Constant_1.BooleanConstant];
class StrictBooleanExpressionsCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    line = 0;
    col = 0;
    locationInfos = [];
    globalStmt;
    rootNode;
    globalMethod;
    option;
    traversedNodes = new Map();
    globalStmtCode;
    checkLocalIsReplace = false;
    useMethod = [];
    types;
    typeCache = new Map();
    defaultOptions = {
        allowString: true,
        allowNumber: true,
        allowNullableObject: true,
        allowNullableBoolean: false,
        allowNullableString: false,
        allowNullableNumber: false,
        allowNullableEnum: false,
        allowAny: false,
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
        this.option = this.rule && this.rule.option[0] ? this.rule.option[0] : this.defaultOptions;
        arkFile.getClasses().forEach(cls => this.checkClass(cls));
        this.sortAndReportErrors(arkFile);
        // 输出结果
        this.locationInfos.forEach(loc => {
            this.addIssueReportNodeFix(loc, arkFile);
        });
    };
    isConditionNode(node) {
        return arkanalyzer_1.ts.isIfStatement(node) ||
            arkanalyzer_1.ts.isForStatement(node) ||
            arkanalyzer_1.ts.isWhileStatement(node) ||
            arkanalyzer_1.ts.isDoStatement(node) ||
            arkanalyzer_1.ts.isConditionalExpression(node);
    }
    /**
     * 处理逻辑非表达式(!)
     * @param stmt
     * @param node
     * @param results
     */
    traverseUnaryLogicalExpression(stmt, node, results) {
        if (!node.kind) {
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            stmt = stmt.getRightOp();
        }
        if (stmt instanceof arkanalyzer_1.Local && stmt.getDeclaringStmt() && stmt.getName().includes('%')) {
            let decalarationStmt = stmt.getDeclaringStmt();
            this.traverseUnaryLogicalExpression(decalarationStmt, node, results);
            return;
        }
        this.traverseNode(stmt, node, results, true, true);
    }
    traverseNode(stmt, node, results, isCondition = false, isUnary = false, count = 0) {
        if (count > 5 || !node.kind) {
            return;
        }
        count++;
        if (stmt instanceof arkanalyzer_1.Local && stmt.getName().includes('%') &&
            stmt.getType() instanceof arkanalyzer_1.BooleanType) {
            stmt = stmt.getDeclaringStmt() ?? stmt;
        }
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            stmt = stmt.getRightOp();
        }
        // for logical operator, we check its operands 
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr &&
            stmt.getOperator() !== '??') {
            this.traverseLogicalExpression(stmt, node, results, isCondition, count);
            return;
        }
        // skip if node is not a condition
        if (!isCondition) {
            return;
        }
        let nodes = this.traversedNodes.get(this.globalStmtCode) ?? new Set();
        if (nodes.has(stmt)) {
            return;
        }
        nodes.add(stmt);
        this.traversedNodes.set(this.globalStmtCode, nodes);
        this.checkNode(stmt, node, results, isUnary);
    }
    /**
     * 处理逻辑与表达式(&&、||)
     */
    traverseLogicalExpression(stmt, node, results, isCondition = false, count = 0) {
        if (!node.kind) {
            return;
        }
        if (arkanalyzer_1.ts.isParenthesizedExpression(node)) {
            this.traverseLogicalExpression(stmt, node.expression, results, isCondition);
            return;
        }
        if (arkanalyzer_1.ts.isBinaryExpression(node) && stmt instanceof arkanalyzer_1.ArkNormalBinopExpr &&
            [arkanalyzer_1.NormalBinaryOperator.LogicalAnd, arkanalyzer_1.NormalBinaryOperator.LogicalOr].some(logic => stmt.getOperator() === logic)) {
            if (arkanalyzer_1.ts.SyntaxKind.BarBarEqualsToken === node.operatorToken.kind) {
                this.traverseLogicalExpression(stmt.getOp2(), node.right, results, isCondition);
                return;
            }
            let op1 = stmt.getOp1();
            let op2 = stmt.getOp2();
            this.traverseNode(op1, node.left, results, true, false, count);
            this.traverseNode(op2, node.right, results, isCondition, false, count);
        }
    }
    /**
     * 处理if语句的测试表达式
     * @param Ifstmt
     * @param node
     * @param results
     * @returns
     */
    traverseTestExpression(Ifstmt, node, results) {
        let stmt = Ifstmt.getConditionExpr();
        if (!(stmt instanceof arkanalyzer_1.ArkConditionExpr)) {
            return;
        }
        const operator = stmt.getOperator();
        if (operator !== '!=' && operator !== '&&' && operator !== '||') {
            return;
        }
        if (!this.isConditionNode(node)) {
            this.checkLocalIsReplace = false;
            node = this.checkLocal(stmt, stmt.toString(), node) ?? node;
            node = arkanalyzer_1.ts.isParenthesizedExpression(node.parent) ? node.parent : node;
            node = this.isConditionNode(node.parent) ? node.parent : node;
        }
        let test = node;
        if (arkanalyzer_1.ts.isDoStatement(node) || arkanalyzer_1.ts.isIfStatement(node) || arkanalyzer_1.ts.isWhileStatement(node)) {
            node = node.expression;
        }
        if (arkanalyzer_1.ts.isConditionalExpression(node) || arkanalyzer_1.ts.isForStatement(node)) {
            if (node.condition) {
                node = node.condition;
            }
        }
        this.checkArkCondition(stmt, node, test, results);
    }
    checkArkCondition(stmt, node, test, results) {
        if (stmt instanceof arkanalyzer_1.ArkConditionExpr && stmt.getOp1() instanceof arkanalyzer_1.Local) {
            let op1 = stmt.getOp1();
            let decalarationStmt = op1.getDeclaringStmt();
            if (decalarationStmt instanceof arkanalyzer_1.ArkAssignStmt) {
                if (op1.getName().includes('%') && decalarationStmt.getRightOp() instanceof arkanalyzer_1.ArkNormalBinopExpr) {
                    stmt = decalarationStmt;
                }
            }
        }
        if (this.isConditionNode(test)) {
            this.traverseNode(stmt, node, results, true);
        }
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
        let originCode = arkStmt.getOriginalText() ?? '';
        const astNode = arkanalyzer_1.AstTreeUtils.getASTNode('temp', originCode);
        if (!this.traversedNodes.has(originCode)) {
            this.globalStmtCode = originCode;
            this.traversedNodes.set(originCode, new Set());
        }
        if (astNode) {
            this.locationInfos.push(...this.checkCondition(astNode));
        }
    }
    checkNodePre(stmt, node, results) {
        if (!node.kind) {
            return;
        }
        if (arkanalyzer_1.ts.isParenthesizedExpression(node)) {
            this.checkNodePre(stmt, node.expression, results);
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkReturnStmt) {
            stmt = stmt.getOp();
        }
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            let rightOp = stmt.getRightOp();
            if (ConstantType.some(value => rightOp instanceof value) &&
                [arkanalyzer_1.ArkNormalBinopExpr, arkanalyzer_1.ArkConditionExpr].every(value => !(rightOp instanceof value))) {
                return;
            }
            if (!(rightOp instanceof Constant_1.UndefinedConstant)) {
                stmt = rightOp;
            }
        }
        this.checkNominalType(stmt, node, results);
    }
    checkNominalType(stmt, node, results) {
        if (stmt instanceof arkanalyzer_1.Local && stmt.getDeclaringStmt() && stmt.getName().includes('%')) {
            //处理这种嵌套的逻辑表达式(a || b) && c
            let decalarationStmt = stmt.getDeclaringStmt();
            this.checkNodePre(decalarationStmt, node, results);
            return;
        }
        if ((stmt instanceof arkanalyzer_1.ArkNormalBinopExpr &&
            (!arkanalyzer_1.ts.isBinaryExpression(node) ||
                node.right.getText() !== stmt.getOp2().toString())) || stmt instanceof arkanalyzer_1.ArkUnopExpr) {
            this.checkLocalIsReplace = false;
            node = this.checkLocal(stmt, stmt.toString(), node) ?? node;
        }
        if (!node.kind) {
            return;
        }
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr &&
            stmt.getOperator() !== arkanalyzer_1.NormalBinaryOperator.NullishCoalescing && node &&
            arkanalyzer_1.ts.isBinaryExpression(node)) {
            this.traverseLogicalExpression(stmt, node, results);
            return;
        }
        if (node && arkanalyzer_1.ts.isPrefixUnaryExpression(node)) {
            if (stmt instanceof arkanalyzer_1.ArkUnopExpr && stmt.getOperator() === arkanalyzer_1.UnaryOperator.LogicalNot) {
                this.traverseUnaryLogicalExpression(stmt.getOp(), node, results);
            }
        }
    }
    getTypeWithCondition(stmt, node) {
        let op1 = stmt.getOp1();
        let op2 = stmt.getOp2();
        let operator = stmt.getOperator();
        let op1Type = this.getConstrainedType(op1, node);
        node = arkanalyzer_1.ts.isParenthesizedExpression(node) ? node.expression : node;
        //如果条件表达式是a=1,则op1Type为1
        if (arkanalyzer_1.ts.isIdentifier(node) && arkanalyzer_1.ts.isBinaryExpression(node.parent)) {
            node = node.parent;
        }
        if (arkanalyzer_1.ts.isBinaryExpression(node)) {
            //这个符号底座暂时解析出来和||没区别，比如a||=b,补全写法为a= a||b,这个时候a的类型为Any
            if (op1 instanceof arkanalyzer_1.Local && node.left.getText() === op1.getName() &&
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.BarBarEqualsToken) {
                return arkanalyzer_1.AnyType.getInstance();
            }
            if (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken &&
                ['false', '0', '', 'undefined'].includes(node.right.getText())) {
                if (arkanalyzer_1.ts.isLiteralExpression(node.right)) {
                    op1Type = new arkanalyzer_1.LiteralType(node.right.text);
                }
                else if (arkanalyzer_1.ts.isParenthesizedExpression(node.right) && arkanalyzer_1.ts.isLiteralExpression(node.right.expression)) {
                    op1Type = new arkanalyzer_1.LiteralType(node.right.expression.text);
                }
            }
            if (!(op1Type instanceof arkanalyzer_1.LiteralType) &&
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
                return op1Type;
            }
        }
        let op2Type = this.getConstrainedType(op2, node);
        if (node && !arkanalyzer_1.ts.isBinaryExpression(node) && !(op1Type instanceof arkanalyzer_1.LiteralType) && operator === '!=') {
            if ([arkanalyzer_1.LiteralType, arkanalyzer_1.NumberType, arkanalyzer_1.StringType, arkanalyzer_1.BooleanType, arkanalyzer_1.UndefinedType, arkanalyzer_1.NullType].
                some(ty => op2Type instanceof ty)) {
                return op1Type;
            }
        }
        return arkanalyzer_1.BooleanType.getInstance();
    }
    getTypeWithNew(stmt, node) {
        let type = undefined;
        if (arkanalyzer_1.ts.isNewExpression(node) && node.arguments && node.arguments[0] && arkanalyzer_1.ts.isLiteralExpression(node.arguments[0])) {
            let argument = node.arguments[0];
            if (argument.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword) {
                type = new arkanalyzer_1.LiteralType(true);
            }
            if (argument.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword) {
                type = new arkanalyzer_1.LiteralType(false);
            }
            if (arkanalyzer_1.ts.isStringLiteral(argument) ||
                arkanalyzer_1.ts.isNumericLiteral(argument) ||
                arkanalyzer_1.ts.isBigIntLiteral(argument)) {
                type = new arkanalyzer_1.LiteralType(argument.text);
            }
            return type;
        }
        return stmt.getClassType();
    }
    getClassInstanceType(fieldName, clsName, isField) {
        let baseCls = this.globalMethod.getDeclaringArkClass().getDeclaringArkFile().getClassWithName(clsName);
        if (!baseCls) {
            return undefined;
        }
        if (isField) {
            let clsField = baseCls.getFieldWithName(fieldName);
            let clsFieldTy = clsField?.getSignature().getType();
            if (clsField && clsFieldTy) {
                return clsField.getQuestionToken() ? new arkanalyzer_1.UnionType([clsFieldTy, arkanalyzer_1.UndefinedType.getInstance()]) : clsFieldTy;
            }
        }
        else {
            let method = baseCls.getMethodWithName(fieldName);
            if (method) {
                let functionty = new arkanalyzer_1.FunctionType(method.getSignature());
                return method?.getQuestionToken() ? new arkanalyzer_1.UnionType([functionty, arkanalyzer_1.UndefinedType.getInstance()
                ]) : functionty;
            }
        }
        return undefined;
    }
    getTypeWithInvoke(stmt, node) {
        let type = new arkanalyzer_1.FunctionType(stmt.getMethodSignature());
        const methodName = stmt.getMethodSignature().getMethodSubSignature().getMethodName();
        const method = this.globalMethod.getDeclaringArkClass().getMethodWithName(methodName);
        if (methodName.includes('sNaN')) {
            return arkanalyzer_1.BooleanType.getInstance();
        }
        if (stmt instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            let base = stmt.getBase();
            let baseType = base.getType();
            if (baseType instanceof arkanalyzer_1.ClassType) {
                let clsName = baseType.getClassSignature().getClassName();
                let clstype = this.getClassTypeWithClsName(stmt, clsName, methodName);
                return clstype ? clstype : this.getClassInstanceType(methodName, clsName, false) ?? baseType;
            }
            if (methodName === 'includes') {
                return arkanalyzer_1.BooleanType.getInstance();
            }
            return stmt.getMethodSignature().getMethodSubSignature().getReturnType();
        }
        if (stmt instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            let clsName = method?.getSignature().getDeclaringClassSignature().getClassName();
            return clsName ? arkanalyzer_1.BooleanType.getInstance() : ['Boolean', 'Number', 'String'].includes(methodName) ?
                arkanalyzer_1.BooleanType.getInstance() : arkanalyzer_1.UnknownType.getInstance();
        }
        if (!type && method) {
            type = method.getReturnType();
            if (type instanceof arkanalyzer_1.VoidType && method.containsModifier(ArkBaseModel_1.ModifierType.ASYNC)) {
                type = new arkanalyzer_1.UnclearReferenceType('Promise', [arkanalyzer_1.AnyType.getInstance()]);
            }
            return type;
        }
        return type;
    }
    getClassTypeWithClsName(stmt, clsName, methodName) {
        if (clsName === 'Promise') {
            return new arkanalyzer_1.UnclearReferenceType('Promise', [stmt.getBase().getType()]);
        }
        if (clsName === 'RegExp') {
            switch (methodName) {
                case 'test':
                    return arkanalyzer_1.BooleanType.getInstance();
                case 'exec':
                    return new arkanalyzer_1.UnionType([new arkanalyzer_1.UnclearReferenceType('RegExpExecArray', [arkanalyzer_1.AnyType.getInstance()]), arkanalyzer_1.NullType.getInstance()]);
                case 'toString':
                    return arkanalyzer_1.StringType.getInstance();
                case 'compile':
                    return new arkanalyzer_1.UnclearReferenceType('RegExp', [arkanalyzer_1.AnyType.getInstance()]);
                default:
                    return arkanalyzer_1.UnknownType.getInstance();
            }
        }
        return undefined;
    }
    getTypeWithLocal(stmt, node, count) {
        let type = undefined;
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
            const leftOp = stmt.getLeftOp();
            const rightOp = stmt.getRightOp();
            if (leftOp instanceof arkanalyzer_1.Local && !leftOp.getName().includes('%')) {
                if (ConstantType.some(ty => rightOp instanceof ty)) {
                    return leftOp.getConstFlag() ? new arkanalyzer_1.LiteralType(rightOp.getValue()) : rightOp.getType();
                }
                type = this.getConstrainedType(leftOp, node, count);
            }
            //左侧没有声明，则通过右侧的类型推断
            if (!type || type instanceof arkanalyzer_1.UnknownType) {
                return this.getConstrainedType(rightOp, node, count);
            }
        }
        if (stmt instanceof arkanalyzer_1.Local) {
            if (!stmt.getName().includes('%')) {
                type = this.getTypeByName(stmt.getName());
            }
            let decalarationStmt = stmt.getDeclaringStmt();
            if (!type && decalarationStmt) {
                return this.getConstrainedType(decalarationStmt, node, count);
            }
            if (['Infinity', 'NaN'].includes(stmt.getName())) {
                return arkanalyzer_1.NumberType.getInstance();
            }
            //如果变量声明没有类型，则通过声明语句获取类型
            if (!type && stmt.getType()) {
                type = stmt.getType();
            }
            if (type instanceof arkanalyzer_1.GenericType) {
                type = type.getConstraint() ? type.getConstraint() : type.getDefaultType() ??
                    arkanalyzer_1.AnyType.getInstance();
            }
        }
        return type;
    }
    getTypesByUnionType(type) {
        if (type instanceof arkanalyzer_1.UnionType || type instanceof arkanalyzer_1.IntersectionType) {
            return type.getTypes();
        }
        return [type];
    }
    getTypeWithOtherValue(stmt, node, count) {
        if (stmt instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            let field = stmt.getFieldSignature();
            let fieldTy = field.getType();
            let fieldBaseTy = stmt.getBase().getType();
            if (fieldBaseTy instanceof arkanalyzer_1.ClassType) {
                return this.getClassInstanceType(field.getFieldName(), fieldBaseTy.getClassSignature().getClassName(), !(fieldTy instanceof arkanalyzer_1.FunctionType)) ?? fieldTy;
            }
            if (stmt.getBase().getType() instanceof arkanalyzer_1.ArrayType && stmt.getFieldSignature().getFieldName() === 'length') {
                return arkanalyzer_1.NumberType.getInstance();
            }
            if (field.getType() instanceof arkanalyzer_1.UnknownType) {
                let clsty = this.getTypesByUnionType(stmt.getBase().getType()).find(ty => ty instanceof arkanalyzer_1.ClassType);
                let cls = this.globalMethod.getDeclaringArkClass().getDeclaringArkFile()
                    .getClassWithName(clsty?.getClassSignature().getClassName());
                let clsField = cls?.getFieldWithName(stmt.getFieldSignature().getFieldName());
                return clsField?.getType() ?? arkanalyzer_1.UnknownType.getInstance();
            }
            return field.getType();
        }
        if (stmt instanceof arkanalyzer_1.ArkAwaitExpr) {
            let type = this.getConstrainedType(stmt.getPromise(), node, count);
            if (type instanceof arkanalyzer_1.UnclearReferenceType && type.getName() === 'Promise') {
                return type.getGenericTypes()[0];
            }
            return type;
        }
        if (stmt instanceof arkanalyzer_1.AbstractInvokeExpr) {
            //调用表达式，如果是调用方法，则判断其方法返回类型
            return this.getTypeWithInvoke(stmt, node);
        }
        if (stmt instanceof arkanalyzer_1.ArkNewArrayExpr) {
            return new arkanalyzer_1.ArrayType(stmt.getBaseType(), 1);
        }
        if (stmt instanceof arkanalyzer_1.AbstractFieldRef) {
            //变量使用，其中包含了调用变量例如：a.b.c
            const fieldSignature = stmt.getFieldSignature();
            return fieldSignature.getType();
        }
        if (stmt instanceof arkanalyzer_1.ArkPtrInvokeExpr ||
            stmt instanceof arkanalyzer_1.ArkParameterRef) {
            return stmt.getType();
        }
        return undefined;
    }
    getConstrainedType(stmt, node, count = 0) {
        if (count > 10) {
            return undefined;
        }
        count++;
        let type = undefined;
        if (stmt instanceof arkanalyzer_1.ArkConditionExpr) {
            return this.getTypeWithCondition(stmt, node);
        }
        if (stmt instanceof arkanalyzer_1.ArkTypeOfExpr && arkanalyzer_1.ts.isTypeOfExpression(node)) {
            return this.getConstrainedType(stmt.getOp(), node);
        }
        if (stmt instanceof arkanalyzer_1.ArkNewExpr) {
            return this.getTypeWithNew(stmt, node);
        }
        //字面量类型
        if (stmt instanceof arkanalyzer_1.Constant) {
            return ConstantType.some(ty => stmt instanceof ty) ?
                this.getLiteralType(stmt) : stmt.getType();
        }
        if (stmt instanceof arkanalyzer_1.ArkAssignStmt || stmt instanceof arkanalyzer_1.Local) {
            return this.getTypeWithLocal(stmt, node, count);
        }
        if (stmt instanceof arkanalyzer_1.ClassType) {
            type = stmt;
        }
        return this.getTypeWithOtherValue(stmt, node, count);
    }
    getLiteralType(stmt) {
        let literal = new arkanalyzer_1.LiteralType(stmt.getValue());
        if (stmt instanceof Constant_1.BooleanConstant) {
            literal = new arkanalyzer_1.LiteralType(stmt.getValue() === 'true');
        }
        if (stmt instanceof Constant_1.StringConstant) {
            literal = new arkanalyzer_1.LiteralType(stmt.getValue());
        }
        if (stmt instanceof Constant_1.NumberConstant) {
            literal = new arkanalyzer_1.LiteralType(Number(stmt.getValue()));
        }
        return literal;
    }
    /**
     * 获取变量的实际类型
     * @param name 变量名
     * @returns 变量的实际类型
     */
    getTypeByName(name, arkMethod = this.globalMethod) {
        let type = undefined;
        //先检查是否当前方法入参变量
        arkMethod.getParameters().forEach(parameter => {
            if (parameter instanceof ArkMethodBuilder_1.MethodParameter && parameter.getName() === name) {
                let paramType = parameter.getType();
                type = parameter.isOptional() ? [arkanalyzer_1.StringType, arkanalyzer_1.BooleanType, arkanalyzer_1.NumberType].some(ty => paramType instanceof ty) ?
                    new arkanalyzer_1.UnionType([parameter.getType(), arkanalyzer_1.UndefinedType.getInstance()]) : arkanalyzer_1.AnyType.getInstance() : paramType;
            }
        });
        if (type) {
            return type;
        }
        //再检查是否当前方法的局部变量
        const declarStmt = this.getFindVariableStmt(name, arkMethod);
        if (declarStmt instanceof arkanalyzer_1.ArkAssignStmt) {
            type = this.inAssignStmt(declarStmt, name, type);
        }
        //当前方法没找到，则检查全局变量
        let defaultMethod = arkMethod.getDeclaringArkClass().getDefaultArkMethod();
        if (!type && defaultMethod && arkMethod !== defaultMethod) {
            return this.getTypeByName(name, defaultMethod);
        }
        if (!type) {
            let arkFile = arkMethod.getDeclaringArkClass().getDeclaringArkFile();
            let method = undefined;
            for (const arkClass of arkFile.getClasses()) {
                method = arkClass.getMethods().find(method => method.getName() === name);
                if (method) {
                    break; // 找到匹配的 method 后立即退出循环
                }
            }
            if (method) {
                type = new arkanalyzer_1.FunctionType(method.getSignature());
            }
        }
        return type;
    }
    getVariableType(ast, name, leftOp) {
        if (arkanalyzer_1.ts.isVariableStatement(ast)) {
            let declaration = ast.declarationList.declarations.find(declaration => arkanalyzer_1.ts.isIdentifier(declaration.name) && declaration.name.getText() === name);
            if (declaration) {
                return this.getVariableType(declaration, name, leftOp);
            }
        }
        if (arkanalyzer_1.ts.isBinaryExpression(ast) && ast.right && ast.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
            if ([
                arkanalyzer_1.ts.SyntaxKind.NumericLiteral,
                arkanalyzer_1.ts.SyntaxKind.StringLiteral,
            ].includes(ast.right.kind)) {
                return new arkanalyzer_1.LiteralType(ast.right.getText());
            }
            if (arkanalyzer_1.ts.SyntaxKind.TrueKeyword === ast.right.kind) {
                return new arkanalyzer_1.LiteralType(true);
            }
            if (arkanalyzer_1.ts.SyntaxKind.FalseKeyword === ast.right.kind) {
                return new arkanalyzer_1.LiteralType(false);
            }
        }
        if (arkanalyzer_1.ts.isVariableDeclaration(ast)) {
            if (!ast.type && !ast.initializer) {
                return arkanalyzer_1.UndefinedType.getInstance();
            }
            if (ast.type) {
                return this.getTypeByAst(ast.type);
            }
            if (ast.initializer) {
                if (leftOp.getConstFlag() && [
                    arkanalyzer_1.ts.SyntaxKind.NumericLiteral,
                    arkanalyzer_1.ts.SyntaxKind.StringLiteral,
                ].includes(ast.initializer.kind)) {
                    return new arkanalyzer_1.LiteralType(ast.initializer.getText());
                }
                if (arkanalyzer_1.ts.SyntaxKind.TrueKeyword === ast.initializer.kind) {
                    return new arkanalyzer_1.LiteralType(true);
                }
                if (arkanalyzer_1.ts.SyntaxKind.FalseKeyword === ast.initializer.kind) {
                    return new arkanalyzer_1.LiteralType(false);
                }
            }
        }
        return undefined;
    }
    getTypeByAst(ast) {
        switch (ast.kind) {
            case arkanalyzer_1.ts.SyntaxKind.StringKeyword:
                return arkanalyzer_1.StringType.getInstance();
            case arkanalyzer_1.ts.SyntaxKind.NumberKeyword:
                return arkanalyzer_1.NumberType.getInstance();
            case arkanalyzer_1.ts.SyntaxKind.BooleanKeyword:
                return arkanalyzer_1.BooleanType.getInstance();
            case arkanalyzer_1.ts.SyntaxKind.ObjectKeyword:
                return new arkanalyzer_1.UnclearReferenceType('Object', [arkanalyzer_1.AnyType.getInstance()]);
            case arkanalyzer_1.ts.SyntaxKind.LiteralType:
                return this.getTypeByAst(ast.literal);
            case arkanalyzer_1.ts.SyntaxKind.NullKeyword:
                return arkanalyzer_1.NullType.getInstance();
            case arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword:
                return arkanalyzer_1.UndefinedType.getInstance();
        }
        if (arkanalyzer_1.ts.isUnionTypeNode(ast) || arkanalyzer_1.ts.isIntersectionTypeNode(ast)) {
            let tys = ast.types.map(type => this.getTypeByAst(type));
            let filtertys = tys.filter((ty) => ty !== undefined);
            return new arkanalyzer_1.UnionType(filtertys);
        }
        return undefined;
    }
    inAssignStmt(declarStmt, name, type) {
        let rightOp = declarStmt.getRightOp();
        let leftOp = declarStmt.getLeftOp();
        let ast = arkanalyzer_1.AstTreeUtils.getASTNode('temp', declarStmt.getOriginalText() ?? '');
        let astNode = ast.statements[0];
        if (astNode && arkanalyzer_1.ts.isExpressionStatement(astNode)) {
            astNode = astNode.expression;
        }
        if (rightOp instanceof arkanalyzer_1.ArkPtrInvokeExpr) {
            let methodName = rightOp.getMethodSignature().getMethodSubSignature().getMethodName();
            let method = this.globalMethod.getDeclaringArkClass().getMethodWithName(methodName);
            return method?.getSignature().getMethodSubSignature().getReturnType();
        }
        if (rightOp instanceof arkanalyzer_1.ArkUnopExpr) {
            return arkanalyzer_1.BooleanType.getInstance();
        }
        return this.checkAssignStmtType(leftOp, rightOp, astNode, name, type);
    }
    checktsNodeType(leftOp, astNode, name, type) {
        if (astNode) {
            if (arkanalyzer_1.ts.isVariableStatement(astNode) || arkanalyzer_1.ts.isVariableDeclaration(astNode)) {
                type = this.getVariableType(astNode, name, leftOp);
            }
            if (arkanalyzer_1.ts.isBinaryExpression(astNode) && astNode.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsToken) {
                type = this.getVariableType(astNode, name, leftOp);
            }
        }
        return type;
    }
    checkAssignStmtType(leftOp, rightOp, astNode, name, type) {
        if (leftOp instanceof arkanalyzer_1.Local) {
            type = this.checktsNodeType(leftOp, astNode, name, type);
        }
        if (!type && leftOp.getType()) {
            //如果左操作为有效类型则取左操作数的类型
            type = leftOp.getType();
        }
        // 如果左操作数是联合类型，且右操作数不是undefined，则取右操作数的类型
        if (leftOp.getType() instanceof arkanalyzer_1.UnionType && !(rightOp instanceof Constant_1.UndefinedConstant)) {
            type = rightOp.getType();
        }
        if (!type && leftOp instanceof arkanalyzer_1.Local &&
            ConstantType.some(ty => rightOp instanceof ty)) {
            return new arkanalyzer_1.LiteralType(rightOp.getValue());
        }
        if (!type && rightOp) {
            type = rightOp.getType();
        }
        if (type instanceof arkanalyzer_1.UnknownType && rightOp instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            let base = rightOp.getBase();
            if (base.getType() instanceof arkanalyzer_1.ClassType && base.getName() === 'Promise') {
                let arg0 = rightOp.getArg(0);
                let tys = arg0 instanceof arkanalyzer_1.Constant ? [arg0.getType()] : [arkanalyzer_1.AnyType.getInstance()];
                type = new arkanalyzer_1.UnclearReferenceType('Promise', tys);
            }
        }
        return type;
    }
    getFindVariableStmt(name, arkMethod) {
        let declarStmt;
        let stmts = arkMethod.getBody()?.getCfg().getStmts() ?? [];
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
            declarStmt = this.getVariableStmtTraversal(name, stmts[i]);
            if (declarStmt) {
                break;
            }
        }
        if (!declarStmt) {
            for (let i = seekIndex; i < stmts.length - 1; i++) {
                declarStmt = this.getVariableStmtTraversal(name, stmts[i]);
                if (declarStmt) {
                    break;
                }
            }
        }
        return declarStmt;
    }
    getVariableStmtTraversal(name, seekStmt) {
        let declarStmt;
        if (seekStmt instanceof arkanalyzer_1.ArkAssignStmt &&
            this.globalStmt.getOriginalText() !== seekStmt.getOriginalText() && seekStmt.getLeftOp() instanceof arkanalyzer_1.Local) {
            let leftLocal = seekStmt.getLeftOp();
            if (leftLocal.getName() === name) {
                declarStmt = seekStmt;
            }
        }
        return declarStmt;
    }
    is(...wantedTypes) {
        return this.types.size === wantedTypes.length &&
            wantedTypes.every(type => this.types.has(type));
    }
    checkNothing() {
        // boolean
        if (this.is('boolean') || this.is('truthy boolean')) {
            // boolean is always okay
            return true;
        }
        // never
        if (this.is('never')) {
            // never is always okay
            return true;
        }
        return false;
    }
    checkNullish(node, results) {
        // nullish
        if (this.is('nullish')) {
            // condition is always false
            this.reportIssue(node, 'conditionErrorNullish', results);
            return true;
        }
        // Known edge case: boolean `true` and nullish values are always valid boolean expressions
        if (this.is('nullish', 'truthy boolean')) {
            return true;
        }
        // nullable boolean
        if (this.is('nullish', 'boolean')) {
            if (!this.option.allowNullableBoolean) {
                this.reportIssue(node, 'conditionErrorNullableBoolean', results);
            }
            return true;
        }
        // Known edge case: truthy primitives and nullish values are always valid boolean expressions
        if ((this.option.allowNumber && this.is('nullish', 'truthy number')) ||
            (this.option.allowString && this.is('nullish', 'truthy string'))) {
            return true;
        }
        return false;
    }
    checkString(node, results) {
        // string
        if (this.is('string') || this.is('truthy string')) {
            if (!this.option.allowString) {
                this.reportIssue(node, 'conditionErrorString', results);
            }
            return true;
        }
        // nullable string
        if (this.is('nullish', 'string')) {
            if (!this.option.allowNullableString) {
                this.reportIssue(node, 'conditionErrorNullableString', results);
            }
            return true;
        }
        return false;
    }
    checkNumber(node, results) {
        // number
        if (this.is('number') || this.is('truthy number')) {
            if (!this.option.allowNumber) {
                this.reportIssue(node, 'conditionErrorNumber', results);
            }
            return true;
        }
        // nullable number
        if (this.is('nullish', 'number')) {
            if (!this.option.allowNullableNumber) {
                this.reportIssue(node, 'conditionErrorNullableNumber', results);
            }
            return true;
        }
        return false;
    }
    checkObject(node, results) {
        // object
        if (this.is('object')) {
            // condition is always true
            this.reportIssue(node, 'conditionErrorObject', results);
            return true;
        }
        // nullable object
        if (this.is('nullish', 'object')) {
            if (!this.option.allowNullableObject) {
                this.reportIssue(node, 'conditionErrorNullableObject', results);
            }
            return true;
        }
        return false;
    }
    checkAny(node, results) {
        // nullable enum
        if (this.is('nullish', 'number', 'enum') ||
            this.is('nullish', 'string', 'enum') ||
            this.is('nullish', 'truthy number', 'enum') ||
            this.is('nullish', 'truthy string', 'enum') ||
            // mixed enums
            this.is('nullish', 'truthy number', 'truthy string', 'enum') ||
            this.is('nullish', 'truthy number', 'string', 'enum') ||
            this.is('nullish', 'truthy string', 'number', 'enum') ||
            this.is('nullish', 'number', 'string', 'enum')) {
            if (!this.option.allowNullableEnum) {
                this.reportIssue(node, 'conditionErrorNullableEnum', results);
            }
            return true;
        }
        // any
        if (this.is('any')) {
            if (!this.option.allowAny) {
                this.reportIssue(node, 'conditionErrorAny', results);
            }
            return true;
        }
        return false;
    }
    checkreportedNode(node, results, isUnary) {
        if (!node) {
            return;
        }
        if (this.checkNothing()) {
            return;
        }
        if (this.checkNullish(node, results)) {
            return;
        }
        if (this.checkString(node, results)) {
            return;
        }
        if (this.checkNumber(node, results)) {
            return;
        }
        if (this.checkObject(node, results)) {
            return;
        }
        if (this.checkAny(node, results)) {
            return;
        }
        this.reportIssue(node, 'conditionErrorOther', results);
    }
    checkNode(stmt, node, results, isUnary = false) {
        if (node) {
            // 生成缓存的唯一键，可以根据 stmt 和 node 的特性生成
            const cacheKey = `${stmt.toString()}-${node.getText()}`; // 这里可以根据需要生成唯一键
            let type = undefined;
            // 检查缓存中是否已有类型
            if (this.typeCache.has(cacheKey)) {
                type = this.typeCache.get(cacheKey);
            }
            if (!type) {
                type = this.getConstrainedType(stmt, node);
            }
            if (!type) {
                return;
            }
            node = this.getReportedNode(node);
            this.types = this.inspectVariantTypes(this.unionTypeParts(type));
            this.checkreportedNode(node, results, isUnary);
        }
    }
    isTypeFlagSet(type, types) {
        return types.some(t => type.toString() === t.toString());
    }
    isTrueLiteralType(type) {
        return type instanceof arkanalyzer_1.LiteralType && type.getLiteralName() === true;
    }
    inspectVariantConstTypes(types, variantTypes) {
        const booleans = types.filter(type => this.isTypeFlagSet(type, [arkanalyzer_1.BooleanType.getInstance(), new arkanalyzer_1.LiteralType(true), new arkanalyzer_1.LiteralType(false)]));
        if (booleans.length === 1) {
            this.isTrueLiteralType(booleans[0]) ? variantTypes.add('truthy boolean') : variantTypes.add('boolean');
        }
        else if (booleans.length === 2) {
            variantTypes.add('boolean');
        }
        const strings = types.filter(type => (type instanceof arkanalyzer_1.LiteralType && typeof type.getLiteralName() === 'string') || this.isTypeFlagSet(type, [arkanalyzer_1.StringType.getInstance()]));
        if (strings.length) {
            if (strings.every(type => type instanceof arkanalyzer_1.LiteralType &&
                typeof type.getLiteralName() === 'string' && type.getLiteralName() !== '')) {
                variantTypes.add('truthy string');
            }
            else {
                variantTypes.add('string');
            }
        }
        const numbers = types.filter(type => (type instanceof arkanalyzer_1.LiteralType && typeof type.getLiteralName() === 'number') ||
            this.isTypeFlagSet(type, [arkanalyzer_1.NumberType.getInstance(), arkanalyzer_1.BigIntType.getInstance()]));
        if (numbers.length) {
            if (numbers.every(type => type instanceof arkanalyzer_1.LiteralType &&
                (typeof type.getLiteralName() === 'number' || typeof type.getLiteralName() === 'bigint') &&
                type.getLiteralName() !== 0)) {
                variantTypes.add('truthy number');
            }
            else {
                variantTypes.add('number');
            }
        }
    }
    inspectVariantTypes(types) {
        let variantTypes = new Set();
        if (types.some(type => this.isTypeFlagSet(type, [arkanalyzer_1.NullType.getInstance(), arkanalyzer_1.UndefinedType.getInstance(), arkanalyzer_1.VoidType.getInstance()]))) {
            variantTypes.add('nullish');
        }
        this.inspectVariantConstTypes(types, variantTypes);
        if (types.some(type => !(type instanceof arkanalyzer_1.LiteralType) &&
            !this.isTypeFlagSet(type, [
                arkanalyzer_1.NullType.getInstance(),
                arkanalyzer_1.UndefinedType.getInstance(),
                arkanalyzer_1.VoidType.getInstance(),
                arkanalyzer_1.BooleanType.getInstance(),
                arkanalyzer_1.StringType.getInstance(),
                arkanalyzer_1.NumberType.getInstance(),
                arkanalyzer_1.BigIntType.getInstance(),
                arkanalyzer_1.AnyType.getInstance(),
                arkanalyzer_1.UnknownType.getInstance(),
                arkanalyzer_1.NeverType.getInstance()
            ]))) {
            variantTypes.add('object');
        }
        if (types.some(type => this.isTypeFlagSet(type, [arkanalyzer_1.AnyType.getInstance(), arkanalyzer_1.UnknownType.getInstance()]))) {
            variantTypes.add('any');
        }
        if (types.some(type => this.isTypeFlagSet(type, [arkanalyzer_1.NeverType.getInstance()]))) {
            variantTypes.add('never');
        }
        return variantTypes;
    }
    getReportedNode(node) {
        if (arkanalyzer_1.ts.isPrefixUnaryExpression(node)) {
            return this.getReportedNode(node.operand);
        }
        if (arkanalyzer_1.ts.isParenthesizedExpression(node) ||
            arkanalyzer_1.ts.isTypeOfExpression(node) ||
            arkanalyzer_1.ts.isCallExpression(node)) {
            return this.getReportedNode(node.expression);
        }
        //有列号问题在
        return node;
    }
    sortAndReportErrors(target) {
        this.locationInfos.sort((a, b) => {
            if (a.line !== b.line) {
                return a.line - b.line;
            }
            return a.startCol - b.startCol;
        });
    }
    checkStmtIf(arkStmt) {
        if (arkStmt.getOriginalText() === '') {
            return true;
        }
        if (arkStmt instanceof arkanalyzer_1.ArkAssignStmt && arkStmt.getRightOp().getType() instanceof arkanalyzer_1.NumberType) {
            return true;
        }
        this.line = arkStmt.getOriginPositionInfo().getLineNo();
        this.col = arkStmt.getOriginPositionInfo().getColNo();
        return false;
    }
    checkCondition(sourceFile) {
        const results = [];
        this.rootNode = sourceFile.statements[0];
        if (!this.rootNode) {
            return results;
        }
        if (arkanalyzer_1.ts.isExpressionStatement(this.rootNode)) {
            this.rootNode = this.rootNode.expression;
        }
        this.visitCheck(this.globalStmt, this.rootNode, results);
        return results;
    }
    visitCheck(stmt, node, results) {
        this.checkNodePre(stmt, node, results);
        if (stmt instanceof arkanalyzer_1.ArkIfStmt) {
            this.traverseTestExpression(stmt, node, results);
        }
    }
    matchNormalBinopExpr(stmt, stmtStr, node) {
        let op1 = stmt instanceof arkanalyzer_1.ArkUnopExpr ? stmt.getOp() : stmt.getOp1();
        let op2 = stmt instanceof arkanalyzer_1.ArkUnopExpr ? stmt.getOp() : stmt.getOp2();
        let nodeText = '';
        let stmtStrs = stmtStr.split(stmt.getOperator());
        if (stmt instanceof arkanalyzer_1.ArkConditionExpr && arkanalyzer_1.ts.isConditionalExpression(node) && stmtStrs[0].includes('%')) {
            let op1ReplaceText = this.getNormalBinopExprText(op1, node);
            nodeText = arkanalyzer_1.ts.isParenthesizedExpression(node.condition) ? `(${op1ReplaceText})` : op1ReplaceText;
            stmtStrs[0] = this.replacePlaceholder(stmtStrs[0], op1ReplaceText);
        }
        if (stmt instanceof arkanalyzer_1.ArkUnopExpr && stmtStr.includes('%') &&
            arkanalyzer_1.ts.isPrefixUnaryExpression(node)) {
            let op1ReplaceText = this.getNormalBinopExprText(op1, node);
            nodeText = arkanalyzer_1.ts.isParenthesizedExpression(node.operand) ? `(${op1ReplaceText})` : `${op1ReplaceText}`;
            stmtStr = this.replacePlaceholder(stmtStr, op1ReplaceText);
        }
        if (arkanalyzer_1.ts.isBinaryExpression(node)) {
            if (op1 instanceof arkanalyzer_1.Local && op1.getName().includes('%')) {
                let op1ReplaceText = this.getNormalBinopExprText(op1, node);
                nodeText = arkanalyzer_1.ts.isParenthesizedExpression(node.left) ? `(${op1ReplaceText})` : op1ReplaceText;
                stmtStrs[0] = this.replacePlaceholder(stmtStrs[0], nodeText);
            }
            if (!(stmt instanceof arkanalyzer_1.ArkUnopExpr) && op2 instanceof arkanalyzer_1.Local && op2.getName().includes('%')) {
                let op2ReplaceText = this.getNormalBinopExprText(op2, node);
                nodeText = arkanalyzer_1.ts.isParenthesizedExpression(node.right) ? `(${op2ReplaceText})` : op2ReplaceText;
                stmtStrs[1] = this.replacePlaceholder(stmtStrs[1], nodeText);
            }
        }
        return this.getStmtStr(stmt, node, stmtStr, stmtStrs, op2);
    }
    getStmtStr(stmt, node, stmtStr, stmtStrs, op2) {
        if (stmt instanceof arkanalyzer_1.ArkConditionExpr && [Constant_1.BooleanConstant, Constant_1.StringConstant, Constant_1.NumberConstant, arkanalyzer_1.LiteralType]
            .some(ty => op2 instanceof ty)) {
            stmtStr = stmtStrs[0];
        }
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            stmtStr = stmtStrs.join(stmt.getOperator()).toString();
        }
        return stmtStr.trim();
    }
    checkLocalBinaryExpression(stmt, node) {
        let op1 = stmt.getOp1();
        let op2 = stmt.getOp2();
        if (stmt.getOperator() === node.operatorToken.getText() && (op2 instanceof arkanalyzer_1.Local && op2.getName() === node.right.getText() ||
            op1 instanceof arkanalyzer_1.Local && op1.getName() === node.left.getText())) {
            return true;
        }
        return false;
    }
    checkLocalPrefixUnaryExpression(stmt, stmtStr, node) {
        if (arkanalyzer_1.ts.isElementAccessExpression(node.operand) && node.operand.expression) {
            if (stmtStr.includes(node.operand.expression.getText()) &&
                stmtStr.includes(node.operand.argumentExpression.getText())) {
                return true;
            }
        }
        return false;
    }
    checkLocal(stmt, stmtStr, node) {
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            if (arkanalyzer_1.ts.isBinaryExpression(node)) {
                if (this.checkLocalBinaryExpression(stmt, node)) {
                    return node;
                }
                stmtStr = this.matchNormalBinopExpr(stmt, stmtStr, node);
            }
        }
        if (stmt instanceof arkanalyzer_1.ArkUnopExpr) {
            if (arkanalyzer_1.ts.isPrefixUnaryExpression(node)) {
                if (this.checkLocalPrefixUnaryExpression(stmt, stmtStr, node)) {
                    return node;
                }
            }
            stmtStr = this.matchNormalBinopExpr(stmt, stmtStr, node);
        }
        if (stmt instanceof arkanalyzer_1.ArkConditionExpr) {
            stmtStr = this.matchNormalBinopExpr(stmt, stmtStr, node);
        }
        if (this.checkStmtStrAndNode(node, stmtStr)) {
            node = arkanalyzer_1.ts.isParenthesizedExpression(node) ? node.expression : node;
            if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr && arkanalyzer_1.ts.isBinaryExpression(node)) {
                this.checkLocalIsReplace = true;
                return node;
            }
            else if (stmt instanceof arkanalyzer_1.ArkConditionExpr || stmt instanceof arkanalyzer_1.ArkUnopExpr) {
                this.checkLocalIsReplace = true;
                return node;
            }
        }
        if (!this.checkLocalIsReplace) {
            let childs = node.getChildren();
            for (const child of childs) {
                let result = this.checkLocal(stmt, stmtStr, child);
                if (result) {
                    return result;
                }
            }
        }
        return undefined;
    }
    checkStmtStrAndNode(node, stmtStr) {
        let childtext = node.getText().replace('?.', '.').replace('new', '');
        if (arkanalyzer_1.ts.isBinaryExpression(node)) {
            if (arkanalyzer_1.ts.isBigIntLiteral(node.left) || arkanalyzer_1.ts.isBigIntLiteral(node.right)) {
                childtext = childtext.replace('n', '');
            }
            if (arkanalyzer_1.ts.isElementAccessExpression(node.left) || arkanalyzer_1.ts.isElementAccessExpression(node.right)) {
                childtext = childtext.replace(a_r, '');
            }
        }
        return childtext.replace(b_r, '').replace(c_r, '').replace(d_r, '.$1') ===
            stmtStr.replace(b_r, '').replace(c_r, '');
    }
    getNormalBinopExprText(stmt, node) {
        if (stmt instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            return this.matchNormalBinopExpr(stmt, stmt.toString(), node);
        }
        if (stmt instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            let baseName = stmt.getBase().getName();
            if (baseName.includes('%')) {
                baseName = this.getNormalBinopExprText(stmt.getBase().getDeclaringStmt() ?? stmt, node);
            }
            return `${baseName}.${stmt.getFieldSignature().getFieldName()}`;
        }
        if (stmt instanceof arkanalyzer_1.ArkInstanceInvokeExpr) {
            let baseName = stmt.getBase().getName();
            let methodName = stmt.getMethodSignature().getMethodSubSignature().getMethodName();
            if (baseName.includes('%')) {
                baseName = this.getNormalBinopExprText(stmt.getBase().getDeclaringStmt() ?? stmt, node);
            }
            return `${baseName}.${methodName}(${stmt.getArgs().map(arg => this.getNormalBinopExprText(arg, node)).join(', ')})`;
        }
        if (stmt instanceof arkanalyzer_1.ArkStaticInvokeExpr) {
            let methodName = stmt.getMethodSignature().getMethodSubSignature().getMethodName();
            return `${methodName}(${stmt.getArgs().map(arg => this.getNormalBinopExprText(arg, node)).join(', ')})`;
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
    unionTypeParts(type) {
        if (type instanceof arkanalyzer_1.UnionType || type instanceof arkanalyzer_1.IntersectionType) {
            return type.getTypes();
        }
        return [type];
    }
    // 辅助方法：创建和添加问题报告
    reportIssue(node, messageId, results) {
        const { line, character } = this.rootNode.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
        if (line > 0) {
            this.col = 1;
        }
        const assertionName = node.getText();
        const start = node.getStart();
        const end = node.getEnd();
        const endCharacter = character + assertionName.length;
        //messageId可能为空的情况 出现了description用作报错信息，需要检查下
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
    addIssueReportNodeFix(loc, arkFile) {
        const filePath = arkFile.getFilePath();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(arkFile);
        const severity = this.rule.alert ?? this.metaData.severity;
        if (loc.description) {
            this.metaData.description = loc.description;
        }
        let fix = this.getRuleFix(loc, sourceFile);
        let defect = new Defects_1.Defects(loc.line, loc.startCol, loc.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, fix ? true : false);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
    }
    getRuleFix(loc, sourceFile) {
        let fix = undefined;
        if (this.isNoNeedFix(loc.messageId)) {
            return fix;
        }
        switch (loc.messageId) {
            case 'conditionErrorAny':
            case 'conditionErrorNullish':
                fix = this.createNullishOrAnyFix(loc, sourceFile);
                break;
            case 'conditionErrorNullableBoolean':
                fix = this.createNullableBooleanFix(loc, sourceFile);
                break;
            case 'conditionErrorNullableString':
            case 'conditionErrorNullableNumber':
                fix = this.createNullableStringOrNullableNumberFix(loc, sourceFile);
                break;
        }
        return fix;
    }
    isNoNeedFix(messageId) {
        const SKIP_FIX_IDS = new Set([
            'conditionErrorString',
            'conditionErrorNumber',
            'conditionErrorObject',
            'conditionErrorNullableObject',
            'conditionErrorNullableEnum',
            'noStrictNullCheck',
            'conditionFixDefaultFalse',
            'conditionFixDefaultEmptyString',
            'conditionFixDefaultZero',
            'conditionFixCompareNullish',
            'conditionFixCastBoolean',
            'conditionFixCompareTrue',
            'conditionFixCompareFalse',
            'conditionFixCompareStringLength',
            'conditionFixCompareEmptyString',
            'conditionFixCompareZero',
            'conditionFixCompareNaN'
        ]);
        return SKIP_FIX_IDS.has(messageId);
    }
    getFixRange(loc, sourceFile) {
        const [startPos, isNeedAddParentheses] = this.getLineStartPosition(sourceFile, loc);
        const startPosition = startPos + loc.startCol - 1;
        const endPosition = startPosition + loc.endCol - loc.startCol;
        return [startPosition, endPosition, isNeedAddParentheses];
    }
    getLineStartPosition(sourceFile, loc) {
        const lineNumber = loc.line;
        const lines = sourceFile.getFullText().split('\n');
        if (lineNumber < 1 || lineNumber > lines.length) {
            return [0, false];
        }
        let position = 0;
        for (let i = 0; i < lineNumber - 1; i++) {
            position += lines[i].length + 1;
        }
        const reportLineStr = lines[lineNumber - 1];
        const leftThreeLetter = reportLineStr.substring(loc.startCol - 4, loc.startCol - 1);
        const [isLeftHasLeftParenthesis, isLeftHasBinaryOperator] = this.checkLeftConditions(leftThreeLetter);
        const rightThreeLetter = reportLineStr.substring(loc.endCol - 1, loc.endCol + 2);
        const [isRightHasRightParenthesis, isRightHasBinaryOperator] = this.checkRightConditions(rightThreeLetter);
        const isNeedAddParentheses = this.shouldAddParentheses(isLeftHasLeftParenthesis, isLeftHasBinaryOperator, isRightHasRightParenthesis, isRightHasBinaryOperator);
        return [position, isNeedAddParentheses];
    }
    shouldAddParentheses(isLeftHasLeftParenthesis, isLeftHasBinaryOperator, isRightHasRightParenthesis, isRightHasBinaryOperator) {
        let isNeedAddParentheses = false;
        if (isLeftHasLeftParenthesis && isRightHasBinaryOperator) {
            isNeedAddParentheses = true;
        }
        if (isLeftHasBinaryOperator && isRightHasRightParenthesis) {
            isNeedAddParentheses = true;
        }
        if (!isLeftHasLeftParenthesis && !isLeftHasBinaryOperator && isRightHasBinaryOperator) {
            isNeedAddParentheses = true;
        }
        if (isLeftHasBinaryOperator && !isRightHasRightParenthesis && !isRightHasBinaryOperator) {
            isNeedAddParentheses = true;
        }
        if (!isLeftHasLeftParenthesis && !isLeftHasBinaryOperator && !isRightHasRightParenthesis && !isRightHasBinaryOperator) {
            isNeedAddParentheses = true;
        }
        if (isLeftHasBinaryOperator && isRightHasBinaryOperator && !isLeftHasLeftParenthesis && !isRightHasRightParenthesis) {
            isNeedAddParentheses = true;
        }
        return isNeedAddParentheses;
    }
    checkLeftConditions(str) {
        let isLeftHasLeftParenthesis = false;
        let isLeftHasBinaryOperator = false;
        // 从右往左遍历字符串（索引 2 → 1 → 0）
        for (let i = str.length - 1; i >= 0; i--) {
            const char = str[i];
            // 检查左括号 '('
            if (char === '(') {
                isLeftHasLeftParenthesis = true;
            }
            // 检查二元操作符（&&、||）或单个 & 
            if (char === '&' || char === '|') {
                // 判断是否有连续操作符（例如 && 或 ||）
                const hasConsecutive = i < str.length - 1 && str[i] === str[i + 1];
                isLeftHasBinaryOperator = true;
                // 如果发现操作符，停止遍历
                break;
            }
        }
        return [isLeftHasLeftParenthesis, isLeftHasBinaryOperator];
    }
    checkRightConditions(str) {
        let isRightHasRightParenthesis = false;
        let isRightHasBinaryOperator = false;
        // 从左往右遍历字符串（索引 0 → 1 → 2）
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            // 检查右括号 ')'
            if (char === ')') {
                isRightHasRightParenthesis = true;
            }
            // 检查二元操作符（&&、||）或单个 |
            if (char === '|' || char === '&') {
                // 判断是否有连续操作符（例如 || 或 &&）
                const hasConsecutive = i < str.length - 1 && str[i] === str[i + 1];
                isRightHasBinaryOperator = true;
                // 如果发现操作符，停止遍历
                break;
            }
        }
        return [isRightHasRightParenthesis, isRightHasBinaryOperator];
    }
    //nullish类型和any类型 
    createNullishOrAnyFix(loc, sourceFile) {
        const [f_start, f_end, isNeedAddParentheses] = this.getFixRange(loc, sourceFile);
        const fixText = `Boolean(${loc.nameStr})`;
        return { range: [f_start, f_end], text: fixText };
    }
    //NullableBoolean
    createNullableBooleanFix(loc, sourceFile) {
        const [f_start, f_end, isNeedAddParentheses] = this.getFixRange(loc, sourceFile);
        const fixText = isNeedAddParentheses ? `${'(' + loc.nameStr} ?? false)` : `${loc.nameStr} ?? false`;
        return { range: [f_start, f_end], text: fixText };
    }
    createNullableStringOrNullableNumberFix(loc, sourceFile) {
        const [f_start, f_end, isNeedAddParentheses] = this.getFixRange(loc, sourceFile);
        const fixText = isNeedAddParentheses ? `${'(' + loc.nameStr} != null)` : `${loc.nameStr} != null`;
        return { range: [f_start, f_end], text: fixText };
    }
}
exports.StrictBooleanExpressionsCheck = StrictBooleanExpressionsCheck;
