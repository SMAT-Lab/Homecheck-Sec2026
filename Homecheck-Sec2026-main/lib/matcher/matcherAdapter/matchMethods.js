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
exports.matchMethods = void 0;
const Matchers_1 = require("../Matchers");
function matchMethods(arkFiles, matcher, callback) {
    for (let arkFile of arkFiles) {
        if (matcher.file && !(0, Matchers_1.isMatchedFile)(arkFile, matcher.file)) {
            continue;
        }
        for (const ns of arkFile.getAllNamespacesUnderThisFile()) {
            if (matcher.namespace && !(0, Matchers_1.isMatchedNamespace)(ns, matcher.namespace)) {
                continue;
            }
            matchMethodsInClasses(matcher, ns.getClasses(), callback);
        }
        matchMethodsInClasses(matcher, arkFile.getClasses(), callback);
    }
}
exports.matchMethods = matchMethods;
function matchMethodsInClasses(matcher, classes, callback) {
    for (const arkClass of classes) {
        if (matcher.class && !(0, Matchers_1.isMatchedClass)(arkClass, matcher.class)) {
            continue;
        }
        for (const arkMethod of arkClass.getMethods()) {
            if ((0, Matchers_1.isMatchedMethod)(arkMethod, [matcher])) {
                callback(arkMethod);
            }
        }
    }
}
