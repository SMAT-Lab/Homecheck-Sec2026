"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DotNotationCheck = void 0;
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
const lib_1 = require("arkanalyzer/lib");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const Defects_1 = require("../../model/Defects");
const Utils_1 = require("../../utils/common/Utils");
const defaultOptions1 = {
    allowPrivateClassPropertyAccess: false,
    allowProtectedClassPropertyAccess: false,
    allowIndexSignaturePropertyAccess: false,
    allowKeywords: true,
    allowPattern: '',
};
const stringStart = /^[\d+\-*]/;
const codeStringReg = /^['"](.*)['"]$/;
const gMetaData = {
    severity: 1,
    ruleDocPath: 'docs/dot-notation.md',
    description: 'is better written in dot notation.',
};
//要求或不允许函数标识符和它们的调用之间有空格
class DotNotationCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    issueMap = new Map();
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    registerMatchers() {
        const fileMatchBuildCb = {
            matcher: this.fileMatcher,
            callback: this.check,
        };
        return [fileMatchBuildCb];
    }
    check = (targetFile) => {
        const filePath = targetFile.getName();
        const isTs = this.getFileExtension(filePath, 'ts');
        if (!isTs) {
            return;
        }
        let options = this.rule.option[0] || defaultOptions1;
        let mergedOptions = {
            ...defaultOptions1,
            ...options,
        };
        const scene = targetFile.getScene();
        const classes = targetFile.getClasses();
        let arfileCode = targetFile.getCode();
        const arkfilePath = targetFile.getFilePath();
        this.issueMap.clear();
        this.checkClassforMethod(scene, arfileCode, arkfilePath, classes, mergedOptions);
        this.reportSortedIssues();
    };
    // 判断一个字符串是否为关键字或操作符
    isKeyword(str) {
        const keywords = [
            'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'return', 'function',
            'class', 'const', 'let', 'var', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super',
            'import', 'export', 'default', 'void', 'undefined', 'null', 'true', 'false', 'await', 'async',
            'instanceof', 'typeof', 'in', 'debugger', 'yield', 'eval', 'arguments', 'delete', 'any',
            'unknown', 'never', 'type', 'interface', 'enum', 'as', 'extends', 'implements', 'infer', 'declare',
            'module', 'namespace', 'public', 'private', 'protected', 'readonly'
        ];
        return keywords.includes(str);
    }
    ;
    addIssueReport(arkFilePath, line, startCol, endCol, name, message) {
        const severity = this.rule.alert ?? this.metaData.severity;
        const defect = new Defects_1.Defects(line, startCol, endCol, message, severity, this.rule.ruleId, arkFilePath, this.metaData.ruleDocPath, true, false, false);
        this.defects.push(defect);
        return defect;
    }
    ruleFix(pos, end, text) {
        return { range: [pos, end], text: text };
    }
    reportSortedIssues() {
        if (this.issueMap.size === 0) {
            return;
        }
        const sortedIssues = Array.from(this.issueMap.entries()).sort(([keyA], [keyB]) => Utils_1.Utils.sortByLineAndColumn(keyA, keyB));
        this.issues = [];
        sortedIssues.forEach(([_, issue]) => {
            DefectsList_1.RuleListUtil.push(issue.defect);
            this.issues.push(issue);
        });
    }
    getFileExtension(filePath, filetype) {
        // 使用正则表达式匹配文件后缀
        const match = filePath.match(/\.([0-9a-zA-Z]+)$/);
        // 如果匹配到了扩展名，且扩展名等于 filetype，则返回扩展名，否则返回空字符串
        if (match) {
            const extension = match[1];
            return extension === filetype;
        }
        return false;
    }
    addFixByDot(filePath, declareOrigtext, fieldName, start, lineStartNo, lineStartCol) {
        if (!this.isKeyword(fieldName)) {
            return;
        } // 先检查是否为关键词，避免不必要遍历
        const astRoot = lib_1.AstTreeUtils.getASTNode(fieldName, declareOrigtext);
        const matchingNodes = this.collectMatchingNodes(astRoot);
        for (const chd of matchingNodes) {
            if (!lib_1.ts.isPropertyAccessExpression(chd)) {
                continue;
            } // 只处理 `obj.key` 形式
            for (const node of chd.getChildren()) {
                if (node.getText() !== fieldName) {
                    continue;
                } // 过滤掉非匹配字段名
                const startOffset = start + node.getStart();
                const endOffset = start + node.getEnd();
                const startColOffset = lineStartCol; //+ posionFields.startCol;
                const defect = this.addIssueReport(filePath, lineStartNo, startColOffset, startColOffset + fieldName.length, `.${fieldName}`, `.${fieldName} ` + this.metaData.description);
                const fix = this.ruleFix(startOffset, endOffset, `['${fieldName}']`);
                defect.fixable = true;
                this.issueMap.set(defect.fixKey, { defect, fix });
            }
        }
    }
    addFix(filePath, declareOrigtext, fieldName, start, lineStartNo, lineStartCol) {
        const astRoot = lib_1.AstTreeUtils.getASTNode(fieldName, declareOrigtext);
        const matchingNodes = this.collectMatchingNodes(astRoot);
        for (const chd of matchingNodes) {
            if (!lib_1.ts.isElementAccessExpression(chd)) {
                continue;
            } // 只处理 obj['key'] 形式
            const chdren = chd.getChildren();
            const argumentIndex = (chdren.length - 2) > 0 ? (chdren.length - 2) : 0;
            const openBracketToken = chdren[chdren.length - 3];
            const argumentExpression = chdren[argumentIndex];
            const closeBracketToken = chdren[chdren.length - 1];
            const stringLiteral = argumentExpression.getText().replace(codeStringReg, '$1');
            const fieldNameString = fieldName.replace(codeStringReg, '$1');
            const startCol = astRoot.getLineAndCharacterOfPosition(argumentExpression.getStart()).character + 1;
            const startLine = astRoot.getLineAndCharacterOfPosition(argumentExpression.getEnd()).line;
            //ts没有判定NullKeyword
            if (!(lib_1.ts.isStringLiteral(argumentExpression) || fieldNameString === 'null') ||
                stringLiteral !== fieldNameString || stringStart.test(fieldNameString)) {
                continue;
            } // 确保是字符串字面量
            const defect = this.addIssueReport(filePath, lineStartNo + startLine, lineStartCol + startCol - 1, lineStartCol + startCol + fieldName.length - 1, `[${fieldNameString}]`, `['${fieldNameString}'] ` + this.metaData.description);
            const fix = this.ruleFix(start + openBracketToken.getStart(), start + closeBracketToken.getEnd(), `${fieldNameString}`);
            defect.fixable = true;
            this.issueMap.set(defect.fixKey, { defect, fix });
        }
    }
    collectMatchingNodes(astRoot) {
        const matchingNodes = [];
        astRoot.forEachChild((child) => matchingNodes.push(...this.collectNodes(child)));
        return matchingNodes;
    }
    //检查所有的节点
    collectNodes(node) {
        const matchingNodes = [];
        // 如果节点是 ElementAccessExpression，添加到数组
        if (lib_1.ts.isElementAccessExpression(node)) {
            matchingNodes.push(node);
        }
        // 如果节点是 PropertyAccessExpression，添加到数组
        if (lib_1.ts.isPropertyAccessExpression(node)) {
            matchingNodes.push(node);
        }
        // 递归遍历所有子节点
        lib_1.ts.forEachChild(node, (childNode) => {
            // 将子节点符合条件的节点合并到当前匹配节点数组
            matchingNodes.push(...this.collectNodes(childNode));
        });
        return matchingNodes;
    }
    //获取分割符
    getLineBreak(text) {
        if (text.includes('\r\n')) {
            return '\r\n';
        }
        else if (text.includes('\n')) {
            return '\n';
        }
        else {
            return '\r';
        }
    }
    checkClassforMethod(scene, arfilecode, arkfilePath, classes, mergedOptions) {
        for (const clas of classes) {
            const methods = clas.getMethods();
            for (const med of methods) {
                const varLocal = med.getBody()?.getLocals() ?? new Map();
                this.checkLocal(varLocal, scene, arfilecode, arkfilePath, mergedOptions);
                //处理执行函数 
                const stmts = med.getBody()?.getCfg().getStmts() ?? [];
                this.infunCallElementAccessExpression(stmts, arkfilePath, mergedOptions);
            }
        }
    }
    //处理执行函数
    infunCallElementAccessExpression(stmts, arkFilePath, mereOptions) {
        for (const stmt of stmts) {
            if (stmt instanceof lib_1.ArkInvokeStmt) {
                this.exceFunctionCall(stmt, arkFilePath, mereOptions);
            }
        }
    }
    checkLocal(varLocal, scene, arfilecode, arkfilePath, mergedOptions) {
        const regex = new RegExp(mergedOptions.allowPattern);
        // 找到当前分割符所在行
        let lineBreak = this.getLineBreak(arfilecode);
        for (const [key, local] of varLocal) {
            if (key === 'this') {
                continue;
            }
            else if (key.startsWith('%')) {
                const declareStmt = local.getDeclaringStmt();
                const position = declareStmt?.getOriginPositionInfo();
                if (declareStmt instanceof lib_1.ArkAssignStmt && position) { //合成stmts
                    const rightOp = declareStmt.getRightOp();
                    this.exceRightOp(rightOp, declareStmt, scene, position, arfilecode, arkfilePath, lineBreak, mergedOptions, regex);
                }
            }
            else {
                //处理赋值中存在的情况
                this.processAssignmentStatements(local, scene, arfilecode, arkfilePath, lineBreak, mergedOptions, regex);
            }
        }
    }
    processAssignmentStatements(local, scene, arfilecode, arkfilePath, lineBreak, mergedOptions, regex) {
        // 获取所有的使用语句
        const declareStmt = local.getDeclaringStmt();
        let usedStmts = local.getUsedStmts();
        usedStmts = declareStmt ? [...usedStmts, declareStmt] : usedStmts;
        for (const useStmt of usedStmts) {
            const position = useStmt?.getOriginPositionInfo();
            // 确保 useStmt 是 ArkAssignStmt，并且 position 存在
            if (useStmt instanceof lib_1.ArkAssignStmt && position) {
                const leftOp = useStmt.getLeftOp();
                const rightOp = useStmt.getRightOp();
                // 处理左侧操作数
                this.exceLeftOp(leftOp, useStmt, scene, position, arfilecode, arkfilePath, lineBreak, mergedOptions, regex);
                // 处理右侧操作数
                this.exceRightOp(rightOp, useStmt, scene, position, arfilecode, arkfilePath, lineBreak, mergedOptions, regex);
            }
        }
    }
    addCollectaboutClass(arfilecode, arkfilePath, arkField, declareOrigtext, position, lineBreak, mergedOptions, regex) {
        const allowKeywords = mergedOptions.allowKeywords;
        const fieldName = arkField?.getName();
        const isPrivate = arkField?.isPrivate();
        const isProtected = arkField?.isProtected();
        const lineStartNo = position?.getLineNo() ?? -1;
        const lineStartCol = position?.getColNo() ?? -1;
        let cnt = 0;
        for (let index = 1; index < lineStartNo; index++) {
            cnt = arfilecode.indexOf(lineBreak, cnt + 1);
        }
        const start = cnt === 0 && lineStartNo === 1 ? 0 : cnt + lineStartCol + 1;
        if (allowKeywords) {
            if (mergedOptions.allowPrivateClassPropertyAccess && isPrivate) {
                return;
            }
            else if (mergedOptions.allowProtectedClassPropertyAccess && isProtected) {
                return;
            }
            else if (!(mergedOptions.allowPattern !== '' && regex.test(fieldName))) {
                this.addFix(arkfilePath, declareOrigtext, fieldName, start, lineStartNo, lineStartCol);
            }
        }
        else {
            this.addFixByDot(arkfilePath, declareOrigtext, fieldName, start, lineStartNo, lineStartCol);
        }
    }
    addCollectOther(arfilecode, declareOrigtext, arkfilePath, lineBreak, position, mergedOptions, regex, fieldName, clas) {
        const allowKeywords = mergedOptions.allowKeywords;
        const allowIndexSignaturePropertyAccess = mergedOptions.allowIndexSignaturePropertyAccess;
        const lineStartNot = position?.getLineNo() ?? -1;
        const lineStartColt = position?.getColNo() ?? -1;
        let cntt = 0;
        for (let index = 1; index < lineStartNot; index++) {
            cntt = arfilecode.indexOf(lineBreak, cntt + 1);
        }
        //对第一行第一列特殊处理，后续代码都是以0为起始偏移，所以需要+1
        const start = cntt === 0 && lineStartNot === 1 ? 0 : cntt + lineStartColt + 1;
        if (allowKeywords) {
            if (allowIndexSignaturePropertyAccess && clas) {
                return;
            }
            else if (!(mergedOptions.allowPattern !== '' && regex.test(fieldName))) {
                this.addFix(arkfilePath, declareOrigtext, fieldName, start, lineStartNot, lineStartColt);
            }
        }
        else {
            this.addFixByDot(arkfilePath, declareOrigtext, fieldName, start, lineStartNot, lineStartColt);
        }
    }
    exceRightOp(rightOp, declareStmt, scene, position, arfilecode, arkfilePath, lineBreak, mergedOptions, regex) {
        const rightOpField = rightOp;
        const declareOrigtext = declareStmt.getOriginalText() ?? '';
        if (rightOpField.field || rightOp instanceof lib_1.AbstractFieldRef) {
            const rightOpF = (rightOpField.field ? rightOpField.field : rightOp);
            const fieldsign = rightOpF.getFieldSignature();
            const classSign = fieldsign.getDeclaringSignature();
            if (classSign instanceof lib_1.ClassSignature) {
                const clas = scene.getClass(classSign);
                const arkField = clas?.getField(fieldsign);
                //有定义class的
                if (arkField && position) {
                    this.addCollectaboutClass(arfilecode, arkfilePath, arkField, declareOrigtext, position, lineBreak, mergedOptions, regex);
                }
                else {
                    //没有class类的
                    const isclass = clas ? true : false;
                    const fieldName = rightOpF.getFieldName();
                    this.addCollectOther(arfilecode, declareOrigtext, arkfilePath, lineBreak, position, mergedOptions, regex, fieldName, isclass);
                }
            }
        }
        else if (rightOp instanceof lib_1.ArkArrayRef) {
            const fieldName = rightOp.getIndex().toString();
            this.addCollectOther(arfilecode, declareOrigtext, arkfilePath, lineBreak, position, mergedOptions, regex, fieldName, false);
        }
    }
    exceLeftOp(leftOp, declareStmt, scene, position, arfilecode, arkfilePath, lineBreak, mergedOptions, regex) {
        if (leftOp instanceof lib_1.AbstractFieldRef) {
            const fieldsign = leftOp.getFieldSignature();
            const classSign = fieldsign.getDeclaringSignature();
            const declareOrigtext = declareStmt.getOriginalText() ?? '';
            if (classSign instanceof lib_1.ClassSignature) {
                const clas = scene.getClass(classSign);
                const arkField = clas?.getField(fieldsign);
                //有定义class的
                if (arkField && position) {
                    this.addCollectaboutClass(arfilecode, arkfilePath, arkField, declareOrigtext, position, lineBreak, mergedOptions, regex);
                }
                else {
                    //没有class类的
                    const isclass = clas ? true : false;
                    const fieldName = leftOp.getFieldName();
                    this.addCollectOther(arfilecode, declareOrigtext, arkfilePath, lineBreak, position, mergedOptions, regex, fieldName, isclass);
                }
            }
        }
    }
    exceFunctionCall(stmt, arkfilePath, mergedOptions) {
        const allowKeywords = mergedOptions.allowKeywords;
        const origText = stmt.getOriginalText() ?? '';
        const position = stmt.getOriginPositionInfo();
        if (allowKeywords && !origText.startsWith('delete')) {
            const origText = stmt.getOriginalText() ?? '';
            const astRoot = lib_1.AstTreeUtils.getASTNode('fieldName', origText);
            const matchingNodes = this.collectMatchingNodes(astRoot);
            for (const chd of matchingNodes) {
                if (!lib_1.ts.isElementAccessExpression(chd)) {
                    continue;
                } // 只处理 obj['key'] 形式
                const chdren = chd.getChildren();
                const argumentIndex = (chdren.length - 2) > 0 ? (chdren.length - 2) : 0;
                const argumentExpression = chdren[argumentIndex];
                const stringLiteral = argumentExpression.getText().replace(codeStringReg, '$1');
                if (!lib_1.ts.isStringLiteral(argumentExpression)) {
                    continue;
                } // 确保是字符串字面量
                const lineStartNo = position?.getLineNo() ?? -1;
                const startColOffset = astRoot.getLineAndCharacterOfPosition(argumentExpression.getStart()).character + 1;
                //对第一行第一列特殊处理，后续代码都是以0为起始偏移，所以需要+1
                const defect = this.addIssueReport(arkfilePath, lineStartNo, startColOffset, startColOffset + stringLiteral.length + 2, `[${stringLiteral}]`, `['${stringLiteral}'] ` + this.metaData.description);
                if (!this.issueMap.has(defect.fixKey)) {
                    this.issueMap.set(defect.fixKey, { defect, fix: undefined });
                }
            }
        }
    }
}
exports.DotNotationCheck = DotNotationCheck;
