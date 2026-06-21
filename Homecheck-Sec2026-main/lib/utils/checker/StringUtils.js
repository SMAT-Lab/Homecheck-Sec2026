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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringUtils = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
const VarInfo_1 = require("../../model/VarInfo");
const CheckerStorage_1 = require("../common/CheckerStorage");
class StringUtils {
    static getStringByScope(arkFile, valueStmtInfo, value) {
        if (value instanceof arkanalyzer_1.Constant) {
            return value.getValue();
        }
        else if (value instanceof arkanalyzer_1.Local) {
            if (!value.toString().includes('%')) {
                let importInfo = this.getValueImportInfo(arkFile, value);
                if (importInfo) {
                    return this.getImportStringValue(importInfo, value);
                }
                else {
                    return this.getMethodStringValue(arkFile, valueStmtInfo, value);
                }
            }
            else {
                let declaringStmt = value.getDeclaringStmt();
                if (!declaringStmt) {
                    return '';
                }
                let tmpStmt = declaringStmt;
                if (!(declaringStmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                    return '';
                }
                let rightOp = declaringStmt.getRightOp();
                valueStmtInfo.stmt = declaringStmt;
                valueStmtInfo.scope = tmpStmt.scope;
                return this.getStringByScope(arkFile, valueStmtInfo, rightOp);
            }
        }
        else if (value instanceof arkanalyzer_1.AbstractExpr && value.getType() instanceof arkanalyzer_1.StringType) {
            return this.getExprStringValue(arkFile, valueStmtInfo, value);
        }
        else if (value instanceof arkanalyzer_1.ArkStaticFieldRef && value.getType() instanceof arkanalyzer_1.StringType) {
            return this.getStaticStringValue(arkFile, value);
        }
        else if (value instanceof arkanalyzer_1.ArkStaticFieldRef && value.getType() instanceof arkanalyzer_1.ClassType) {
            return this.getStaticStringValue(arkFile, value);
        }
        else if (value instanceof arkanalyzer_1.ArkStaticFieldRef && value.getType() instanceof arkanalyzer_1.EnumValueType) {
            return this.getStaticStringValue(arkFile, value);
        }
        else if (value instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            return this.getInstanceFieldValue(arkFile, valueStmtInfo, value);
        }
        return '';
    }
    static getInstanceFieldValue(arkFile, valueStmtInfo, value) {
        let fieldSignature = value.getFieldSignature();
        for (let clazz of arkFile.getClasses()) {
            let field = clazz.getField(fieldSignature);
            if (!field) {
                continue;
            }
            let initializer = field.getInitializer()[0];
            if (!initializer) {
                continue;
            }
            if (!(initializer instanceof arkanalyzer_1.ArkAssignStmt)) {
                continue;
            }
            return this.getStringByScope(arkFile, valueStmtInfo, initializer.getRightOp());
        }
        return '';
    }
    static getValueImportInfo(arkFile, value) {
        let importInfos = arkFile.getImportInfos();
        for (let importInfo of importInfos) {
            if (importInfo.getImportClauseName() === value.getName()) {
                return importInfo;
            }
        }
        return undefined;
    }
    static getImportStringValue(importInfo, value) {
        let exportInfo = importInfo.getLazyExportInfo();
        let importArkFile = exportInfo?.getDeclaringArkFile();
        if (!importArkFile) {
            return '';
        }
        let scope = CheckerStorage_1.CheckerStorage.getInstance().getScope(importArkFile.getFilePath());
        if (!scope) {
            return '';
        }
        for (let varDef of scope.defList) {
            if (varDef.getName() !== value.getName()) {
                continue;
            }
            let stmt = varDef.defStmt;
            const text = stmt.getOriginalText();
            if (!text || text.length === 0) {
                continue;
            }
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let defStmtInfo = new VarInfo_1.VarInfo(stmt, scope);
                let rightOp = stmt.getRightOp();
                return this.getStringByScope(importArkFile, defStmtInfo, rightOp);
            }
        }
        return '';
    }
    static getMethodStringValue(arkFile, valueStmtInfo, value) {
        let scope = valueStmtInfo.scope;
        let valueStmt = valueStmtInfo.stmt;
        let hasFind = false;
        if (!scope || !scope.defList) {
            return '';
        }
        let defLists = scope.defList;
        for (let defVar of defLists) {
            if (defVar.getName() !== value.getName()) {
                continue;
            }
            hasFind = true;
            let nearReDefStmtInfo = new VarInfo_1.VarInfo(defVar.defStmt, scope);
            let reDefStmtInfos = defVar.redefInfo;
            for (let reDefStmtInfo of reDefStmtInfos) {
                let originalLine = valueStmt.getOriginPositionInfo().getLineNo();
                let redefLine = reDefStmtInfo.stmt.getOriginPositionInfo().getLineNo();
                if (redefLine >= originalLine) {
                    break;
                }
                nearReDefStmtInfo = reDefStmtInfo;
            }
            let stmt = nearReDefStmtInfo.stmt;
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let rightOp = stmt.getRightOp();
                return this.getStringByScope(arkFile, nearReDefStmtInfo, rightOp);
            }
        }
        if (!hasFind && scope.parentScope !== null) {
            let defStmtInfo = new VarInfo_1.VarInfo(valueStmt, scope.parentScope);
            return this.getStringByScope(arkFile, defStmtInfo, value);
        }
        return '';
    }
    static getExprStringValue(arkFile, stmtInfo, value) {
        if (value instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            let stringOfOp1 = this.getStringByScope(arkFile, stmtInfo, value.getOp1());
            let stringOfOp2 = this.getStringByScope(arkFile, stmtInfo, value.getOp2());
            switch (value.getOperator()) {
                case '+':
                    return stringOfOp1 + stringOfOp2;
            }
        }
        return '';
    }
    static getStaticStringValue(arkFile, value) {
        let classSignature = value.getFieldSignature().getDeclaringSignature();
        if (!(classSignature instanceof arkanalyzer_1.ClassSignature)) {
            return '';
        }
        let fieldSignature = classSignature.getDeclaringFileSignature();
        let staticClassArkFile = arkFile.getScene().getFile(fieldSignature);
        if (!staticClassArkFile) {
            return '';
        }
        let staticClass = staticClassArkFile.getClass(classSignature);
        if (!staticClass) {
            return '';
        }
        let staticField = staticClass.getStaticFieldWithName(value.getFieldName());
        if (!staticField) {
            return '';
        }
        if (staticClass.getCategory() === ArkClass_1.ClassCategory.CLASS && !staticField.isReadonly()) {
            return '';
        }
        let stmts = staticField.getInitializer();
        if (stmts.length === 0) {
            return '';
        }
        let stmt = stmts[0];
        let varInfo = new VarInfo_1.VarInfo(stmt, stmt.scope);
        if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
            return '';
        }
        let initValue = stmt.getRightOp();
        return this.getStringByScope(staticClassArkFile, varInfo, initValue);
    }
}
exports.StringUtils = StringUtils;
