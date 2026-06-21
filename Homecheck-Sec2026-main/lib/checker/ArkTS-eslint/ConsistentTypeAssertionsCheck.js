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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsistentTypeAssertionsCheck = void 0;
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
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Index_1 = require("../../Index");
const Index_2 = require("../../Index");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'ConsistentTypeAssertionsCheck');
const gMetaData = {
    severity: 2,
    ruleDocPath: 'docs/consistent-type-assertions.md',
    description: 'Enforce consistent usage of type assertions.'
};
var AssertionStyle;
(function (AssertionStyle) {
    AssertionStyle[AssertionStyle["angleBracket"] = 0] = "angleBracket";
    AssertionStyle[AssertionStyle["as"] = 1] = "as";
    AssertionStyle[AssertionStyle["never"] = 2] = "never";
})(AssertionStyle || (AssertionStyle = {}));
var ObjectLiteralTypeAssertions;
(function (ObjectLiteralTypeAssertions) {
    ObjectLiteralTypeAssertions[ObjectLiteralTypeAssertions["allowAsParameter"] = 0] = "allowAsParameter";
    ObjectLiteralTypeAssertions[ObjectLiteralTypeAssertions["allow"] = 1] = "allow";
    ObjectLiteralTypeAssertions[ObjectLiteralTypeAssertions["never"] = 2] = "never";
})(ObjectLiteralTypeAssertions || (ObjectLiteralTypeAssertions = {}));
class ConsistentTypeAssertionsCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    ruleOptions = { assertionStyle: AssertionStyle.as, objectLiteralTypeAssertions: ObjectLiteralTypeAssertions.allow };
    fileMatcher = {
        matcherType: Index_2.MatcherTypes.FILE
    };
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check
        };
        return [fileMatchBuildCb];
    }
    check = (targetFile) => {
        let options = this.rule.option;
        if (options.length > 0) {
            const option = options[0];
            if (option.assertionStyle === 'angle-bracket') {
                this.ruleOptions.assertionStyle = AssertionStyle.angleBracket;
            }
            else if (option.assertionStyle === 'as') {
                this.ruleOptions.assertionStyle = AssertionStyle.as;
            }
            if (option.objectLiteralTypeAssertions === 'allow') {
                this.ruleOptions.objectLiteralTypeAssertions = ObjectLiteralTypeAssertions.allow;
            }
            else if (option.objectLiteralTypeAssertions === 'allow-as-parameter') {
                this.ruleOptions.objectLiteralTypeAssertions = ObjectLiteralTypeAssertions.allowAsParameter;
            }
            else if (option.objectLiteralTypeAssertions === 'never') {
                this.ruleOptions.objectLiteralTypeAssertions = ObjectLiteralTypeAssertions.never;
            }
        }
        const sourceFile = arkanalyzer_1.AstTreeUtils.getSourceFileFromArkFile(targetFile);
        const sourceFileObject = arkanalyzer_1.ts.getParseTreeNode(sourceFile);
        if (sourceFileObject === undefined) {
            return;
        }
        this.issueMap.clear();
        this.loopNode(targetFile, sourceFile, sourceFileObject);
        this.reportSortedIssues();
    };
    loopNode(targetFile, sourceFile, aNode) {
        const children = aNode.getChildren();
        for (const child of children) {
            if (arkanalyzer_1.ts.isAsExpression(child) || arkanalyzer_1.ts.isTypeAssertionExpression(child)) {
                this.checkExpression(targetFile, sourceFile, child);
            }
            this.loopNode(targetFile, sourceFile, child);
        }
    }
    checkExpression(targetFile, sourceFile, aNode) {
        if (aNode.parent && aNode.parent.kind === arkanalyzer_1.ts.SyntaxKind.Parameter) {
            return;
        }
        const children = aNode.getChildren();
        let message = undefined;
        let fix = undefined;
        if (this.ruleOptions.assertionStyle === AssertionStyle.never) {
            if (arkanalyzer_1.ts.isTypeAssertionExpression(aNode)) {
                if (children[1].getText() === 'const') {
                    return;
                }
            }
            message = 'Do not use any type assertions.';
        }
        else {
            let objectNode = undefined;
            if (arkanalyzer_1.ts.isTypeAssertionExpression(aNode)) {
                if (children.length >= 2) {
                    objectNode = children[children.length - 1];
                }
            }
            else if (arkanalyzer_1.ts.isAsExpression(aNode)) {
                if (children.length !== 3) {
                    return;
                }
                objectNode = children[0];
                // fix
                fix = { range: [children[1].getStart(), children[1].getEnd()], text: 'satisfies' };
            }
            if (objectNode !== undefined) {
                // 对象类型的强转，例如{ bar: 5 } as Foo
                const result = this.getObjectLiteralFix(aNode, objectNode, children);
                if (result.fix) {
                    fix = result.fix;
                }
                if (result.message) {
                    message = result.message;
                }
            }
            if (message === undefined) {
                const result = this.getFixInfo(aNode);
                if (result.fix) {
                    fix = result.fix;
                }
                if (result.message) {
                    message = result.message;
                }
            }
        }
        this.reportIssue(targetFile, sourceFile, aNode, message, fix);
    }
    reportIssue(targetFile, sourceFile, aNode, message, fix) {
        if (message !== undefined) {
            const startPosition = arkanalyzer_1.ts.getLineAndCharacterOfPosition(sourceFile, aNode.getStart());
            const startLine = startPosition.line + 1;
            const startCol = startPosition.character + 1;
            const defect = this.addIssueReport(targetFile, startLine, startCol, 0, message, fix);
            if (fix !== undefined) {
                this.issueMap.set(defect.fixKey, { defect, fix });
            }
        }
    }
    getObjectLiteralFix(aNode, objectNode, children) {
        let message = undefined;
        let fix = undefined;
        const objNode = this.getTypeNode(objectNode);
        if (!arkanalyzer_1.ts.isObjectLiteralExpression(objNode)) {
            return { message: undefined, fix: undefined };
        }
        // 对象类型不允许强转
        if (this.ruleOptions.objectLiteralTypeAssertions === ObjectLiteralTypeAssertions.never) {
            message = 'Always prefer const x: T = { ... }.';
        }
        else if (this.ruleOptions.objectLiteralTypeAssertions === ObjectLiteralTypeAssertions.allowAsParameter) {
            // 只允许作为参数时强转
            if (aNode.parent.kind === arkanalyzer_1.ts.SyntaxKind.NewExpression ||
                aNode.parent.kind === arkanalyzer_1.ts.SyntaxKind.CallExpression ||
                aNode.parent.kind === arkanalyzer_1.ts.SyntaxKind.ThrowStatement) {
                if ((arkanalyzer_1.ts.isTypeAssertionExpression(aNode) && this.ruleOptions.assertionStyle === AssertionStyle.angleBracket) ||
                    (arkanalyzer_1.ts.isAsExpression(aNode) && this.ruleOptions.assertionStyle === AssertionStyle.as)) {
                    return { message, fix };
                }
            }
            else {
                message = 'Always prefer const x: T = { ... }.';
                // fix
                if (!arkanalyzer_1.ts.isTypeAssertionExpression(aNode)) {
                    return { message, fix };
                }
                if (this.ruleOptions.assertionStyle === AssertionStyle.angleBracket) {
                    const fixText = children[children.length - 1].getText() + ' satisfies ' + children[1].getText();
                    fix = { range: [aNode.getStart(), aNode.getEnd()], text: fixText };
                }
                else if (this.ruleOptions.assertionStyle === AssertionStyle.as) {
                    const fixInfo = this.getTypeFixInfo(aNode);
                    if (fixInfo) {
                        message = fixInfo.message;
                        fix = fixInfo.fix;
                    }
                }
            }
        }
        return { message, fix };
    }
    getFixInfo(aNode) {
        let message;
        let fix;
        if (this.ruleOptions.assertionStyle === AssertionStyle.as) {
            if (arkanalyzer_1.ts.isTypeAssertionExpression(aNode)) {
                const fixInfo = this.getTypeFixInfo(aNode);
                if (fixInfo) {
                    message = fixInfo.message;
                    fix = fixInfo.fix;
                }
            }
        }
        else if (this.ruleOptions.assertionStyle === AssertionStyle.angleBracket) {
            if (arkanalyzer_1.ts.isAsExpression(aNode)) {
                const children = aNode.getChildren();
                if (children.length === 3) {
                    const typeNode = children[2];
                    const typeName = typeNode.getText();
                    message = "Use '<" + typeName + ">' instead of 'as " + typeName + "'.";
                }
            }
        }
        return { message, fix };
    }
    getTypeFixInfo(aNode) {
        const aNodeChildren = aNode.getChildren();
        // 找到尖括号内的类型
        if (aNodeChildren.length !== 4) {
            return;
        }
        const typeNode = aNodeChildren[1];
        const realNode = this.removeBracket(typeNode);
        if (realNode === undefined) {
            return;
        }
        const typeName = realNode.getText();
        const message = "Use 'as " + typeName + "' instead of '<" + typeName + ">'.";
        // fix
        const hasOperation = this.needBracket(aNode);
        const nameNode = this.getTypeNode(aNodeChildren[3]);
        const fixText = (hasOperation ? '(' : '') + nameNode.getText() + ' as ' + typeName + (hasOperation ? ')' : '');
        const fix = { range: [aNode.getStart(), aNode.getEnd()], text: fixText };
        return { message, fix };
    }
    // 修复的节点是否需要加括号
    needBracket(aNode) {
        const parent = aNode.parent;
        if (!parent) {
            return false;
        }
        // 箭头函数需要增加括号：const x = () => <Foo>{ bar: 5 }; // const x = () => ({ bar: 5 } as Foo);
        if (parent.kind === arkanalyzer_1.ts.SyntaxKind.ArrowFunction) {
            return true;
            // 函数调用和new表达式中的对象字面量和数组字面量都添加括号
        }
        else if (parent.kind === arkanalyzer_1.ts.SyntaxKind.CallExpression ||
            parent.kind === arkanalyzer_1.ts.SyntaxKind.NewExpression) {
            const children = aNode.getChildren();
            for (const child of children) {
                const typeNode = this.getTypeNode(child);
                // 同时处理对象字面量和数组字面量
                if (arkanalyzer_1.ts.isObjectLiteralExpression(typeNode) ||
                    arkanalyzer_1.ts.isArrayLiteralExpression(typeNode)) {
                    return true;
                }
            }
            return false;
        }
        else { // 强转后面有操作符的要加括号：const x = <A>a + b; // const x = (a as A) + b;
            const children = parent.getChildren();
            const index = children.indexOf(aNode);
            if (index === children.length - 1) {
                return false;
            }
            const nextNode = children[index + 1];
            return nextNode.kind === arkanalyzer_1.ts.SyntaxKind.PlusToken;
        }
        return false;
    }
    // 去掉代码外层的括号
    getTypeNode(aNode) {
        if (aNode.kind === arkanalyzer_1.ts.SyntaxKind.ParenthesizedExpression) {
            const children = aNode.getChildren();
            if (children.length === 3) {
                return this.getTypeNode(children[1]);
            }
        }
        return aNode;
    }
    // 去掉圆括号，例如<((A))>a中A外面的圆括号
    removeBracket(aNode) {
        let hasParen = false;
        const children = aNode.getChildren();
        if (children.length === 3) {
            if (children[0].kind === arkanalyzer_1.ts.SyntaxKind.OpenParenToken && children[children.length - 1].kind === arkanalyzer_1.ts.SyntaxKind.CloseParenToken) {
                hasParen = true;
            }
        }
        if (hasParen) {
            const result = this.removeBracket(children[1]);
            if (result) {
                return result;
            }
        }
        else {
            return aNode;
        }
    }
    addIssueReport(arkFile, line, startCol, endCol, message, fix) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const filePath = arkFile.getFilePath();
        const defect = new Index_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, true);
        this.issues.push(new Defects_1.IssueReport(defect, fix));
        DefectsList_1.RuleListUtil.push(defect);
        return defect;
    }
    reportSortedIssues() {
        if (this.issueMap.size === 0) {
            return;
        }
        const sortedIssues = Array.from(this.issueMap.entries())
            .sort(([keyA], [keyB]) => Index_1.Utils.sortByLineAndColumn(keyA, keyB));
        this.issues = [];
        sortedIssues.forEach(([_, issue]) => {
            DefectsList_1.RuleListUtil.push(issue.defect);
            this.issues.push(issue);
        });
    }
}
exports.ConsistentTypeAssertionsCheck = ConsistentTypeAssertionsCheck;
