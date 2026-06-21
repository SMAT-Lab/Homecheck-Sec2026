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
exports.ALERT_LEVEL = exports.Rule = void 0;
class Rule {
    ruleId;
    alert;
    allowExpressions;
    ignoreRestArgs;
    option = [];
    constructor(ruleId, alert = ALERT_LEVEL.SUGGESTION) {
        this.ruleId = ruleId;
        this.alert = alert;
        this.allowExpressions = false;
        this.ignoreRestArgs = false;
    }
}
exports.Rule = Rule;
var ALERT_LEVEL;
(function (ALERT_LEVEL) {
    ALERT_LEVEL[ALERT_LEVEL["OFF"] = 0] = "OFF";
    ALERT_LEVEL[ALERT_LEVEL["WARN"] = 1] = "WARN";
    ALERT_LEVEL[ALERT_LEVEL["ERROR"] = 2] = "ERROR";
    ALERT_LEVEL[ALERT_LEVEL["SUGGESTION"] = 3] = "SUGGESTION";
})(ALERT_LEVEL = exports.ALERT_LEVEL || (exports.ALERT_LEVEL = {}));
