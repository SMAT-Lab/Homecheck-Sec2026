"use strict";
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
exports.StreamUsageApiCheck = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const Index_1 = require("../../Index");
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const Defects_1 = require("../../model/Defects");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'StreamUsageApiCheck');
const SIGNATURESTR = '@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioRendererInfo';
const SIGNATURESTR2 = '@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.AudioRendererInfo.usage';
const SIGNATURESTR3 = '@ohosSdk/api/@ohos.multimedia.audio.d.ts: audio.StreamUsage.[static]STREAM_USAGE_UNKNOWN';
const keyword = 'usage';
const gMetaData = {
    severity: 3,
    ruleDocPath: 'docs/stream-usage-api-check.md',
    description: 'When creating an AudioRenderer instance, the correct usage type should be set.'
};
class StreamUsageApiCheck {
    metaData = gMetaData;
    rule;
    defects = [];
    issues = [];
    fileMatcher = {
        matcherType: Index_1.MatcherTypes.FILE,
    };
    clsMatcher = {
        matcherType: Index_1.MatcherTypes.CLASS,
    };
    mtdMatcher = {
        matcherType: Index_1.MatcherTypes.METHOD,
    };
    registerMatchers() {
        const matchFileCb = {
            matcher: this.fileMatcher,
            callback: this.fileCheck
        };
        const matchClazzCb = {
            matcher: this.clsMatcher,
            callback: this.clsCheck
        };
        const matchMethodCb = {
            matcher: this.mtdMatcher,
            callback: this.check
        };
        return [matchFileCb, matchClazzCb, matchMethodCb];
    }
    fileCheck = (arkFile) => {
        // 全局变量
        let defaultClass = arkFile.getDefaultClass();
        let method = defaultClass.getMethods()[0];
        let stmt = this.traversalLocals(method);
        if (stmt) {
            this.reportIssue(stmt);
        }
    };
    clsCheck = (clazz) => {
        // 成员变量
        let stmt = this.processClazz(clazz.getFields());
        if (stmt) {
            this.reportIssue(stmt);
        }
    };
    check = (target) => {
        // 局部变量
        let stmt = this.traversalLocals(target);
        if (stmt) {
            this.reportIssue(stmt);
        }
    };
    processClazz(fields) {
        let stmt = null;
        for (let field of fields) {
            const type = field.getSignature().getType();
            if (!(type instanceof arkanalyzer_1.ClassType)) {
                continue;
            }
            const fieldSignatureStr = type.getClassSignature().toString();
            if (fieldSignatureStr !== SIGNATURESTR) {
                continue;
            }
            const initializers = field?.getInitializer() ?? [];
            const initializer = initializers[initializers.length - 1];
            const method = initializer.getCfg().getDeclaringMethod();
            let fieldInfos = this.processDeclaringStmt(method, initializer);
            if (fieldInfos === undefined) {
                continue;
            }
            let usageStmt = this.processUsage(fieldInfos);
            if (usageStmt) {
                stmt = usageStmt;
                return stmt;
            }
        }
        return stmt;
    }
    traversalLocals(method) {
        let stmt = null;
        let locals = method.getBody()?.getLocals();
        if (!locals) {
            return stmt;
        }
        for (let [key, value] of locals) {
            let type = value.getType();
            if (!(type instanceof arkanalyzer_1.ClassType)) {
                continue;
            }
            const classSignatureStr = type.getClassSignature().toString();
            if (classSignatureStr !== SIGNATURESTR) {
                continue;
            }
            let declaringStmt = value.getDeclaringStmt();
            if (declaringStmt === null) {
                continue;
            }
            let fieldInfos = this.processDeclaringStmt(method, declaringStmt);
            if (fieldInfos === undefined) {
                continue;
            }
            let usageStmt = this.processUsage(fieldInfos);
            if (usageStmt) {
                stmt = usageStmt;
                return stmt;
            }
        }
        return stmt;
    }
    processDeclaringStmt(method, stmt) {
        let fieldInfos = undefined;
        if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            return fieldInfos;
        }
        let rightOp = stmt.getRightOp();
        if (!(rightOp instanceof arkanalyzer_1.Local)) {
            return fieldInfos;
        }
        let type = rightOp.getType();
        if (!(type instanceof arkanalyzer_1.ClassType)) {
            return fieldInfos;
        }
        let arkClass = method.getDeclaringArkFile().getScene().getClass(type.getClassSignature());
        fieldInfos = arkClass?.getFields();
        return fieldInfos;
    }
    processUsage(fieldInfos) {
        let stmt = null;
        for (let fieldInfo of fieldInfos) {
            const fieldSignatureStr = fieldInfo.getSignature().toString();
            if (fieldSignatureStr !== SIGNATURESTR2) {
                continue;
            }
            const initializers = fieldInfo.getInitializer();
            const initializer = initializers[initializers.length - 1];
            if (!(initializer instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            const rightOp = initializer.getRightOp();
            if (!(rightOp instanceof arkanalyzer_1.Local)) {
                continue;
            }
            const declaringStmt = rightOp.getDeclaringStmt();
            if (!(declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            const rightOp2 = declaringStmt.getRightOp();
            if (!(rightOp2 instanceof arkanalyzer_1.ArkStaticFieldRef)) {
                continue;
            }
            const fieldSignatureStr2 = rightOp2.getFieldSignature().toString();
            if (fieldSignatureStr2 === SIGNATURESTR3) {
                stmt = declaringStmt;
                return stmt;
            }
        }
        return stmt;
    }
    reportIssue(stmt) {
        const arkFile = stmt.getCfg().getDeclaringMethod().getDeclaringArkFile();
        const text = stmt.getOriginalText();
        if (!text || text.length === 0) {
            logger.debug('Stmt text is empty.');
            return;
        }
        let index = text.indexOf(keyword);
        if (index === -1) {
            return;
        }
        const severity = this.rule.alert ?? this.metaData.severity;
        let originalPosition = stmt.getOriginPositionInfo();
        let lineNum = originalPosition.getLineNo();
        let startColum = originalPosition.getColNo() + index;
        let endColum = startColum + keyword.length - 1;
        let filePath = arkFile.getFilePath();
        let defects = new Index_1.Defects(lineNum, startColum, endColum, this.metaData.description, severity, this.rule.ruleId, filePath, this.metaData.ruleDocPath, true, false, false);
        this.issues.push(new Defects_1.IssueReport(defects, undefined));
    }
}
exports.StreamUsageApiCheck = StreamUsageApiCheck;
