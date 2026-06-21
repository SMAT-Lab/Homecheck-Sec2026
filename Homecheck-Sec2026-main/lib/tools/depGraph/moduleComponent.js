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
exports.ModuleDepsGraph = exports.getComponentCategories = exports.ModuleCategory = void 0;
const DependsGraph_1 = require("arkanalyzer/lib/core/graph/DependsGraph");
const arkanalyzer_1 = require("arkanalyzer");
var ModuleCategory;
(function (ModuleCategory) {
    ModuleCategory[ModuleCategory["ENTRY"] = 0] = "ENTRY";
    ModuleCategory[ModuleCategory["FEATURE"] = 1] = "FEATURE";
    ModuleCategory[ModuleCategory["HAR"] = 2] = "HAR";
    ModuleCategory[ModuleCategory["HSP"] = 3] = "HSP";
    ModuleCategory[ModuleCategory["THIRD_PARTY_PACKAGE"] = 4] = "THIRD_PARTY_PACKAGE";
    ModuleCategory[ModuleCategory["TAGGED_PACKAGE"] = 5] = "TAGGED_PACKAGE";
    ModuleCategory[ModuleCategory["UNKNOWN"] = -1] = "UNKNOWN";
})(ModuleCategory = exports.ModuleCategory || (exports.ModuleCategory = {}));
function getComponentCategories() {
    return Object.entries(ModuleCategory)
        .filter((e) => !isNaN(e[0]))
        .map((e) => ({ name: e[1], id: parseInt(e[0]) }));
}
exports.getComponentCategories = getComponentCategories;
class ModuleDepsGraph extends DependsGraph_1.DependsGraph {
    constructor() {
        super();
    }
    toJson() {
        return {
            categories: getComponentCategories(),
            nodes: Array.from(this.getNodesIter()).map((value) => {
                let module = value.getNodeAttr();
                module.id = value.getID();
                return module;
            }),
            edges: Array.from(this.edgesMap.values()).map((value) => {
                return {
                    source: value.getSrcID(),
                    target: value.getDstID()
                };
            }),
        };
    }
    dump() {
        return new arkanalyzer_1.GraphPrinter(this).dump();
    }
    getGraphName() {
        return 'Module Dependency Graph';
    }
}
exports.ModuleDepsGraph = ModuleDepsGraph;
