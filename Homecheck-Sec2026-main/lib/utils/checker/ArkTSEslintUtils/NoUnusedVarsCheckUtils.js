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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoUnusedVarsCheckUtils = void 0;
const lib_1 = require("arkanalyzer/lib");
var VarType;
(function (VarType) {
    VarType["Var"] = "var";
    VarType["Class"] = "class";
    VarType["Import"] = "import";
    VarType["Method"] = "method";
    VarType["Type"] = "type";
    VarType["Args"] = "args";
    VarType["ArgsP"] = "ArrayBindingPattern";
    VarType["Catch"] = "catch";
    VarType["Static"] = "static";
    VarType["UsedIgnorePattern"] = "UsedIgnorePattern";
})(VarType || (VarType = {}));
const accuratePositionReg = /[.*+?^=!:${}()|\[\]\/\\]/g;
const replaceStringReg = /[.*+?^=!:${}()|\[\]\/\\]/g;
const textUsedReg = /[.*+?^${}()|[\]\\]/g;
class NoUnusedVarsCheckUtils {
    static collecUnusedImports(importInfos, targetFilePath, importNoused) {
        let nousedSet = [];
        for (const info of importInfos) {
            const lineNo = info.getOriginTsPosition().getLineNo();
            const codeImport = info.getTsSourceCode();
            const nameAs = info.getImportClauseName();
            const posion = this.getAccuratePosition(codeImport, nameAs);
            if (importNoused.includes(nameAs)) {
                //处理未使用的import
                nousedSet.push({ varType: VarType.Import,
                    argPosion: [posion.line + lineNo - 1, posion.col, posion.col + nameAs.length],
                    name: nameAs, filePath: targetFilePath
                });
            }
        }
        return nousedSet;
    }
    static collecUnusedTypes(noUsedtype, targetFilePath) {
        let nousedSet = [];
        for (const type of noUsedtype) {
            nousedSet.push({ varType: VarType.Type,
                argPosion: [type.line, type.character, type.character],
                name: type.name, filePath: targetFilePath,
            });
        }
        return nousedSet;
    }
    static collecUnusedGenerics(generics, targetFilePath) {
        let nousedSet = [];
        for (const generic of generics) {
            nousedSet.push({ varType: VarType.Type,
                argPosion: [generic.line, generic.character, generic.character + generic.name.length],
                name: generic.name, filePath: targetFilePath,
            });
        }
        return nousedSet;
    }
    //抽取函数参数语句
    static extractParameters(methodCode) {
        const start = methodCode.indexOf('(');
        if (start === -1) {
            return [];
        }
        let depth = 0;
        let end = -1;
        // 找到配对的第一个括号
        for (let i = start; i < methodCode.length; i++) {
            const char = methodCode[i];
            if (char === '(') {
                depth++;
            }
            else if (char === ')') {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end === -1) {
            return [];
        }
        const paramStr = methodCode.slice(start + 1, end);
        let paramList = [];
        let current = '';
        let nested = 0;
        let inString = null;
        let inArrowFn = false;
        const exceresult = this.excetParamsBody(paramStr, inString, current, inArrowFn, nested, paramList);
        current = exceresult.current;
        paramList = exceresult.paramList;
        if (current.trim()) {
            paramList.push(current.trim());
        }
        return paramList;
    }
    static extractParameters_nested(char, nested) {
        if (['{', '[', '(', '<'].includes(char)) {
            nested++;
        }
        else if (['}', ']', ')', '>'].includes(char)) {
            nested--;
        }
        return nested;
    }
    static excetParamsBody(paramStr, inString, current, inArrowFn, nested, paramList) {
        for (let i = 0; i < paramStr.length; i++) {
            const char = paramStr[i];
            const prev = paramStr[i - 1];
            const next = paramStr[i + 1];
            // 字符串处理：支持 '', "", ``
            if (!inString && (char === '\'' || char === '"' || char === '`')) {
                inString = char;
            }
            else if (inString && char === inString && prev !== '\\') {
                inString = null;
            }
            if (inString) {
                current += char;
                continue;
            }
            // 判断箭头函数 =>
            if (char === '=' && next === '>') {
                inArrowFn = true;
                current += '=>';
                i++; // 跳过 >
                continue;
            }
            // 处理嵌套结构
            nested = this.extractParameters_nested(char, nested);
            // 只有在顶层并且不在箭头函数中才处理逗号分割
            if (char === ',' && nested === 0 && !inArrowFn) {
                paramList.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
            // 重置箭头函数标识
            if (inArrowFn && (char === '}' || char === ')')) {
                inArrowFn = false;
            }
        }
        return { inString: inString, current: current, inArrowFn: inArrowFn, nested: nested, paramList: paramList };
    }
    static getAccuratePosition(codeImport, name) {
        const lines = codeImport.split('\n');
        // 转义 name 中的正则特殊字符
        const escapedName = name.replace(accuratePositionReg, '\\$&');
        // 使用正则，确保匹配完整的标识符（前后是非字母数字或下划线）
        const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
        for (let i = 0; i < lines.length; i++) {
            let match;
            while ((match = regex.exec(lines[i])) !== null) {
                return { line: i + 1, col: match.index + 1 }; // 返回行号和列号
            }
        }
        return { line: -1, col: -1 }; // 未找到
    }
    static setWarnInfoForArgType(noUseVar, warnInfo) {
        if (noUseVar.argPosion) {
            warnInfo.line = noUseVar.argPosion[0];
            warnInfo.startCol = noUseVar.argPosion[1];
            warnInfo.endCol = noUseVar.argPosion[2];
            warnInfo.filePath = noUseVar.filePath ?? '';
        }
    }
    static setWarnInfoForMethodNobody(noUseVar, warnInfo) {
        if (noUseVar.argPosion && warnInfo.line === -1) {
            warnInfo.line = noUseVar.argPosion[0];
            warnInfo.startCol = noUseVar.argPosion[1];
            warnInfo.endCol = noUseVar.argPosion[2];
            warnInfo.filePath = noUseVar.arkMethod?.getDeclaringArkFile().getFilePath() ?? '';
        }
    }
    static setWarnInfoForClass(noUseVar, warnInfo) {
        const strNum = noUseVar.arkClass?.getColumn() ?? -1;
        const posion = this.getTextPosition(noUseVar.arkClass?.getCode() ?? '', noUseVar.name.toString());
        let startCol = strNum + posion.column - 1;
        if (posion.line > 0) {
            startCol = posion.column;
        }
        warnInfo.line = (noUseVar.arkClass?.getLine() ?? -1) + posion.line;
        warnInfo.startCol = startCol;
        warnInfo.endCol = startCol + noUseVar.name.length;
        warnInfo.filePath =
            noUseVar.arkClass?.getDeclaringArkFile()?.getFilePath() ?? '';
    }
    static setWarnInfoForType(noUseVar, warnInfo) {
        warnInfo.line = noUseVar.argPosion?.[0] ?? -1;
        warnInfo.startCol = noUseVar.argPosion?.[1] ?? -1;
        warnInfo.endCol = warnInfo.startCol + noUseVar.name.length;
        warnInfo.filePath =
            noUseVar.arkClass?.getDeclaringArkFile()?.getFilePath() ?? '';
    }
    static setWarnInfoForArgs(noUseVar, warnInfo) {
        warnInfo.line = noUseVar.argPosion?.[0] ?? -1;
        warnInfo.startCol = (noUseVar.argPosion?.[1] ?? -1) + 1;
        warnInfo.endCol = warnInfo.startCol + noUseVar.name.length;
        warnInfo.filePath =
            noUseVar.arkClass?.getDeclaringArkFile()?.getFilePath() ?? '';
    }
    static setWarnInfoForVar(noUseVar, warnInfo) {
        if (noUseVar.isAll) {
            warnInfo.line = noUseVar.argPosion?.[0] ?? -1;
            warnInfo.startCol = (noUseVar.argPosion?.[1] ?? -1);
            warnInfo.endCol = warnInfo.startCol + noUseVar.name.length;
            warnInfo.filePath = noUseVar.filePath;
        }
    }
    static setWarnInfoForNamespace(noUseVar, warnInfo) {
        const indexNum = noUseVar.arkNamespace?.getCode()?.indexOf(noUseVar.name.toString()) ?? -1;
        const strNum = noUseVar.arkNamespace?.getColumn() ?? -1;
        const startCol = indexNum + strNum;
        warnInfo.line = noUseVar.arkNamespace?.getLine() ?? -1;
        warnInfo.startCol = startCol;
        warnInfo.endCol = startCol + noUseVar.name.length;
        warnInfo.filePath =
            noUseVar.arkNamespace?.getDeclaringArkFile()?.getFilePath() ?? '';
    }
    static getTextPosition(text, target) {
        const escapedTarget = this.escapeRegExp(target);
        const strictWordRegex = new RegExp(`(?<![a-zA-Z0-9])${escapedTarget}(?![a-zA-Z0-9])`, 's'); // 's' 模式支持跨行
        const match = strictWordRegex.exec(text);
        if (!match) {
            return { line: -1, column: -1 };
        }
        const index = match.index;
        const linesUpToMatch = text.slice(0, index).split('\n');
        const line = linesUpToMatch.length - 1;
        const column = linesUpToMatch[linesUpToMatch.length - 1].length + 1;
        return { line, column };
    }
    static escapeRegExp(str) {
        return str.replace(replaceStringReg, '\\$&'); // 转义所有正则特殊字符
    }
    static getArkFileAllClasss(targetFile) {
        let allClass = [];
        const namespaces = this.getAllNamespaces(targetFile);
        for (const namespace of namespaces) {
            const classes = !namespace.isDeclare() ? (namespace.getClasses() ?? []).filter(cls => cls.getName() !== '%dflt') : [];
            allClass = allClass.concat(classes);
        }
        const classes = targetFile.getClasses() ?? [];
        allClass = allClass.concat(classes);
        return allClass;
    }
    static getAllNamespaces(targetFile) {
        const result = [];
        const namespaces = targetFile.getNamespaces?.(); // 确保 getNamespaces() 存在
        if (Array.isArray(namespaces)) {
            this.recursiveSearch(namespaces, result);
        }
        return result;
    }
    static recursiveSearch(namespaces, result) {
        for (const ns of namespaces) {
            result.push(ns); // 记录当前命名空间
            // 确保 getNamespaces() 存在且返回的是数组
            const subNamespaces = ns.getNamespaces?.();
            if (Array.isArray(subNamespaces)) {
                this.recursiveSearch(subNamespaces, result); // 递归调用子命名空间
            }
        }
    }
    //获取方法体code
    static extractMethodBody(methodCode) {
        let braceCount = 0;
        let startIndex = -1;
        // 遍历代码，找到方法体的起始 `{`
        for (let i = 0; i < methodCode.length; i++) {
            if (methodCode[i] === '{') {
                if (startIndex === -1) {
                    startIndex = i; // 记录第一个 `{`
                }
                braceCount++;
            }
            else if (methodCode[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    // 找到匹配的 `}`
                    return methodCode.substring(startIndex + 1, i).trim();
                }
            }
        }
        // 如果没有找到完整的方法体，返回空字符串
        return '';
        ``;
    }
    // 主函数，返回未使用类型的数组，并附带行列号信息
    static noUsedType(astRoot) {
        const typeMap = new Map();
        const noUsedTypes = [];
        this.collectTypes(astRoot, astRoot, typeMap);
        this.checkTypeUsage(astRoot, astRoot, typeMap);
        for (const [name, info] of typeMap.entries()) {
            if (!info.used) {
                const { line, character } = astRoot.getLineAndCharacterOfPosition(info.pos);
                // 注意：行列号从 0 开始，所以返回时加 1
                noUsedTypes.push({
                    name,
                    kind: info.kind,
                    line: line + 1,
                    character: character + 1,
                });
            }
        }
        return noUsedTypes;
    }
    static collectTypes(node, astRoot, typeMap) {
        if (lib_1.ts.isTypeAliasDeclaration(node)) {
            const isExported = node.modifiers &&
                node.modifiers.some((mod) => mod.kind === lib_1.ts.SyntaxKind.ExportKeyword);
            typeMap.set(node.name.text, {
                used: isExported ? true : false,
                kind: 'type别名',
                pos: node.name.getStart(astRoot),
            });
        }
        else if (lib_1.ts.isInterfaceDeclaration(node)) {
            const isExported = node.modifiers &&
                node.modifiers.some((mod) => mod.kind === lib_1.ts.SyntaxKind.ExportKeyword);
            typeMap.set(node.name.text, {
                used: isExported ? true : false,
                kind: '接口',
                pos: node.name.getStart(astRoot),
            });
        }
        lib_1.ts.forEachChild(node, (child) => this.collectTypes(child, astRoot, typeMap));
    }
    static checkTypeUsage(node, astRoot, typeMap) {
        if (lib_1.ts.isIdentifier(node) && node.parent) {
            if (!this.isTypeDeclaration(node) && !this.isDefaultExport(node)) {
                this.markTypeAsUsed(node, typeMap);
            }
        }
        lib_1.ts.forEachChild(node, (child) => this.checkTypeUsage(child, astRoot, typeMap));
    }
    static isTypeDeclaration(node) {
        return lib_1.ts.isTypeAliasDeclaration(node.parent) && node.parent.name === node;
    }
    static isDefaultExport(node) {
        return (lib_1.ts.isExportAssignment(node.parent) && node.parent.isExportEquals === false);
    }
    static markTypeAsUsed(node, typeMap) {
        if (typeMap.has(node.text)) {
            const info = typeMap.get(node.text);
            info.used = true;
            typeMap.set(node.text, info);
        }
    }
    static isTextUsed(code, name) {
        // 转义正则特殊字符
        const escapedName = name.replace(textUsedReg, '\\$&');
        // 正则匹配完整的标识符，并确保不在引号内
        const regex = new RegExp(`\\b${escapedName}\\b(?![^"']*["'])`, 'g');
        return regex.test(code);
    }
    static collectGenerics(node, typeMap) {
        // Handle the specific cases where generics are present
        this.handleGenerics(node, typeMap);
        // Recursively traverse child nodes
        lib_1.ts.forEachChild(node, (child) => this.collectGenerics(child, typeMap));
    }
    // Handle the specific cases for type aliases, function declarations, and constructor type nodes
    static handleGenerics(node, typeMap) {
        if (lib_1.ts.isTypeAliasDeclaration(node) ||
            lib_1.ts.isFunctionDeclaration(node) ||
            lib_1.ts.isFunctionExpression(node) ||
            lib_1.ts.isInterfaceDeclaration(node) ||
            lib_1.ts.isClassDeclaration(node) ||
            lib_1.ts.isArrowFunction(node) ||
            lib_1.ts.isMethodDeclaration(node) ||
            lib_1.ts.isClassExpression(node) ||
            lib_1.ts.isFunctionTypeNode(node)) {
            this.collectTypeAliasGenerics(node, typeMap);
        }
        if ((lib_1.ts.isTypeAliasDeclaration(node) &&
            lib_1.ts.isConstructorTypeNode(node.type)) ||
            lib_1.ts.isConstructSignatureDeclaration(node)) {
            this.collectConstructorTypeGenerics(node, typeMap);
        }
    }
    // Collect generics for type aliases and function declarations
    static collectTypeAliasGenerics(node, typeMap) {
        const decorators = lib_1.ts.canHaveDecorators(node) ? lib_1.ts.getDecorators(node) : undefined;
        if (node.typeParameters && decorators === undefined) {
            node.typeParameters.forEach((typeParam) => {
                const genericKey = `${node.getText()}--->${typeParam.name.text}`;
                if (!typeMap.has(genericKey)) {
                    typeMap.set(genericKey, {
                        used: false,
                        kind: typeParam.name.text,
                        pos: typeParam.getStart(),
                        node: node,
                    });
                }
            });
        }
    }
    // Collect generics for constructor type aliases
    static collectConstructorTypeGenerics(node, typeMap) {
        if (node.typeParameters) {
            node.typeParameters.forEach((typeParam) => {
                const genericKey = `${node.getText()}-${typeParam.name.text}`;
                if (!typeMap.has(genericKey)) {
                    typeMap.set(genericKey, {
                        used: false,
                        kind: typeParam.name.text,
                        pos: typeParam.getStart(),
                        node: node,
                    });
                }
            });
        }
    }
    static checkGenericUsages(typeMap) {
        for (const [keyString, value] of typeMap) {
            this.checkGenericUsage(value.node, value);
        }
    }
    static checkGenericUsage(node, typeMap) {
        this.checkPressTypeUsage(node, typeMap);
        // 递归检查子节点
        lib_1.ts.forEachChild(node, (child) => this.checkGenericUsage(child, typeMap));
    }
    // 检查函数返回值中的泛型
    static checkPressTypeUsage(node, typeMap) {
        if (!node) {
            return;
        }
        const genericText = this.isGenericUsedInType(node);
        if (!genericText) {
            return;
        }
        if (typeMap.kind === genericText) {
            const infoPos = typeMap?.pos;
            const nodePos = node.getStart();
            infoPos !== nodePos ? (typeMap.used = true) : (typeMap.used = false);
        }
    }
    static isGenericUsedInType(node) {
        if (!node) {
            return null;
        }
        if (lib_1.ts.isTypeParameterDeclaration(node)) {
            return node.name.getText();
        }
        if (lib_1.ts.isTypeReferenceNode(node)) {
            return this.handleTypeReferenceNode(node);
        }
        if (lib_1.ts.isInferTypeNode(node)) {
            return node.typeParameter.name.getText();
        }
        if (lib_1.ts.isConditionalTypeNode(node)) {
            return this.handleConditionalTypeNode(node);
        }
        if (lib_1.ts.isIndexedAccessTypeNode(node)) {
            return this.handleIndexedAccessTypeNode(node);
        }
        if (lib_1.ts.isMappedTypeNode(node)) {
            return this.isGenericUsedInType(node.type ?? node.typeParameter);
        }
        if (lib_1.ts.isFunctionTypeNode(node) || lib_1.ts.isConstructorTypeNode(node)) {
            return this.handleFunctionTypeNode(node);
        }
        return this.checkChildrenForGeneric(node);
    }
    static handleTypeReferenceNode(node) {
        const typeName = node.typeName.getText();
        if (node.typeArguments) {
            for (const arg of node.typeArguments) {
                const genericName = this.isGenericUsedInType(arg);
                if (genericName) {
                    return genericName;
                }
            }
        }
        return typeName;
    }
    static handleConditionalTypeNode(node) {
        return (this.isGenericUsedInType(node.checkType) ||
            this.isGenericUsedInType(node.extendsType) ||
            this.isGenericUsedInType(node.trueType) ||
            this.isGenericUsedInType(node.falseType));
    }
    static handleIndexedAccessTypeNode(node) {
        return (this.isGenericUsedInType(node.objectType) ||
            this.isGenericUsedInType(node.indexType));
    }
    static handleFunctionTypeNode(node) {
        for (const param of node.parameters) {
            if (param.type) {
                const paramType = this.isGenericUsedInType(param.type);
                if (paramType) {
                    return paramType;
                }
            }
        }
        return this.isGenericUsedInType(node.type);
    }
    static checkChildrenForGeneric(node) {
        let firstGeneric = null;
        lib_1.ts.forEachChild(node, (child) => {
            firstGeneric = this.isGenericUsedInType(child);
            if (firstGeneric) {
                return;
            }
        });
        return firstGeneric;
    }
    static getUnusedGenerics(astRoot) {
        const typeMap = new Map();
        const unusedGenerics = [];
        // 1. 收集所有的泛型声明（包括类型别名、函数签名中的泛型等）
        this.collectGenerics(astRoot, typeMap);
        // 2. 遍历 AST 检查这些泛型是否被使用
        this.checkGenericUsages(typeMap);
        // 3. 输出未使用的泛型
        for (const [name, info] of typeMap.entries()) {
            if (!info.used) {
                const { line, character } = astRoot.getLineAndCharacterOfPosition(info.pos);
                unusedGenerics.push({
                    name: info.kind,
                    kind: info.kind,
                    line: line + 1,
                    character: character + 1,
                });
            }
        }
        return unusedGenerics;
    }
    // 递归遍历 AST
    static traverseAST(node, namespaceName) {
        // 如果节点为空，或者已经找到了命名空间使用，直接返回 true
        if (!node) {
            return false;
        }
        // 处理 PropertyAccessExpression 这种访问（MyNamespace.greet()）
        if (node.kind === lib_1.ts.SyntaxKind.PropertyAccessExpression) {
            const propertyAccess = node;
            // 检查访问的对象是否是命名空间 MyNamespace
            if (propertyAccess.expression.kind === lib_1.ts.SyntaxKind.Identifier &&
                propertyAccess.expression.text === namespaceName) {
                // 如果访问的属性（函数或变量）也匹配
                return true;
            }
        }
        // 处理 QualifiedName 这种类型引用（MyNamespace.SomeType）
        if (node.kind === lib_1.ts.SyntaxKind.QualifiedName) {
            const qualifiedName = node;
            if (qualifiedName.left.kind === lib_1.ts.SyntaxKind.Identifier &&
                qualifiedName.left.text === namespaceName) {
                return true; // 找到命名空间 MyNamespace 被引用
            }
        }
        // 递归遍历子节点
        return (lib_1.ts.forEachChild(node, (childNode) => {
            return this.traverseAST(childNode, namespaceName); // 一旦找到目标，递归会返回 true
        }) || false); // 如果没有找到任何子节点使用该命名空间，返回 false
    }
    // `isNamespaceUsed` 方法调用外部 `traverseAST`
    static isNamespaceUse(arkfile, namespaceSignature) {
        for (const clasz of arkfile.getClasses()) {
            for (const method of clasz.getMethods()) {
                if (this.isMethodUsingNamespace(method, namespaceSignature)) {
                    return true;
                }
            }
        }
        return false;
    }
    static isMethodUsingNamespace(method, namespaceSignature) {
        const stmts = method.getBody()?.getCfg()?.getStmts() ?? [];
        for (const stmt of stmts) {
            if (stmt instanceof lib_1.ArkInvokeStmt &&
                this.isInvokeUsingNamespace(stmt, namespaceSignature)) {
                return true;
            }
        }
        return false;
    }
    static isInvokeUsingNamespace(stmt, namespaceSignature) {
        const invokeExpr = stmt.getInvokeExpr();
        const methodSignature = invokeExpr.getMethodSignature();
        if (methodSignature instanceof lib_1.NamespaceSignature &&
            methodSignature === namespaceSignature) {
            return true;
        }
        const args = invokeExpr.getArgs();
        for (const arg of args) {
            if (this.isArgumentUsingNamespace(arg, namespaceSignature)) {
                return true;
            }
        }
        return false;
    }
    static isArgumentUsingNamespace(arg, namespaceSignature) {
        const varBaseArg = arg;
        if (varBaseArg && varBaseArg.declaringStmt instanceof lib_1.ArkAssignStmt) {
            const origText = varBaseArg.declaringStmt.getOriginalText() ?? '';
            if (this.isTextUsed(origText, namespaceSignature.getNamespaceName())) {
                return true;
            }
        }
        return false;
    }
    static getClassOrMethod(arkFileAllClass, arkfile) {
        let nousedSet = [];
        for (const targetClass of arkFileAllClass) {
            let methods = targetClass.getMethods();
            const methodStatic = targetClass.getMethodWithName('%statBlock0'); //获取static块
            if (methodStatic) {
                methods.push(methodStatic);
            }
            const isDefault = targetClass.getName() === '%dflt';
            const isExported = targetClass?.isExport();
            //逻辑语句中定义class 命名规则 className$作用域className.作用域函数名 要进行解析不能直接使用
            const className = targetClass.getName().split('$')[0];
            const extendedClass = targetClass.getExtendedClasses();
            const isInternal = targetClass.getName().startsWith('%');
            if (!(isExported) &&
                !isInternal &&
                extendedClass.size === 0) {
                if (methodStatic) {
                    nousedSet.push({
                        varType: VarType.Class,
                        arkClass: targetClass,
                        name: className,
                        static: true,
                    });
                }
                else {
                    nousedSet.push({
                        varType: VarType.Class,
                        arkClass: targetClass,
                        name: className,
                    });
                }
            }
        }
        return nousedSet;
    }
    static filterClass(clas, signature, exportNames) {
        const implents = clas.getImplementedInterfaceNames(); //string[]
        const className = signature.getClassName();
        if (exportNames.includes(className) ||
            implents.includes(className)) {
            return true;
        }
        //处理 new Object()情况
        const fields = clas.getFields();
        for (const item of fields) {
            let ui = item?.getType()?.getTypeString() ?? '-101p';
            const typeSign = (item?.getType() instanceof lib_1.ClassType) ? item?.getType()?.getClassSignature() : null;
            if (typeSign === signature ||
                (this.isTextUsed(ui, className) &&
                    !this.isTextUsed(ui, `$${className}`))) {
                return true;
            }
        }
        // }
        return false;
    }
    static collectImports(node, astRoot, importMap) {
        if (lib_1.ts.isImportDeclaration(node) || lib_1.ts.isImportEqualsDeclaration(node)) {
            this.processImportDeclaration(node, astRoot, importMap);
        }
        lib_1.ts.forEachChild(node, (child) => this.collectImports(child, astRoot, importMap));
    }
    static processImportDeclaration(node, astRoot, importMap) {
        if (lib_1.ts.isImportDeclaration(node)) {
            const moduleText = node.moduleSpecifier.getText(astRoot);
            const importClause = node.importClause;
            if (importClause) {
                if (importClause.name) {
                    this.processDefaultImport(importClause.name.text, moduleText, importMap);
                }
                if (importClause.namedBindings) {
                    this.processNamedBindings(importClause.namedBindings, moduleText, importMap);
                }
            }
        }
        else if (lib_1.ts.isImportEqualsDeclaration(node)) {
            const moduleText = node.moduleReference.getText();
            const importClauseName = node.name.escapedText.toString();
            this.processDefaultImport(importClauseName, moduleText, importMap);
        }
    }
    static processDefaultImport(defaultImportName, source, importMap) {
        importMap.set(defaultImportName, { used: false, source: source });
    }
    static processNamedBindings(namedBindings, source, importMap) {
        if (namedBindings && lib_1.ts.isNamedImports(namedBindings)) {
            this.processNamedImports(namedBindings, source, importMap);
        }
        else if (namedBindings && lib_1.ts.isNamespaceImport(namedBindings)) {
            this.processNamespaceImport(namedBindings, source, importMap);
        }
    }
    static processNamedImports(namedImports, source, importMap) {
        for (const element of namedImports.elements) {
            importMap.set(element.name.text, {
                used: false,
                source: source,
            });
        }
    }
    static processNamespaceImport(namespaceImport, source, importMap) {
        importMap.set(namespaceImport.name.text, {
            used: false,
            source: source,
        });
    }
    // 辅助函数：递归遍历 AST 检查标识符的使用情况
    static checkUsage(node, astRoot, importMap) {
        if (lib_1.ts.isIdentifier(node)) {
            // 排除在导入声明中的标识符
            if (node.parent &&
                (lib_1.ts.isImportSpecifier(node.parent) ||
                    lib_1.ts.isImportClause(node.parent) ||
                    lib_1.ts.isNamespaceImport(node.parent) ||
                    lib_1.ts.isImportEqualsDeclaration(node.parent))) {
                // 忽略
            }
            else {
                if (importMap.has(node.text)) {
                    const info = importMap.get(node.text);
                    info.used = true;
                    importMap.set(node.text, info);
                }
            }
        }
        lib_1.ts.forEachChild(node, (child) => this.checkUsage(child, astRoot, importMap));
    }
    // 主函数：检测未使用的导入
    static noUsedImport(astRoot) {
        const importMap = new Map();
        const noUsedImports = [];
        // 1. 收集导入信息
        this.collectImports(astRoot, astRoot, importMap);
        // 2. 检查标识符使用情况
        this.checkUsage(astRoot, astRoot, importMap);
        // 3. 输出未使用的导入
        for (const [name, info] of importMap.entries()) {
            if (!info.used) {
                noUsedImports.push(name);
            }
        }
        return noUsedImports;
    }
}
exports.NoUnusedVarsCheckUtils = NoUnusedVarsCheckUtils;
