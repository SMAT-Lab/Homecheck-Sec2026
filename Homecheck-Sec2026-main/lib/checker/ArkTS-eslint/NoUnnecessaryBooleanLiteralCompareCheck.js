"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoUnnecessaryBooleanLiteralCompareCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
class NoUnnecessaryBooleanLiteralCompareCheck {
    rule;
    defects = [];
    issues = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/no-unnecessary-boolean-literal-compare.md',
        description: 'Disallow unnecessary equality comparisons against boolean literals'
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
    };
    defaultOptions = [{}];
    registerMatchers() {
        return [{
                matcher: this.fileMatcher,
                callback: this.check
            }];
    }
    ;
    check = (target) => {
        this.defaultOptions = this.rule && this.rule.option[0] ? this.rule.option : this.defaultOptions;
        const filePath = target.getFilePath();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        this.checkBooleanComparisons(sourceFile, filePath);
    };
    checkBooleanComparisons(sourceFile, filePath) {
        const defects = [];
        const traverse = (node) => {
            // 先处理逻辑表达式中的比较
            if (arkanalyzer_1.ts.isBinaryExpression(node) &&
                (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AmpersandAmpersandToken ||
                    node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.BarBarToken)) {
                // 递归检查左右操作数
                traverse(node.left);
                traverse(node.right);
                return;
            }
            if (arkanalyzer_1.ts.isBinaryExpression(node)) {
                this.checkBinaryExpression(node, defects, sourceFile, filePath);
            }
            arkanalyzer_1.ts.forEachChild(node, traverse);
        };
        traverse(sourceFile);
        return defects;
    }
    ;
    checkBinaryExpression(node, defects, sourceFile, filePath) {
        // 检查 === 和 !== 以及 == 和 != 运算符
        if (!this.isComparisonOperator(node.operatorToken.kind)) {
            return;
        }
        // 检查布尔字面量比较
        const booleanLiteral = this.findBooleanLiteral(node);
        if (booleanLiteral === null) {
            return;
        }
        // 获取另一个操作数
        const otherOperand = node.left === booleanLiteral ? node.right : node.left;
        // 检查布尔字面量与布尔字面量的比较
        this.booleanBooleanLiteral(otherOperand, node, defects, sourceFile, filePath, booleanLiteral);
        // 检查 instanceof 表达式
        this.instanceOfBooleanLiteral(otherOperand, node, defects, sourceFile, filePath, booleanLiteral);
        // 检查其他表达式
        this.otherExpression(otherOperand, node, defects, sourceFile, filePath, booleanLiteral);
        if (arkanalyzer_1.ts.isIdentifier(otherOperand)) {
            // 检查是否为可空布尔类型
            this.isnullBoolean(otherOperand, node, defects, sourceFile, filePath, booleanLiteral);
            if (this.isInGenericContext(node)) {
                return;
            }
            const declaration = this.findSymbolDeclaration(otherOperand);
            if (declaration) {
                // 检查是否为纯布尔类型、字面量类型或类型别名
                this.declareBooleanType(otherOperand, node, defects, sourceFile, filePath, booleanLiteral, declaration);
            }
        }
    }
    ;
    // 是否和true比较
    isTrue(kind) {
        const isComparingWithTrue = kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword;
        return isComparingWithTrue;
    }
    ;
    booleanBooleanLiteral(otherOperand, node, defects, sourceFile, filePath, booleanLiteral) {
        if (this.isBooleanLiteralLike(otherOperand)) {
            if (this.isInGenericContext(otherOperand)) {
                return;
            }
            const message = node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken
                ? `This expression unnecessarily compares a boolean value to a boolean instead of using it directly.`
                : `This expression unnecessarily compares a boolean value to a boolean instead of negating it.`;
            this.addDefect(defects, sourceFile, filePath, node, message); // 传递缺陷信息
            // 操作符
            const parentBinaryExpression = otherOperand.parent;
            const operatorToken = parentBinaryExpression.operatorToken.kind;
            let fixD;
            if (this.isTrue(booleanLiteral.kind)) {
                // 和 true 比较
                if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                    fixD = `${this.getText(otherOperand)}`; // booleanVar === true
                }
                else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                    fixD = `!${this.getText(otherOperand)}`; // booleanVar !== true
                }
            }
            else {
                // 和 false 比较
                if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                    fixD = `!${this.getText(otherOperand)}`; // booleanVar === false
                }
                else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                    fixD = `${this.getText(otherOperand)}`; // booleanVar !== false
                }
            }
            if (fixD) {
                const ruleFix = this.createFix(node, fixD); // 创建修复对象
                this.issues.push(new Defects_1.IssueReport(defects[defects.length - 1], ruleFix)); // 将修复对象添加到 IssueReport 中
            }
            return;
        }
    }
    ;
    instanceOfBooleanLiteral(otherOperand, node, defects, sourceFile, filePath, booleanLiteral) {
        if (arkanalyzer_1.ts.isBinaryExpression(otherOperand) &&
            otherOperand.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.InstanceOfKeyword) {
            const message = node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken
                ? `This expression unnecessarily compares a boolean value to a boolean instead of using it directly.`
                : `This expression unnecessarily compares a boolean value to a boolean instead of negating it.`;
            this.addDefect(defects, sourceFile, filePath, node, message); // 传递缺陷信息
            // 获取左值、右值和操作符
            const parentBinaryExpression = otherOperand.parent;
            const operatorToken = parentBinaryExpression.operatorToken.kind;
            // 生成修复建议
            let fix;
            if (this.isTrue(booleanLiteral.kind)) {
                // 和 true 比较
                if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                    fix = `${this.getText(otherOperand)}`; // booleanVar === true
                }
                else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                    fix = `!(${this.getText(otherOperand)})`; // booleanVar !== true
                }
            }
            else {
                // 和 false 比较
                if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                    fix = `!(${this.getText(otherOperand)})`; // booleanVar === false
                }
                else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                    fix = `${this.getText(otherOperand)}`; // booleanVar !== false
                }
            }
            if (fix) {
                const ruleFix = this.createFix(node, fix); // 创建修复对象
                this.issues.push(new Defects_1.IssueReport(defects[defects.length - 1], ruleFix)); // 将修复对象添加到 IssueReport 中
            }
            return;
        }
    }
    ;
    otherExpression(otherOperand, node, defects, sourceFile, filePath, booleanLiteral) {
        if (arkanalyzer_1.ts.isBinaryExpression(otherOperand) ||
            arkanalyzer_1.ts.isTypeOfExpression(otherOperand)) {
            const message = node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken
                ? `This expression unnecessarily compares a boolean value to a boolean instead of using it directly.`
                : `This expression unnecessarily compares a boolean value to a boolean instead of negating it.`;
            this.addDefect(defects, sourceFile, filePath, node, message);
            // 获取左值、右值和操作符
            const parentBinaryExpression = otherOperand.parent;
            const operatorToken = parentBinaryExpression.operatorToken.kind;
            let fixD;
            if (this.isTrue(booleanLiteral.kind)) {
                // 和 true 比较
                if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                    fixD = `${this.getText(otherOperand)}`; // booleanVar === true
                }
                else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                    fixD = `!(${this.getText(otherOperand)})`; // booleanVar !== true
                }
            }
            else {
                // 和 false 比较
                if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                    fixD = `!(${this.getText(otherOperand)})`; // booleanVar === false
                }
                else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                    fixD = `${this.getText(otherOperand)}`; // booleanVar !== false
                }
            }
            if (fixD) {
                const ruleFix = this.createFix(node, fixD); // 创建修复对象
                this.issues.push(new Defects_1.IssueReport(defects[defects.length - 1], ruleFix)); // 将修复对象添加到 IssueReport 中
            }
            return;
        }
    }
    ;
    isnullBoolean(otherOperand, node, defects, sourceFile, filePath, booleanLiteral) {
        if (this.isNullableBooleanType(otherOperand)) {
            const isComparingWithTrue = this.isTrue(booleanLiteral.kind);
            if (isComparingWithTrue) {
                // 明确设置为 false 才报告，否则默认允许
                const shouldReport = this.defaultOptions[0].allowComparingNullableBooleansToTrue === false;
                if (shouldReport) {
                    this.isNullableBooleanFix(otherOperand, node, defects, sourceFile, filePath, booleanLiteral);
                }
            }
            else {
                // 使用配置项的值，若未配置则根据默认值
                const shouldReport = this.defaultOptions[0].allowComparingNullableBooleansToFalse === false;
                if (shouldReport) {
                    this.isNullableBooleanFix(otherOperand, node, defects, sourceFile, filePath, booleanLiteral);
                }
            }
        }
    }
    ;
    isNullableBooleanFix(otherOperand, node, defects, sourceFile, filePath, booleanLiteral) {
        let message = '';
        if (this.defaultOptions[0].allowComparingNullableBooleansToTrue === false) {
            message = node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken
                ? `This expression unnecessarily compares a nullable boolean value to true instead of using it directly.`
                : `This expression unnecessarily compares a nullable boolean value to true instead of negating it.`;
        }
        else if (this.defaultOptions[0].allowComparingNullableBooleansToFalse === false) {
            message = `This expression unnecessarily compares a nullable boolean value to false instead of using the ?? operator to provide a default.`;
        }
        this.addDefect(defects, sourceFile, filePath, node, message); // 传递缺陷信息
        // 获取左值、右值和操作符
        const parentBinaryExpression = otherOperand.parent;
        const operatorToken = parentBinaryExpression.operatorToken.kind;
        // 生成修复建议
        let fix;
        if (this.isTrue(booleanLiteral.kind)) {
            // 和 true 比较
            if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                fix = `${this.getText(otherOperand)}`; // booleanVar === true
            }
            else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                fix = `!${this.getText(otherOperand)}`; // booleanVar !== true
            }
        }
        else {
            // 和 false 比较
            if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                fix = `!(${this.getText(otherOperand)} ?? true)`; // booleanVar === false
            }
            else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                fix = `(${this.getText(otherOperand)} ?? true)`; // booleanVar !== false
            }
        }
        if (fix) {
            const ruleFix = this.createFix(node, fix); // 创建修复对象
            this.issues.push(new Defects_1.IssueReport(defects[defects.length - 1], ruleFix)); // 将修复对象添加到 IssueReport 中
        }
        return;
    }
    ;
    declareBooleanType(otherOperand, node, defects, sourceFile, filePath, booleanLiteral, declaration) {
        if (!declaration.type) {
            return;
        }
        const typeNode = declaration.type;
        if (typeNode.kind === arkanalyzer_1.ts.SyntaxKind.BooleanKeyword ||
            typeNode.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword ||
            typeNode.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword ||
            (arkanalyzer_1.ts.isLiteralTypeNode(typeNode) &&
                (typeNode.literal.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword ||
                    typeNode.literal.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword)) ||
            (arkanalyzer_1.ts.isTypeReferenceNode(typeNode) &&
                arkanalyzer_1.ts.isIdentifier(typeNode.typeName) &&
                (typeNode.typeName.text === 'true' ||
                    typeNode.typeName.text === 'false'))) {
            if (!this.hasGenericAncestor(declaration)) {
                this.declareBooleanTypeFix(node, defects, sourceFile, filePath, booleanLiteral, otherOperand);
            }
        }
    }
    ;
    declareBooleanTypeFix(node, defects, sourceFile, filePath, booleanLiteral, otherOperand) {
        const message = node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken ||
            node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken
            ? `This expression unnecessarily compares a boolean value to a boolean instead of using it directly.`
            : `This expression unnecessarily compares a boolean value to a boolean instead of negating it.`;
        this.addDefect(defects, sourceFile, filePath, node, message);
        const parentBinaryExpression = otherOperand.parent;
        const operatorToken = parentBinaryExpression.operatorToken.kind;
        let fixD;
        if (this.isTrue(booleanLiteral.kind)) {
            // 和 true 比较
            if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                fixD = `${this.getText(otherOperand)}`; // booleanVar === true
            }
            else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                fixD = `!${this.getText(otherOperand)}`; // booleanVar !== true
            }
        }
        else {
            // 和 false 比较
            if (operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken) {
                fixD = `!${this.getText(otherOperand)}`; // booleanVar === false
            }
            else if (operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken || operatorToken === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                fixD = `${this.getText(otherOperand)}`; // booleanVar !== false
            }
        }
        if (fixD) {
            const ruleFix = this.createFix(node, fixD); // 创建修复对象
            this.issues.push(new Defects_1.IssueReport(defects[defects.length - 1], ruleFix)); // 将修复对象添加到 IssueReport 中
        }
    }
    ;
    isComparisonOperator(kind) {
        return kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsEqualsToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsEqualsToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.EqualsEqualsToken ||
            kind === arkanalyzer_1.ts.SyntaxKind.ExclamationEqualsToken;
    }
    ;
    getText(node) {
        return node.getText();
    }
    ;
    findBooleanLiteral(node) {
        //检查嵌套表达式
        const checkOperand = (operand) => {
            if (operand.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword || operand.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword) {
                return operand;
            }
            if (arkanalyzer_1.ts.isParenthesizedExpression(operand)) {
                return checkOperand(operand.expression);
            }
            if (arkanalyzer_1.ts.isBinaryExpression(operand)) {
                return this.findBooleanLiteral(operand);
            }
            return null;
        };
        const leftLiteral = checkOperand(node.left);
        if (leftLiteral) {
            return leftLiteral;
        }
        ;
        const rightLiteral = checkOperand(node.right);
        if (rightLiteral) {
            return rightLiteral;
        }
        ;
        return null;
    }
    ;
    findSymbolDeclaration(identifier) {
        let current = identifier;
        const sourceFile = identifier.getSourceFile();
        const declaration = this.findInSourceFileStatements(identifier, sourceFile);
        if (declaration) {
            return declaration;
        }
        while (current) {
            if (arkanalyzer_1.ts.isVariableDeclaration(current)) {
                if (arkanalyzer_1.ts.isIdentifier(current.name) && current.name.text === identifier.text) {
                    return current;
                }
            }
            current = current.parent;
        }
        return undefined;
    }
    ;
    findInSourceFileStatements(identifier, sourceFile) {
        return this.findVariableDeclarationInStatements(sourceFile.statements, identifier);
    }
    ;
    findVariableDeclarationInStatements(statements, identifier) {
        for (const statement of statements) {
            const declaration = this.findVariableDeclarationInStatement(statement, identifier);
            if (declaration) {
                return declaration;
            }
        }
        return undefined;
    }
    ;
    findVariableDeclarationInStatement(statement, identifier) {
        if (arkanalyzer_1.ts.isVariableStatement(statement)) {
            return this.findVariableDeclarationInDeclarationList(statement.declarationList, identifier);
        }
        return undefined;
    }
    ;
    findVariableDeclarationInDeclarationList(declarationList, identifier) {
        for (const decl of declarationList.declarations) {
            if (this.isMatchingVariableDeclaration(decl, identifier)) {
                return decl;
            }
        }
        return undefined;
    }
    ;
    isMatchingVariableDeclaration(decl, identifier) {
        return arkanalyzer_1.ts.isIdentifier(decl.name) && decl.name.text === identifier.text;
    }
    ;
    addDefect(defects, sourceFile, filePath, node, message) {
        const start = node.getStart();
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);
        const lineNumber = lineAndChar.line + 1;
        const column = lineAndChar.character + 1;
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Index_1.Defects(lineNumber, column, end.character + 1, message, severity, this.rule.ruleId, `${filePath}%${lineNumber}%${column}%${this.rule.ruleId}`, this.metaData.ruleDocPath, true, false, true);
        defects.push(defect);
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    isInGenericContext(node) {
        let current = node;
        while (current) {
            if (this.isInArrowFunctionContext(current)) {
                return true;
            }
            if (arkanalyzer_1.ts.isTypeParameterDeclaration(current)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    ;
    isInArrowFunctionContext(node) {
        if (!arkanalyzer_1.ts.isArrowFunction(node)) {
            return false;
        }
        const parent = node.parent;
        if (!arkanalyzer_1.ts.isVariableDeclaration(parent)) {
            return false;
        }
        return this.hasGenericType(parent.type);
    }
    ;
    hasGenericType(type) {
        if (!type) {
            return false;
        }
        if (arkanalyzer_1.ts.isFunctionTypeNode(type) && type.typeParameters && type.typeParameters.length > 0) {
            return true;
        }
        if (arkanalyzer_1.ts.isUnionTypeNode(type)) {
            return true;
        }
        return false;
    }
    ;
    hasGenericAncestor(node) {
        let current = node;
        while (current) {
            if (arkanalyzer_1.ts.isTypeParameterDeclaration(current) ||
                (arkanalyzer_1.ts.isFunctionTypeNode(current) && current.typeParameters && current.typeParameters.length > 0)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    ;
    isBooleanLiteralLike(node) {
        // 处理基本布尔字面量
        if (node.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword || node.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword) {
            return true;
        }
        // 处理括号表达式
        if (arkanalyzer_1.ts.isParenthesizedExpression(node)) {
            return this.isBooleanLiteralLike(node.expression);
        }
        // 处理二元表达式
        if (arkanalyzer_1.ts.isBinaryExpression(node)) {
            // 处理 instanceof 表达式
            if (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.InstanceOfKeyword) {
                return true;
            }
            // 处理逻辑运算符
            if (node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.AmpersandAmpersandToken ||
                node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.BarBarToken) {
                return this.isBooleanLiteralLike(node.right);
            }
        }
        // 处理空值合并运算符
        if (arkanalyzer_1.ts.isBinaryExpression(node) &&
            node.operatorToken.kind === arkanalyzer_1.ts.SyntaxKind.QuestionQuestionToken) {
            // 检查是否在泛型上下文中
            let current = node;
            while (current) {
                if (arkanalyzer_1.ts.isTypeParameterDeclaration(current) ||
                    (arkanalyzer_1.ts.isFunctionTypeNode(current) && current.typeParameters && current.typeParameters.length > 0)) {
                    return false;
                }
                current = current.parent;
            }
            return this.isBooleanLiteralLike(node.right);
        }
        // 处理前缀一元运算符（比如 !）
        if (arkanalyzer_1.ts.isPrefixUnaryExpression(node) &&
            node.operator === arkanalyzer_1.ts.SyntaxKind.ExclamationToken) {
            return true;
        }
        return false;
    }
    ;
    isNullableBooleanType(node) {
        if (!arkanalyzer_1.ts.isIdentifier(node)) {
            return false;
        }
        ;
        const declaration = this.findSymbolDeclaration(node);
        if (!declaration || !declaration.type) {
            return false;
        }
        ;
        // 检查是否为联合类型
        if (arkanalyzer_1.ts.isUnionTypeNode(declaration.type)) {
            const types = declaration.type.types;
            // 首先检查是否包含 null 或 undefined
            const hasNullOrUndefined = types.some(t => (arkanalyzer_1.ts.isLiteralTypeNode(t) && t.literal.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword) ||
                t.kind === arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword ||
                t.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword);
            // 检查每个类型是否都是布尔相关类型或 null/undefined
            const isOnlyBooleanAndNullable = types.every(t => 
            // 布尔类型
            t.kind === arkanalyzer_1.ts.SyntaxKind.BooleanKeyword ||
                t.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword ||
                t.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword ||
                // null/undefined
                t.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword ||
                t.kind === arkanalyzer_1.ts.SyntaxKind.UndefinedKeyword ||
                // 布尔字面量类型
                (arkanalyzer_1.ts.isLiteralTypeNode(t) && (t.literal.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword ||
                    t.literal.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword ||
                    t.literal.kind === arkanalyzer_1.ts.SyntaxKind.NullKeyword)));
            if (hasNullOrUndefined) {
                // 检查是否包含完整的布尔类型或布尔字面量
                const hasBoolean = types.some(t => t.kind === arkanalyzer_1.ts.SyntaxKind.BooleanKeyword ||
                    t.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword ||
                    t.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword ||
                    (arkanalyzer_1.ts.isLiteralTypeNode(t) &&
                        (t.literal.kind === arkanalyzer_1.ts.SyntaxKind.TrueKeyword ||
                            t.literal.kind === arkanalyzer_1.ts.SyntaxKind.FalseKeyword)));
                return hasBoolean && isOnlyBooleanAndNullable;
            }
        }
        return false;
    }
    ;
    createFix(node, replacement) {
        return { range: [node.getStart(), node.getEnd()], text: replacement };
    }
    ;
}
exports.NoUnnecessaryBooleanLiteralCompareCheck = NoUnnecessaryBooleanLiteralCompareCheck;
