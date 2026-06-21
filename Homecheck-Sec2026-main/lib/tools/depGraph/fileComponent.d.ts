import { DependsGraph } from 'arkanalyzer/lib/core/graph/DependsGraph';
export declare enum FileCategory {
    FILE = 0,
    PKG = 1,
    SO = 2,
    UNKNOWN = -1
}
export interface FileCategoryType {
    name: string;
    id: number;
}
export declare function getComponentCategories(): FileCategoryType[];
export interface File {
    id?: number;
    name: string;
    version?: number;
    files?: Set<string>;
    kind: FileCategory;
    tag?: string;
}
export interface ImportInfo4Dep {
    importClauseName: string;
    importType: string;
    importFrom?: string;
    nameBeforeAs?: string;
    isDefault?: boolean;
}
export interface FileEdgeAttr {
    kind: 0;
    attr: Map<string, ImportInfo4Dep>;
}
export declare class FileDepsGraph extends DependsGraph<File, FileEdgeAttr> {
    constructor();
    addImportInfo2Edge(edge: FileEdgeAttr, importInfo: ImportInfo4Dep): void;
    toJson(): {
        nodes: File[];
        edges: any[];
        categories: {};
    };
    dump(): string;
    getGraphName(): string;
}
