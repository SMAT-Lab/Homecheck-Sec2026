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
exports.isMatchedField = exports.isMatchedMethod = exports.isMatchedClass = exports.isMatchedNamespace = exports.isMatchedFile = exports.MatcherTypes = exports.MethodCategory = void 0;
const arkanalyzer_1 = require("arkanalyzer");
const ArkClass_1 = require("arkanalyzer/lib/core/model/ArkClass");
var MethodCategory;
(function (MethodCategory) {
    MethodCategory[MethodCategory["Accessor"] = 0] = "Accessor";
    MethodCategory[MethodCategory["ArrowFunction"] = 1] = "ArrowFunction";
    MethodCategory[MethodCategory["FunctionExpression"] = 2] = "FunctionExpression";
    MethodCategory[MethodCategory["Constructor"] = 3] = "Constructor";
})(MethodCategory = exports.MethodCategory || (exports.MethodCategory = {}));
var MatcherTypes;
(function (MatcherTypes) {
    MatcherTypes[MatcherTypes["FILE"] = 0] = "FILE";
    MatcherTypes[MatcherTypes["NAMESPACE"] = 1] = "NAMESPACE";
    MatcherTypes[MatcherTypes["CLASS"] = 2] = "CLASS";
    MatcherTypes[MatcherTypes["METHOD"] = 3] = "METHOD";
    MatcherTypes[MatcherTypes["FIELD"] = 4] = "FIELD";
    MatcherTypes[MatcherTypes["EXPR"] = 5] = "EXPR";
})(MatcherTypes = exports.MatcherTypes || (exports.MatcherTypes = {}));
function isMatchedFile(arkFile, matchers) {
    for (const fileMatcher of matchers) {
        if (fileMatcher instanceof arkanalyzer_1.ArkFile) {
            if (arkFile === fileMatcher) {
                return true;
            }
        }
        else {
            if (fileMatcher.name && arkFile.getName() !== fileMatcher.name) {
                continue;
            }
            return true;
        }
    }
    return false;
}
exports.isMatchedFile = isMatchedFile;
function isMatchedNamespace(arkNs, matchers) {
    if (!arkNs) {
        return false;
    }
    for (const nsMatcher of matchers) {
        if (nsMatcher instanceof arkanalyzer_1.ArkNamespace) {
            if (arkNs === nsMatcher) {
                return true;
            }
        }
        else {
            if (nsMatcher.file && !isMatchedFile(arkNs.getDeclaringArkFile(), nsMatcher.file) ||
                nsMatcher.namespace && !isMatchedNamespace(arkNs.getDeclaringArkNamespace(), nsMatcher.namespace) ||
                nsMatcher.name && !nsMatcher.name.includes(arkNs.getName()) ||
                nsMatcher.isExported !== undefined && nsMatcher.isExported !== arkNs.isExport()) {
                continue;
            }
            // todo: 未考虑嵌套ns场景
            return true;
        }
    }
    return false;
}
exports.isMatchedNamespace = isMatchedNamespace;
function isMatchedClass(arkClass, matchers) {
    if (!arkClass) {
        return false;
    }
    for (const classMatcher of matchers) {
        if (classMatcher instanceof ArkClass_1.ArkClass) {
            if (arkClass === classMatcher) {
                return true;
            }
        }
        else {
            if (classMatcher.file && !isMatchedFile(arkClass.getDeclaringArkFile(), classMatcher.file) ||
                classMatcher.namespace && !isMatchedNamespace(arkClass.getDeclaringArkNamespace(), classMatcher.namespace) ||
                classMatcher.name && !classMatcher.name.includes(arkClass.getName()) ||
                classMatcher.category && !classMatcher.category.includes(arkClass.getCategory()) ||
                classMatcher.isAbstract !== undefined && classMatcher.isAbstract !== arkClass.isAbstract() ||
                classMatcher.isExport !== undefined && classMatcher.isExport !== arkClass.isExport() ||
                classMatcher.hasViewTree !== undefined && classMatcher.hasViewTree !== arkClass.hasViewTree() ||
                // classMatcher.implements && !isMatchedClass(arkClass.getImplementedInterfaces(), classMatcher.implements) ||
                classMatcher.extends && !isMatchedClass(arkClass.getSuperClass(), classMatcher.extends)) {
                continue;
            }
            return true;
        }
    }
    return false;
}
exports.isMatchedClass = isMatchedClass;
function isMatchedMethod(arkMethod, matchers) {
    if (!arkMethod) {
        return false;
    }
    for (const mtdMatcher of matchers) {
        if (mtdMatcher instanceof arkanalyzer_1.ArkMethod) {
            if (mtdMatcher === arkMethod) {
                return true;
            }
        }
        else {
            if (mtdMatcher.file && !isMatchedFile(arkMethod.getDeclaringArkFile(), mtdMatcher.file) ||
                mtdMatcher.namespace && !isMatchedNamespace(arkMethod.getDeclaringArkClass().getDeclaringArkNamespace(), mtdMatcher.namespace) ||
                mtdMatcher.class && !isMatchedClass(arkMethod.getDeclaringArkClass(), mtdMatcher.class) ||
                // mtdMatcher.category && !mtdMatcher.category.includes(arkMethod.getCategory()) ||
                mtdMatcher.isAnonymous && !arkMethod.isAnonymousMethod() ||
                mtdMatcher.name && !mtdMatcher.name.includes(arkMethod.getName()) ||
                mtdMatcher.decorators && !arkMethod.getDecorators().some(d => mtdMatcher.decorators.includes(d.getKind())) ||
                mtdMatcher.isStatic !== undefined && mtdMatcher.isStatic !== arkMethod.isStatic() ||
                mtdMatcher.isExport !== undefined && mtdMatcher.isExport !== arkMethod.isExport() ||
                mtdMatcher.isPublic !== undefined && mtdMatcher.isPublic !== arkMethod.isPublic() ||
                mtdMatcher.isPrivate !== undefined && mtdMatcher.isPrivate !== arkMethod.isPrivate() ||
                mtdMatcher.isProtected !== undefined && mtdMatcher.isProtected !== arkMethod.isProtected() ||
                mtdMatcher.hasViewTree !== undefined && mtdMatcher.hasViewTree !== arkMethod.hasViewTree() ||
                mtdMatcher.isAbstract !== undefined && mtdMatcher.isAbstract !== arkMethod.isAbstract()) {
                continue;
            }
            return true;
        }
    }
    return false;
}
exports.isMatchedMethod = isMatchedMethod;
function isMatchedField(arkField, matchers) {
    if (!arkField) {
        return false;
    }
    for (const fieldMatcher of matchers) {
        if (fieldMatcher instanceof arkanalyzer_1.ArkField) {
            if (fieldMatcher === arkField) {
                return true;
            }
        }
        else {
            if (fieldMatcher.file && !isMatchedFile(arkField.getDeclaringArkClass().getDeclaringArkFile(), fieldMatcher.file) ||
                fieldMatcher.namespace && !isMatchedNamespace(arkField.getDeclaringArkClass().getDeclaringArkNamespace(), fieldMatcher.namespace) ||
                fieldMatcher.class && !isMatchedClass(arkField.getDeclaringArkClass(), fieldMatcher.class) ||
                fieldMatcher.name && !fieldMatcher.name.includes(arkField.getName()) ||
                fieldMatcher.decorators && !arkField.getDecorators().some(d => fieldMatcher.decorators.includes(d.getKind())) ||
                fieldMatcher.isStatic !== undefined && fieldMatcher.isStatic !== arkField.isStatic() ||
                fieldMatcher.isPublic !== undefined && fieldMatcher.isPublic !== arkField.isPublic() ||
                fieldMatcher.isPrivate !== undefined && fieldMatcher.isPrivate !== arkField.isPrivate() ||
                fieldMatcher.isProtected !== undefined && fieldMatcher.isProtected !== arkField.isProtected()) {
                continue;
            }
            return true;
        }
    }
    return false;
}
exports.isMatchedField = isMatchedField;
