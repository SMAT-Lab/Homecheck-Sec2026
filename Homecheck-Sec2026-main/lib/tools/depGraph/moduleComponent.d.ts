import { DependsGraph } from 'arkanalyzer/lib/core/graph/DependsGraph';
export declare enum ModuleCategory {
    ENTRY = 0,
    FEATURE = 1,
    HAR = 2,
    HSP = 3,
    THIRD_PARTY_PACKAGE = 4,
    TAGGED_PACKAGE = 5,
    UNKNOWN = -1
}
export interface ModuleCategoryType {
    name: string;
    id: number;
}
export declare function getComponentCategories(): ModuleCategoryType[];
export interface Module {
    id?: number;
    name: string;
    version?: number;
    files?: Set<string>;
    kind: ModuleCategory;
    tag?: string;
    originPath?: string;
}
export interface ModuleEdgeAttr {
    kind: 0;
}
export declare class ModuleDepsGraph extends DependsGraph<Module, ModuleEdgeAttr> {
    constructor();
    toJson(): {
        nodes: Module[];
        edges: any[];
        categories: {};
    };
    dump(): string;
    getGraphName(): string;
}
