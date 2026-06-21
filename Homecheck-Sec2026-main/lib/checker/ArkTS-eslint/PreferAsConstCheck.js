"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferAsConstCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const Defects_1 = require("../../model/Defects");
const DefectsList_1 = require("../../utils/common/DefectsList");
class PreferAsConstCheck {
    rule;
    defects = [];
    issues = [];
    metaData = {
        severity: 2,
        ruleDocPath: 'docs/prefer-as-const.md',
        description: 'Enforce the use of `as const` over literal type assertions.'
    };
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE
    };
    registerMatchers() {
        const fileMatcher = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatcher];
    }
    ;
    check = (target) => {
        if (!this.getFileExtension(target.getName(), 'ts')) {
            return;
        }
        const filePath = target.getFilePath();
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(target);
        const defects = this.checkAsConstAssertions(sourceFile, filePath);
        defects.forEach(defect => {
            const ruleFix = this.createFix(sourceFile, defect);
            this.issues.push(new Defects_1.IssueReport(defect, ruleFix));
        });
    };
    getFileExtension(filePath, filetype) {
        const match = filePath.match(/\.([0-9a-zA-Z]+)$/);
        if (match) {
            const extension = match[1];
            return extension === filetype;
        }
        return false;
    }
    ;
    checkAsConstAssertions(sourceFile, filePath) {
        const defects = [];
        const traverse = (node) => {
            if (arkanalyzer_1.ts.isAsExpression(node) || arkanalyzer_1.ts.isTypeAssertionExpression(node)) {
                if (this.shouldReportAssertion(node)) {
                    const message = "Expected a `const` instead of a literal type assertion.";
                    this.addDefect(defects, sourceFile, filePath, node, message);
                }
            }
            if (arkanalyzer_1.ts.isVariableDeclaration(node) || arkanalyzer_1.ts.isPropertyDeclaration(node)) {
                if (this.shouldReportVariableDeclaration(node)) {
                    const message = "Expected a `const` assertion instead of a literal type annotation. ";
                    this.addDefect(defects, sourceFile, filePath, node, message);
                }
            }
            arkanalyzer_1.ts.forEachChild(node, traverse);
        };
        traverse(sourceFile);
        return defects;
    }
    ;
    shouldReportAssertion(node) {
        const { expression, type } = node;
        // 检查对象字面量中的属性断言
        if (arkanalyzer_1.ts.isObjectLiteralExpression(expression)) {
            return expression.properties.some(prop => {
                if (arkanalyzer_1.ts.isPropertyAssignment(prop)) {
                    const value = prop.initializer;
                    return arkanalyzer_1.ts.isAsExpression(value) && this.shouldReportAssertion(value);
                }
                return false;
            });
        }
        // 处理基本类型断言
        if (type.kind === arkanalyzer_1.ts.SyntaxKind.StringKeyword ||
            type.kind === arkanalyzer_1.ts.SyntaxKind.NumberKeyword) {
            return false;
        }
        // 不需要报错的情况
        if (!arkanalyzer_1.ts.isLiteralTypeNode(type))
            return false;
        if (arkanalyzer_1.ts.isTypeReferenceNode(type))
            return false;
        // 处理模板字面量
        if (arkanalyzer_1.ts.isTemplateLiteral(expression)) {
            return false;
        }
        // 检查字面量类型断言
        if (arkanalyzer_1.ts.isLiteralTypeNode(type)) {
            if (arkanalyzer_1.ts.isStringLiteral(expression) && arkanalyzer_1.ts.isStringLiteral(type.literal)) {
                return expression.text === type.literal.text;
            }
            if (arkanalyzer_1.ts.isNumericLiteral(expression) && arkanalyzer_1.ts.isNumericLiteral(type.literal)) {
                return expression.text === type.literal.text;
            }
        }
        return false;
    }
    ;
    shouldReportVariableDeclaration(node) {
        const { type, initializer } = node;
        if (!type || !initializer)
            return false;
        // 跳过基本类型注解
        if (!arkanalyzer_1.ts.isLiteralTypeNode(type) &&
            (type.kind === arkanalyzer_1.ts.SyntaxKind.StringKeyword ||
                type.kind === arkanalyzer_1.ts.SyntaxKind.NumberKeyword)) {
            return false;
        }
        // 跳过函数类型
        if (arkanalyzer_1.ts.isFunctionTypeNode(type) || arkanalyzer_1.ts.isMethodDeclaration(node)) {
            return false;
        }
        // 跳过模板字面量
        if (arkanalyzer_1.ts.isTemplateLiteral(initializer)) {
            return false;
        }
        // 检查字面量类型注解
        if (arkanalyzer_1.ts.isLiteralTypeNode(type)) {
            if (arkanalyzer_1.ts.isStringLiteral(initializer) && arkanalyzer_1.ts.isStringLiteral(type.literal)) {
                return initializer.text === type.literal.text;
            }
            if (arkanalyzer_1.ts.isNumericLiteral(initializer) && arkanalyzer_1.ts.isNumericLiteral(type.literal)) {
                return initializer.text === type.literal.text;
            }
        }
        return false;
    }
    ;
    addDefect(defects, sourceFile, filePath, node, message) {
        let start;
        this.metaData.description = message ? message : this.metaData.description;
        if (arkanalyzer_1.ts.isVariableDeclaration(node) || arkanalyzer_1.ts.isPropertyDeclaration(node)) {
            // 对于变量声明和属性声明，定位到类型注解的值
            const typeNode = node.type;
            if (typeNode && arkanalyzer_1.ts.isLiteralTypeNode(typeNode)) {
                start = typeNode.literal.getStart();
            }
            else {
                start = node.getStart();
            }
        }
        else if (arkanalyzer_1.ts.isTypeAssertionExpression(node)) {
            // 对于尖括号语法的类型断言，定位到类型位置
            start = node.type.getStart();
        }
        else if (arkanalyzer_1.ts.isAsExpression(node)) {
            // 对于 as 语法的断言，定位到类型位置
            start = node.type.getStart();
        }
        else {
            start = node.getStart();
        }
        const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);
        const lineNumber = lineAndChar.line + 1;
        const column = lineAndChar.character + 1;
        const lineEndChar = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Index_1.Defects(lineNumber, column, lineEndChar.character + 1, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        defects.push(defect);
        DefectsList_1.RuleListUtil.push(defect);
    }
    ;
    createFix(sourceFile, defect) {
        const { reportLine, reportColumn } = defect;
        const lineIndex = reportLine - 1;
        const pos = sourceFile.getPositionOfLineAndCharacter(lineIndex, reportColumn);
        let node = this.findNodeAtPosition(sourceFile, pos);
        // 向上查找父节点
        while (node &&
            !arkanalyzer_1.ts.isVariableDeclaration(node) &&
            !arkanalyzer_1.ts.isPropertyDeclaration(node) &&
            !arkanalyzer_1.ts.isTypeAssertionExpression(node) &&
            !arkanalyzer_1.ts.isAsExpression(node) &&
            node !== sourceFile) {
            node = node.parent;
        }
        let start = pos;
        let end = pos;
        let fixedText = '';
        if (arkanalyzer_1.ts.isVariableDeclaration(node) || arkanalyzer_1.ts.isPropertyDeclaration(node)) {
            if (node.type && arkanalyzer_1.ts.isLiteralTypeNode(node.type)) {
                // 修复 "let foo: 2 = 2" -> "let foo = 2 as const"
                start = node.name.getEnd();
                end = node.getEnd();
                fixedText = ` = ${this.getInitializerText(node.initializer)} as const`;
            }
        }
        else if (arkanalyzer_1.ts.isTypeAssertionExpression(node)) {
            // 修复 "<'bar'>'bar'" -> "<const>'bar'"
            start = node.getStart() + 1; // 跳过开始的 <
            end = node.type.getEnd(); // 到类型结束
            fixedText = 'const';
        }
        else if (arkanalyzer_1.ts.isAsExpression(node)) {
            // 修复 "'bar' as 'bar'" -> "'bar' as const"
            start = node.type.getStart() - 3; // 包含 "as"
            end = node.type.getEnd();
            fixedText = 'as const';
        }
        return { range: [start, end], text: fixedText };
    }
    ;
    getInitializerText(initializer) {
        if (!initializer)
            return '';
        return initializer.getText();
    }
    ;
    findNodeAtPosition(sourceFile, pos) {
        let foundNode = sourceFile;
        const visit = (node) => {
            // 跳过 token 级别的节点
            if (node.kind < arkanalyzer_1.ts.SyntaxKind.FirstNode) {
                return;
            }
            const start = node.getStart();
            const end = node.getEnd();
            if (start <= pos && pos <= end) {
                // 记录当前匹配的节点
                foundNode = node;
                // 继续遍历子节点
                arkanalyzer_1.ts.forEachChild(node, visit);
            }
        };
        arkanalyzer_1.ts.forEachChild(sourceFile, visit);
        return foundNode;
    }
    ;
}
exports.PreferAsConstCheck = PreferAsConstCheck;
