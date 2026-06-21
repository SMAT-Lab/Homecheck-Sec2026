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
exports.FileDepsGraph = exports.getComponentCategories = exports.FileCategory = void 0;
const DependsGraph_1 = require("arkanalyzer/lib/core/graph/DependsGraph");
const arkanalyzer_1 = require("arkanalyzer");
var FileCategory;
(function (FileCategory) {
    FileCategory[FileCategory["FILE"] = 0] = "FILE";
    FileCategory[FileCategory["PKG"] = 1] = "PKG";
    FileCategory[FileCategory["SO"] = 2] = "SO";
    FileCategory[FileCategory["UNKNOWN"] = -1] = "UNKNOWN";
})(FileCategory = exports.FileCategory || (exports.FileCategory = {}));
function getComponentCategories() {
    return Object.entries(FileCategory)
        .filter((e) => !isNaN(e[0]))
        .map((e) => ({ name: e[1], id: parseInt(e[0]) }));
}
exports.getComponentCategories = getComponentCategories;
class FileDepsGraph extends DependsGraph_1.DependsGraph {
    constructor() {
        super();
    }
    addImportInfo2Edge(edge, importInfo) {
        const attrKey = `${importInfo.importClauseName} + ${importInfo.importType}`;
        edge.attr.set(attrKey, importInfo);
    }
    toJson() {
        return {
            categories: getComponentCategories(),
            nodes: Array.from(this.getNodesIter()).map((value) => {
                let pkg = value.getNodeAttr();
                pkg.id = value.getID();
                return pkg;
            }),
            edges: Array.from(this.edgesMap.values()).map((value) => {
                return {
                    source: value.getSrcID(),
                    target: value.getDstID(),
                    attr: Array.from(value.getEdgeAttr().attr.values())
                };
            }),
        };
    }
    dump() {
        return new arkanalyzer_1.GraphPrinter(this).dump();
    }
    getGraphName() {
        return 'File Dependency Graph';
    }
}
exports.FileDepsGraph = FileDepsGraph;
