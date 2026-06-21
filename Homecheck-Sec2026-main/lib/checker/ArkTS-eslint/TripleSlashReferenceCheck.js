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
exports.TripleSlashReferenceCheck = void 0;
const lib_1 = require("arkanalyzer/lib");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const Matchers_1 = require("../../matcher/Matchers");
const DefectsList_1 = require("../../utils/common/DefectsList");
const defaultOptions = {
    lib: 'always',
    path: 'never',
    types: 'prefer-import'
};
;
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'TripleSlashReferenceCheck');
const gmetaData = {
    severity: 2,
    ruleDocPath: 'docs/triple-slash-reference.md',
    description: 'Do not use a triple slash reference for code, use `import` style instead.'
};
class TripleSlashReferenceCheck {
    metaData = gmetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Matchers_1.MatcherTypes.FILE,
    };
    classMatcher = {
        file: [this.fileMatcher],
        matcherType: Matchers_1.MatcherTypes.CLASS
    };
    methodMatcher = {
        matcherType: Matchers_1.MatcherTypes.METHOD,
        class: [this.classMatcher]
    };
    registerMatchers() {
        const matchBuildCb = {
            matcher: this.methodMatcher,
            callback: this.check
        };
        return [matchBuildCb];
    }
    check = (method) => {
        // 将规则选项转换为Options类型
        let options;
        if (this.rule && this.rule.option.length > 0) {
            options = this.rule.option[0];
        }
        else {
            options = defaultOptions;
        }
        if (method instanceof lib_1.ArkMethod) {
            let declareClass = method.getDeclaringArkClass();
            const arkFile = declareClass.getDeclaringArkFile();
            const code = arkFile.getCode() ?? '';
            if (this.tripleSlash(code)) {
                this.optionsCheck1(options, code, arkFile);
                this.optionsCheck2(options, code, arkFile);
                this.optionsCheck3(options, code, arkFile);
            }
        }
    };
    optionsCheck1(options, code, arkFile) {
        this.optionsCheck11(options, code, arkFile);
        this.optionsCheck12(options, code, arkFile);
        this.optionsCheck13(options, code, arkFile);
        this.optionsCheck14(options, code, arkFile);
        this.optionsCheck15(options, code, arkFile);
        this.optionsCheck16(options, code, arkFile);
        this.optionsCheck17(options, code, arkFile);
    }
    optionsCheck11(options, code, arkFile) {
        if (options.lib === 'always' && options.types === 'never' && options.path === 'never') {
            this.allLibAlwaysCheck(code, arkFile);
        }
        if (options.lib === 'always' && !options.path && !options.types) {
            this.allPathNeverAndImportCheck(code, arkFile);
        }
    }
    optionsCheck12(options, code, arkFile) {
        if (!options.path && options.types === 'never' && options.lib === 'never') {
            this.AllCheck(code, arkFile);
        }
        if (!options.path && options.types === 'always' && options.lib === 'never') {
            this.allTypesAlwaysCheck(code, arkFile);
        }
    }
    optionsCheck13(options, code, arkFile) {
        if (options.lib === 'never' && options.types === 'prefer-import' && !options.path) {
            this.allTypeAlwaysAndImportCheck(code, arkFile);
        }
        if (!options.path && options.types === 'never' && options.lib === 'always') {
            this.allLibAlwaysCheck(code, arkFile);
        }
    }
    optionsCheck14(options, code, arkFile) {
        if (!options.path && options.types === 'always' && options.lib === 'always') {
            this.allPathNeverCheck(code, arkFile);
        }
        if (options.lib === 'always' && !options.path && options.types === 'prefer-import') {
            this.allPathNeverAndImportCheck(code, arkFile);
        }
    }
    optionsCheck15(options, code, arkFile) {
        if (options.path === 'always' && options.types === 'never' && options.lib === 'never') {
            this.allPathAlwaysCheck(code, arkFile);
        }
        if (options.path === 'always' && !options.types && !options.lib) {
            this.allPathNeverAndImportCheck(code, arkFile);
        }
    }
    optionsCheck16(options, code, arkFile) {
        if (options.path === 'never' && options.types === 'always' && !options.lib) {
            this.allPathNeverCheck(code, arkFile);
        }
        if (options.path === 'never' && options.types === 'never' && !options.lib) {
            this.allLibAlwaysCheck(code, arkFile);
        }
    }
    optionsCheck17(options, code, arkFile) {
        if (!options.lib && options.path === 'never' && options.types === 'prefer-import') {
            this.allPathNeverAndImportCheck(code, arkFile);
        }
        if (options.path === 'always' && options.types === 'always' && !options.lib) { }
    }
    optionsCheck2(options, code, arkFile) {
        this.optionsCheck21(options, code, arkFile);
        this.optionsCheck22(options, code, arkFile);
        this.optionsCheck23(options, code, arkFile);
        this.optionsCheck24(options, code, arkFile);
        this.optionsCheck25(options, code, arkFile);
    }
    optionsCheck21(options, code, arkFile) {
        if (options.path === 'always' && options.types === 'never' && !options.lib) {
            this.allTypesNeverCheck(code, arkFile);
        }
        if (!options.lib && options.path === 'always' && options.types === 'prefer-import') {
            this.allImportCheck(code, arkFile);
        }
    }
    optionsCheck22(options, code, arkFile) {
        if (options.path === 'never' && options.types === 'never' && options.lib === 'never') {
            this.AllCheck(code, arkFile);
        }
        if (options.path === 'always' && options.types === 'always' && options.lib === 'always') { }
    }
    optionsCheck23(options, code, arkFile) {
        if (!options.types && options.lib === 'never' && options.path === 'never') {
            this.allTypeAlwaysAndImportCheck(code, arkFile);
        }
        if (options.types === 'always' && options.lib === 'never' && options.path === 'never') {
            this.allTypesAlwaysCheck(code, arkFile);
        }
    }
    optionsCheck24(options, code, arkFile) {
        if (options.types === 'always' && !options.lib && !options.path) {
            this.allPathNeverCheck(code, arkFile);
        }
        if (options.lib === 'always' && options.path === 'always' && options.types === 'never') {
            this.allTypesNeverCheck(code, arkFile);
        }
    }
    optionsCheck25(options, code, arkFile) {
        if (options.types === 'never' && !options.lib && !options.path) {
            this.allLibAlwaysCheck(code, arkFile);
        }
        if (options.lib === 'always' && options.path === 'never' && !options.types) {
            this.allPathNeverAndImportCheck(code, arkFile);
        }
    }
    optionsCheck3(options, code, arkFile) {
        this.optionsCheck31(options, code, arkFile);
        this.optionsCheck32(options, code, arkFile);
        this.optionsCheck33(options, code, arkFile);
        this.optionsCheck34(options, code, arkFile);
        this.optionsCheck35(options, code, arkFile);
    }
    optionsCheck31(options, code, arkFile) {
        if (options.lib === 'always' && options.path === 'never' && !options.types) {
            this.allLibNeverAndImportCheck(code, arkFile);
        }
        if (options.lib === 'always' && options.types === 'always' && options.path === 'never') {
            this.allPathNeverCheck(code, arkFile);
        }
    }
    optionsCheck32(options, code, arkFile) {
        if (options.path === 'never' && !options.types && !options.lib) {
            this.allPathNeverAndImportCheck(code, arkFile);
        }
        if (options.path === 'always' && options.types === 'always' && options.lib === 'never') {
            this.allLibNeverCheck(code, arkFile);
        }
    }
    optionsCheck33(options, code, arkFile) {
        if (options.lib === 'never' && !options.types && !options.path) {
            this.allTypeAlwaysAndImportCheck(code, arkFile);
        }
        if (options.lib === 'always' && options.path === 'always' && !options.types) {
            this.allImportCheck(code, arkFile);
        }
    }
    optionsCheck34(options, code, arkFile) {
        if (options.lib === 'always' && options.path === 'always' && options.types === 'prefer-import') {
            this.allImportCheck(code, arkFile);
        }
        if (options.lib && options.lib === 'never' && options.path === 'always' && options.types === 'prefer-import') {
            this.allLibNeverAndImportCheck(code, arkFile);
        }
    }
    optionsCheck35(options, code, arkFile) {
        if (options.lib === 'always' && options.path === 'never' && options.types === 'prefer-import') {
            this.allPathNeverAndImportCheck(code, arkFile);
        }
        if (options.types === 'prefer-import' && !options.lib && !options.path) {
            this.allPathNeverAndImportCheck(code, arkFile);
        }
    }
    AllCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.AllCheck1(matched, arkFile);
            }
        }
    }
    AllCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.allCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allTypesAlwaysCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allTypesAlwaysCheck1(matched, arkFile);
            }
        }
    }
    allTypesAlwaysCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.typesAlwaysCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allPathAlwaysCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allPathAlwaysCheck1(matched, arkFile);
            }
        }
    }
    allPathAlwaysCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.pathAlwaysCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allTypesNeverCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allTypesNeverCheck1(matched, arkFile);
            }
        }
    }
    allTypesNeverCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.typesNeverCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allLibAlwaysCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allLibAlwaysCheck1(matched, arkFile);
            }
        }
    }
    allLibAlwaysCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.libAlwaysCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allPathNeverCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allPathNeverCheck1(matched, arkFile);
            }
        }
    }
    allPathNeverCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.pathNeverCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allLibNeverCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allLibNeverCheck1(matched, arkFile);
            }
        }
    }
    allLibNeverCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.libNeverCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allTypeAlwaysAndImportCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allTypeAlwaysAndImportCheck1(matched, arkFile);
            }
        }
    }
    allTypeAlwaysAndImportCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.typeAlwaysAndImportCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allImportCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allImportCheck1(matched, arkFile);
            }
        }
    }
    allImportCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (this.ImportCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allLibNeverAndImportCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allLibNeverAndImportCheck1(matched, arkFile);
            }
        }
    }
    allLibNeverAndImportCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.libNeverAndImportCheck(matched, i, arkFile)) {
                    continue;
                }
            }
        }
    }
    allPathNeverAndImportCheck(code, arkFile) {
        if (this.normalDirectives(code)) {
            const matched = code.split('\r\n');
            if (matched) {
                this.allPathNeverAndImportCheck1(matched, arkFile);
            }
        }
    }
    allPathNeverAndImportCheck1(matched, arkFile) {
        for (let i = 0; i < matched.length; i++) {
            if (this.tripleSlash(matched[i])) {
                if (!this.pathNeverAndImportCheck(matched, i, arkFile)) {
                    continue;
                }
                ;
            }
        }
    }
    ImportCheck(matched, i, arkFile) {
        const importInfos = arkFile.getImportInfos();
        if (importInfos.length > 0 && this.typesNeverDirectives(matched[i])) {
            if (!this.checkSpecial(matched, i)) {
                return true;
            }
            const match = matched[i].match(/types\s*=\s*"([^"]*)"/);
            if (match) {
                this.checkImport(match, importInfos, matched, i, arkFile);
            }
        }
        return false;
    }
    pathNeverAndImportCheck(matched, i, arkFile) {
        let hasPathIssue = false;
        let hasImportIssue = false;
        // 处理path相关检查
        hasPathIssue = this.pathNeverCheck(matched, i, arkFile);
        // 处理import相关检查
        hasImportIssue = !this.checkImportInfo(arkFile, matched, i);
        return !hasPathIssue && !hasImportIssue;
    }
    libNeverAndImportCheck(matched, i, arkFile) {
        let hasLibIssue = false;
        let hasImportIssue = false;
        // 处理lib相关检查
        hasLibIssue = this.libNeverCheck(matched, i, arkFile);
        // 处理import相关检查
        hasImportIssue = !this.checkImportInfo(arkFile, matched, i);
        return !hasLibIssue && !hasImportIssue;
    }
    typeAlwaysAndImportCheck(matched, i, arkFile) {
        let hasTypeIssue = false;
        let hasImportIssue = false;
        // 处理type相关检查
        hasTypeIssue = this.typesAlwaysCheck(matched, i, arkFile);
        // 处理import相关检查
        hasImportIssue = !this.checkImportInfo(arkFile, matched, i);
        return !hasTypeIssue && !hasImportIssue;
    }
    allCheck(matched, i, arkFile) {
        if (!this.checkSpecial(matched, i)) {
            return false;
        }
        const target = this.extractCode(matched[i]);
        if (target) {
            this.addIssueReport(arkFile, matched[i], target);
        }
        return true;
    }
    typesAlwaysCheck(matched, i, arkFile) {
        if (this.typesAlwaysDirectives(matched[i])) {
            return this.allCheck(matched, i, arkFile);
        }
        return true;
    }
    typesNeverCheck(matched, i, arkFile) {
        if (this.typesNeverDirectives(matched[i])) {
            return this.allCheck(matched, i, arkFile);
        }
        return true;
    }
    libAlwaysCheck(matched, i, arkFile) {
        if (this.libAlwaysDirectives(matched[i])) {
            return this.allCheck(matched, i, arkFile);
        }
        return true;
    }
    pathNeverCheck(matched, i, arkFile) {
        if (this.pathNeverDirectives(matched[i])) {
            return this.allCheck(matched, i, arkFile);
        }
        return true;
    }
    pathAlwaysCheck(matched, i, arkFile) {
        if (this.pathAlwaysDirectives(matched[i])) {
            return this.allCheck(matched, i, arkFile);
        }
        return true;
    }
    libNeverCheck(matched, i, arkFile) {
        if (this.libNeverDirectives(matched[i])) {
            return this.allCheck(matched, i, arkFile);
        }
        return true;
    }
    checkSpecial(matched, i) {
        if (this.DoubleSlash(matched[i])) {
            return false;
        }
        if (matched[i - 1].includes('/*') && matched[i + 1].includes('*/')) {
            return false;
        }
        return true;
    }
    checkImportInfo(arkFile, matched, i) {
        const importInfos = arkFile.getImportInfos();
        if (importInfos.length > 0 && this.typesNeverDirectives(matched[i])) {
            if (this.DoubleSlash(matched[i])) {
                return false;
            }
            const match = matched[i].match(/types\s*=\s*"([^"]*)"/);
            if (match) {
                this.checkImport(match, importInfos, matched, i, arkFile);
            }
        }
        return true;
    }
    checkImport(match, importInfos, matched, i, arkFile) {
        const name = match[1];
        for (const importInfo of importInfos) {
            const ImportInfo = importInfo;
            const importFrom = ImportInfo.importFrom;
            if (importFrom === name) {
                if (matched[i - 1].includes('/*') && matched[i + 1].includes('*/')) {
                    continue;
                }
                const target = this.extractCode(matched[i]);
                if (target) {
                    this.addIssueReport(arkFile, matched[i], target);
                }
            }
        }
    }
    extractCode(str) {
        const regex = /="([^"]+)"/;
        const match = str.match(regex);
        if (match) {
            return match[1]; // 返回捕获的第一个组，即双引号之间的内容
        }
        else {
            return null; // 如果没有匹配到，返回 null
        }
    }
    //判断给定的字符串中是否包含三个斜杠注释。
    tripleSlash(text) {
        const regex = /\/\/\//;
        return regex.test(text);
    }
    DoubleSlash(text) {
        const regex = new RegExp('\/\/.*?\/\/\/');
        return regex.test(text);
    }
    normalDirectives(text) {
        return /\s*<reference\s+(lib|path|types)="[^"]*"\s*\/>/g.test(text);
    }
    libAlwaysDirectives(text) {
        return /\s*<reference\s+(path|types)="[^"]*"\s*\/>/g.test(text);
    }
    typesAlwaysDirectives(text) {
        return /\s*<reference\s+(path|lib)="[^"]*"\s*\/>/g.test(text);
    }
    pathAlwaysDirectives(text) {
        return /\s*<reference\s+(lib|types)="[^"]*"\s*\/>/g.test(text);
    }
    pathNeverDirectives(text) {
        return /\s*<reference\s+(path)="[^"]*"\s*\/>/g.test(text);
    }
    libNeverDirectives(text) {
        return /\s*<reference\s+(lib)="[^"]*"\s*\/>/g.test(text);
    }
    typesNeverDirectives(text) {
        return /\s*<reference\s+(types)="[^"]*"\s*\/>/g.test(text);
    }
    addIssueReport(arkFile, name, target) {
        this.metaData.description = 'Do not use a triple slash reference for ' + target + ', use `import` style instead.';
        const severity = this.rule.alert ?? this.metaData.severity;
        const warnInfo = this.getLineAndColumn(arkFile, name);
        this.metaData.description = this.metaData.description;
        const filePath = arkFile.getFilePath();
        let defects = new Defects_1.Defects(warnInfo.line, warnInfo.startCol, warnInfo.endCol, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
        DefectsList_1.RuleListUtil.push(defects);
    }
    getLineAndColumn(arkfile, name) {
        if (arkfile) {
            const code = arkfile.getCode() ?? '';
            const lines = code.split('\r\n');
            let lineNumber = 1;
            for (const line of lines) {
                const lineIndex = line.indexOf(name);
                if (lineIndex !== -1) {
                    const startCol = lineIndex + 1; // 列号从1开始
                    const endCol = lineIndex + 1;
                    const originPath = arkfile.getFilePath();
                    return { line: lineNumber, startCol, endCol, filePath: originPath };
                }
                lineNumber++;
            }
        }
        else {
            logger.debug('originStmt or arkFile is null');
        }
        return { line: -1, startCol: -1, endCol: -1, filePath: '' };
    }
}
exports.TripleSlashReferenceCheck = TripleSlashReferenceCheck;
