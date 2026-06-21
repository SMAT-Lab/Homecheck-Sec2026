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
exports.NumberUtils = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const VarInfo_1 = require("../../model/VarInfo");
const CheckerStorage_1 = require("../common/CheckerStorage");
const NumberValue_1 = require("../../model/NumberValue");
class NumberUtils {
    static mBinopList = ['+', '-', '*', '/', '%', '<<', '>>', '&', '|', '^', '>>>'];
    static isSupportOperator(operator) {
        return this.mBinopList.includes(operator);
    }
    static isValueSupportCalculation(arkFile, valueStmtInfo, value) {
        if (value instanceof arkanalyzer_1.Constant && value.getType() instanceof arkanalyzer_1.NumberType) {
            return true;
        }
        else if (value instanceof arkanalyzer_1.Local) {
            let importInfo = NumberUtils.getValueImportInfo(arkFile, value);
            if (importInfo) {
                return NumberUtils.isImportValueSupportCalculate(arkFile, importInfo, value);
            }
            else {
                return NumberUtils.isMethodValueSupportCalculate(arkFile, valueStmtInfo, value);
            }
        }
        else if (value instanceof arkanalyzer_1.AbstractExpr && value.getType() instanceof arkanalyzer_1.NumberType) {
            return NumberUtils.isExprSupportCalculate(arkFile, valueStmtInfo, value);
        }
        else if (value instanceof arkanalyzer_1.ArkStaticFieldRef && value.getType() instanceof arkanalyzer_1.NumberType) {
            return true;
        }
        return false;
    }
    static isExprSupportCalculate(arkFile, valueStmtInfo, value) {
        if (value instanceof arkanalyzer_1.ArkNormalBinopExpr && this.isSupportOperator(value.getOperator())) {
            return NumberUtils.isValueSupportCalculation(arkFile, valueStmtInfo, value.getOp1()) &&
                NumberUtils.isValueSupportCalculation(arkFile, valueStmtInfo, value.getOp2());
        }
        else if (value instanceof arkanalyzer_1.ArkUnopExpr) {
            let op = value.getUses()[0];
            return NumberUtils.isValueSupportCalculation(arkFile, valueStmtInfo, op);
        }
        return false;
    }
    static isMethodValueSupportCalculate(arkFile, valueStmtInfo, value) {
        let scope = valueStmtInfo.scope;
        let valueStmt = valueStmtInfo.stmt;
        if (!scope || !scope.defList) {
            return false;
        }
        let hasFind = false;
        let defList = scope.defList;
        for (let defVar of defList) {
            if (defVar.getName() !== value.getName()) {
                continue;
            }
            hasFind = true;
            let nearReDefStmtInfo = new VarInfo_1.VarInfo(defVar.defStmt, scope);
            let reDefStmtInfos = defVar.redefInfo;
            for (let reDefStmtInfo of reDefStmtInfos) {
                let originalLine = valueStmt.getOriginPositionInfo().getLineNo();
                if (reDefStmtInfo.stmt.getOriginPositionInfo().getLineNo() >= originalLine) {
                    break;
                }
                nearReDefStmtInfo = reDefStmtInfo;
            }
            if (!nearReDefStmtInfo || !(nearReDefStmtInfo instanceof VarInfo_1.VarInfo)) {
                continue;
            }
            let stmt = nearReDefStmtInfo.stmt;
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let rightOp = stmt.getRightOp();
                return NumberUtils.isValueSupportCalculation(arkFile, nearReDefStmtInfo, rightOp);
            }
        }
        if (!hasFind && scope.parentScope != null) {
            let defStmtInfo = new VarInfo_1.VarInfo(valueStmt, scope.parentScope);
            return NumberUtils.isValueSupportCalculation(arkFile, defStmtInfo, value);
        }
        return false;
    }
    static isImportValueSupportCalculate(arkFile, importInfo, value) {
        let exportInfo = importInfo.getLazyExportInfo();
        let importArkFile = exportInfo?.getDeclaringArkFile();
        if (!importArkFile) {
            return false;
        }
        let scope = CheckerStorage_1.CheckerStorage.getInstance().getScope(importArkFile.getFilePath());
        if (!scope) {
            return false;
        }
        for (let varDef of scope.defList) {
            if (varDef.getName() !== value.getName()) {
                continue;
            }
            let stmt = varDef.defStmt;
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let defStmtInfo = new VarInfo_1.VarInfo(stmt, scope);
                let rightOp = stmt.getRightOp();
                return NumberUtils.isValueSupportCalculation(importArkFile, defStmtInfo, rightOp);
            }
        }
        return false;
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
    static getNumberByScope(arkFile, valueStmtInfo, value) {
        if (value instanceof arkanalyzer_1.Constant && value.getType() instanceof arkanalyzer_1.NumberType) {
            let valueStr = value.getValue();
            let numberValue = Number(valueStr);
            if (valueStr.includes('.')) {
                return new NumberValue_1.NumberValue(numberValue, NumberValue_1.ValueType.DOUBLE);
            }
            else {
                return new NumberValue_1.NumberValue(numberValue, NumberValue_1.ValueType.INT);
            }
        }
        else if (value instanceof arkanalyzer_1.Local) {
            let importInfo = this.getValueImportInfo(arkFile, value);
            if (importInfo) {
                return this.getImportNumberValue(arkFile, importInfo, value);
            }
            else {
                return this.getMethodNumberValue(arkFile, valueStmtInfo, value);
            }
        }
        else if (value instanceof arkanalyzer_1.AbstractExpr && value.getType() instanceof arkanalyzer_1.NumberType) {
            return this.getExprNumberValue(arkFile, valueStmtInfo, value);
        }
        else if (value instanceof arkanalyzer_1.ArkStaticFieldRef && value.getType() instanceof arkanalyzer_1.NumberType) {
            return this.getStaticNumberValue(arkFile, valueStmtInfo, value);
        }
        else if (value instanceof arkanalyzer_1.ArkInstanceFieldRef) {
            return this.getInstanceFieldValue(arkFile, valueStmtInfo, value);
        }
        return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
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
            return this.getNumberByScope(arkFile, valueStmtInfo, initializer.getRightOp());
        }
        return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
    }
    static getImportNumberValue(arkFile, importInfo, value) {
        let exportInfo = importInfo.getLazyExportInfo();
        let importArkFile = exportInfo?.getDeclaringArkFile();
        if (!importArkFile) {
            return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
        }
        let scope = CheckerStorage_1.CheckerStorage.getInstance().getScope(importArkFile.getFilePath());
        if (!scope) {
            return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
        }
        for (let varDef of scope.defList) {
            if (varDef.getName() !== value.getName()) {
                continue;
            }
            let stmt = varDef.defStmt;
            if (stmt instanceof arkanalyzer_1.ArkAssignStmt) {
                let defStmtInfo = new VarInfo_1.VarInfo(stmt, scope);
                let rightOp = stmt.getRightOp();
                return this.getNumberByScope(importArkFile, defStmtInfo, rightOp);
            }
        }
        return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
    }
    static getMethodNumberValue(arkFile, valueStmtInfo, value) {
        let scope = valueStmtInfo.scope;
        let valueStmt = valueStmtInfo.stmt;
        if (!scope || !scope.defList) {
            return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
        }
        let hasFind = false;
        let defList = scope.defList;
        for (let defVar of defList) {
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
                return this.getNumberByScope(arkFile, nearReDefStmtInfo, rightOp);
            }
        }
        if (!hasFind && scope.parentScope != null) {
            let defStmtInfo = new VarInfo_1.VarInfo(valueStmt, scope.parentScope);
            return this.getNumberByScope(arkFile, defStmtInfo, value);
        }
        return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
    }
    static getExprNumberValue(arkFile, stmeInfo, value) {
        if (value instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            if (this.isSupportOperator(value.getOperator())) {
                let valueOfOp1 = this.getNumberByScope(arkFile, stmeInfo, value.getOp1());
                let valueOfOp2 = this.getNumberByScope(arkFile, stmeInfo, value.getOp2());
                switch (value.getOperator()) {
                    case '+':
                        return new NumberValue_1.NumberValue(valueOfOp1.value + valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '-':
                        return new NumberValue_1.NumberValue(valueOfOp1.value - valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '*':
                        return new NumberValue_1.NumberValue(valueOfOp1.value * valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '/':
                        return new NumberValue_1.NumberValue(valueOfOp1.value / valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '%':
                        return new NumberValue_1.NumberValue(valueOfOp1.value % valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '&':
                        return new NumberValue_1.NumberValue(valueOfOp1.value & valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '|':
                        return new NumberValue_1.NumberValue(valueOfOp1.value | valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '^':
                        return new NumberValue_1.NumberValue(valueOfOp1.value ^ valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '>>':
                        return new NumberValue_1.NumberValue(valueOfOp1.value >> valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '<<':
                        return new NumberValue_1.NumberValue(valueOfOp1.value << valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                    case '>>>':
                        return new NumberValue_1.NumberValue(valueOfOp1.value >>> valueOfOp2.value, valueOfOp1.type | valueOfOp2.type);
                }
            }
        }
        else if (value instanceof arkanalyzer_1.ArkUnopExpr) {
            let op = value.getUses()[0];
            let valueOfOp = this.getNumberByScope(arkFile, stmeInfo, op);
            switch (value.getOperator()) {
                case '-':
                    return new NumberValue_1.NumberValue(-valueOfOp.value, valueOfOp.type);
                case '~':
                    return new NumberValue_1.NumberValue(~valueOfOp.value, valueOfOp.type);
            }
        }
        return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
    }
    static getStaticNumberValue(arkFile, valueStmtInfo, value) {
        let classSignature = value.getFieldSignature().getDeclaringSignature();
        if (!(classSignature instanceof arkanalyzer_1.ClassSignature)) {
            return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
        }
        let fileSignature = classSignature.getDeclaringFileSignature();
        let staticClassArkFile = arkFile.getScene().getFile(fileSignature);
        if (staticClassArkFile) {
            let staticClass = staticClassArkFile.getClass(classSignature);
            if (!staticClass) {
                return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
            }
            let staticField = staticClass.getStaticFieldWithName(value.getFieldName());
            if (!staticField) {
                return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
            }
            let stmts = staticField.getInitializer();
            if (stmts.length === 0) {
                return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
            }
            let stmt = stmts[0];
            new VarInfo_1.VarInfo(stmt, stmt.scope);
            if (!(stmt instanceof arkanalyzer_1.ArkAssignStmt)) {
                return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
            }
            let initValue = stmt.getRightOp();
            return this.getNumberByScope(arkFile, valueStmtInfo, initValue);
        }
        return new NumberValue_1.NumberValue(0, NumberValue_1.ValueType.UNKNOWN);
    }
    static getOriginalValueText(stmt, value) {
        let valStr = '';
        if (value instanceof arkanalyzer_1.Constant) {
            valStr = value.toString();
        }
        else if (value instanceof arkanalyzer_1.Local) {
            if (!value.toString().includes('%')) {
                valStr = value.toString();
            }
            else {
                let declaringStmt = value.getDeclaringStmt();
                if (declaringStmt instanceof arkanalyzer_1.ArkAssignStmt) {
                    return this.getOriginalValueText(stmt, declaringStmt.getRightOp());
                }
            }
        }
        else if (value instanceof arkanalyzer_1.ArkNormalBinopExpr) {
            if (!value.toString().includes('%')) {
                valStr = value.toString();
            }
            else {
                let originalPosition = stmt.getOperandOriginalPosition(value);
                if (!originalPosition) {
                    return this.getOriginalValueText(stmt, value.getOp1()) + ' ' + value.getOperator() + ' ' +
                        this.getOriginalValueText(stmt, value.getOp2());
                }
                const text = stmt.getOriginalText();
                if (!text || text.length === 0) {
                    return this.getOriginalValueText(stmt, value.getOp1()) + ' ' + value.getOperator() + ' ' +
                        this.getOriginalValueText(stmt, value.getOp2());
                }
                let startColum = stmt.getOriginPositionInfo().getColNo();
                return text.substring(originalPosition.getFirstCol() - startColum, originalPosition.getLastCol() - startColum);
            }
        }
        else if (value instanceof arkanalyzer_1.ArkUnopExpr) {
            if (!value.toString().includes('%')) {
                valStr = value.toString();
            }
            else {
                valStr = value.getOperator() + this.getOriginalValueText(stmt, value.getUses()[0]);
            }
        }
        else if (value instanceof arkanalyzer_1.ArkStaticFieldRef) {
            let fieldSignature = value.getFieldSignature();
            let declaringSignature = fieldSignature.getDeclaringSignature();
            if (declaringSignature instanceof arkanalyzer_1.ClassSignature) {
                valStr = declaringSignature.getClassName() + '.' + fieldSignature.getFieldName();
            }
        }
        return valStr;
    }
}
exports.NumberUtils = NumberUtils;
