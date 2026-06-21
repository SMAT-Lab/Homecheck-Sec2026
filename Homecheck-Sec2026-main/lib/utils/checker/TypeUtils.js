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
exports.isUnclearReferenceType = exports.fixAppointType = exports.isAppointType = void 0;
const arkanalyzer_1 = require("arkanalyzer");
/**
 * 检查类型是否为指定类型
 *
 * @param appointType 指定类型
 * @param type 被检查类型
 * @returns
 */
function isAppointType(appointType, type) {
    if (appointType.getTypeString() === type.getTypeString()) {
        return true;
    }
    if (type instanceof arkanalyzer_1.ArrayType) {
        return isAppointType(appointType, type.getBaseType());
    }
    if (type instanceof arkanalyzer_1.UnclearReferenceType) {
        return generic(appointType, type.getGenericTypes());
    }
    if (type instanceof arkanalyzer_1.UnionType) {
        return generic(appointType, type.getTypes());
    }
    if (type instanceof arkanalyzer_1.FunctionType) {
        return generic(appointType, type.getRealGenericTypes());
    }
    if (type instanceof arkanalyzer_1.ClassType) {
        return generic(appointType, type.getRealGenericTypes());
    }
    if (type instanceof arkanalyzer_1.TupleType) {
        return generic(appointType, type.getTypes());
    }
    if (type instanceof arkanalyzer_1.AliasType) {
        return isAppointType(appointType, type.getOriginalType());
    }
    if (type instanceof arkanalyzer_1.GenericType) {
        let defType = type.getDefaultType();
        let constraintType = type.getConstraint();
        return (defType ? isAppointType(appointType, defType) : false) ||
            (constraintType ? isAppointType(appointType, constraintType) : false);
    }
    return false;
}
exports.isAppointType = isAppointType;
function generic(appointType, type) {
    if (!type) {
        return false;
    }
    for (const t of type) {
        if (isAppointType(appointType, t)) {
            return true;
        }
    }
    return false;
}
/**
 * 递归替换类型中的指定类型
 *
 * @param appointType 指定类型
 * @param type 需要被替换的类型
 * @param newType 新的类型
 * @returns
 */
function fixAppointType(appointType, type, newType) {
    if (appointType.getTypeString() === type.getTypeString()) {
        return newType;
    }
    if (type instanceof arkanalyzer_1.ArrayType) {
        type.setBaseType(fixAppointType(appointType, type.getBaseType(), newType));
        return type;
    }
    if (type instanceof arkanalyzer_1.UnclearReferenceType) {
        return handleUnclearReferenceType(appointType, type, newType);
    }
    if (type instanceof arkanalyzer_1.UnionType) {
        return handleUnionType(appointType, type, newType);
    }
    if (type instanceof arkanalyzer_1.FunctionType) {
        return handleFunctionType(appointType, type, newType);
    }
    if (type instanceof arkanalyzer_1.ClassType) {
        return handleClassType(appointType, type, newType);
    }
    if (type instanceof arkanalyzer_1.TupleType) {
        return handleTupleType(appointType, type, newType);
    }
    if (type instanceof arkanalyzer_1.AliasType) {
        type.setOriginalType(fixAppointType(appointType, type.getOriginalType(), newType));
        return type;
    }
    if (type instanceof arkanalyzer_1.GenericType) {
        return handleGenericType(appointType, type, newType);
    }
    return type;
}
exports.fixAppointType = fixAppointType;
// 处理 UnclearReferenceType 的逻辑
function handleUnclearReferenceType(appointType, type, newType) {
    const genericTypes = type.getGenericTypes() || [];
    for (let i = 0; i < genericTypes.length; i++) {
        genericTypes[i] = fixAppointType(appointType, genericTypes[i], newType);
    }
    return new arkanalyzer_1.UnclearReferenceType(type.getName(), genericTypes);
}
// 处理 UnionType 的逻辑
function handleUnionType(appointType, type, newType) {
    const unionTypes = type.getTypes() || [];
    for (let i = 0; i < unionTypes.length; i++) {
        unionTypes[i] = fixAppointType(appointType, unionTypes[i], newType);
    }
    return new arkanalyzer_1.UnionType(unionTypes);
}
// 处理 FunctionType 的逻辑
function handleFunctionType(appointType, type, newType) {
    const realGenericTypes = type.getRealGenericTypes() || [];
    for (let i = 0; i < realGenericTypes.length; i++) {
        realGenericTypes[i] = fixAppointType(appointType, realGenericTypes[i], newType);
    }
    return new arkanalyzer_1.FunctionType(type.getMethodSignature(), realGenericTypes);
}
// 处理 ClassType 的逻辑
function handleClassType(appointType, type, newType) {
    const realGenericTypes = type.getRealGenericTypes() || [];
    for (let i = 0; i < realGenericTypes.length; i++) {
        realGenericTypes[i] = fixAppointType(appointType, realGenericTypes[i], newType);
    }
    type.setRealGenericTypes(realGenericTypes);
    return type;
}
// 处理 TupleType 的逻辑
function handleTupleType(appointType, type, newType) {
    const tupleTypes = type.getTypes() || [];
    for (let i = 0; i < tupleTypes.length; i++) {
        tupleTypes[i] = fixAppointType(appointType, tupleTypes[i], newType);
    }
    return new arkanalyzer_1.TupleType(tupleTypes);
}
// 处理 GenericType 的逻辑
function handleGenericType(appointType, type, newType) {
    let defType = type.getDefaultType();
    let constraintType = type.getConstraint();
    if (defType) {
        defType = fixAppointType(appointType, defType, newType);
    }
    if (constraintType) {
        constraintType = fixAppointType(appointType, constraintType, newType);
    }
    if (defType) {
        type.setDefaultType(defType);
    }
    if (constraintType) {
        type.setConstraint(constraintType);
    }
    return type;
}
/**
 * 检查类型中是否有不明确的引用类型
 *
 * @param type 被检查类型
 * @returns
 */
function isUnclearReferenceType(type) {
    if (type instanceof arkanalyzer_1.ArrayType) {
        return isUnclearReferenceType(type.getBaseType());
    }
    if (type instanceof arkanalyzer_1.UnclearReferenceType) {
        return true;
    }
    if (type instanceof arkanalyzer_1.UnionType) {
        return traversalType(type.getTypes());
    }
    if (type instanceof arkanalyzer_1.FunctionType) {
        return traversalType(type.getRealGenericTypes());
    }
    if (type instanceof arkanalyzer_1.ClassType) {
        return traversalType(type.getRealGenericTypes());
    }
    if (type instanceof arkanalyzer_1.TupleType) {
        return traversalType(type.getTypes());
    }
    if (type instanceof arkanalyzer_1.AliasType) {
        return isUnclearReferenceType(type.getOriginalType());
    }
    if (type instanceof arkanalyzer_1.GenericType) {
        let defType = type.getDefaultType();
        let constraintType = type.getConstraint();
        return (defType ? isUnclearReferenceType(defType) : false) ||
            (constraintType ? isUnclearReferenceType(constraintType) : false);
    }
    return false;
}
exports.isUnclearReferenceType = isUnclearReferenceType;
/**
 * 遍历类型数组
 *
 * @param types
 * @returns
 */
function traversalType(types) {
    if (!types) {
        return false;
    }
    for (const t of types) {
        if (isUnclearReferenceType(t)) {
            return true;
        }
    }
    return false;
}
