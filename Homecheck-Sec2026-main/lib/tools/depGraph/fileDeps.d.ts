import type { ArkFile } from 'arkanalyzer';
import type { DependsNode } from 'arkanalyzer/lib/core/graph/DependsGraph';
import type { File, FileDepsGraph } from './fileComponent';
export declare class ArkFileDeps {
    private static instance;
    private constructor();
    static getInstance(): ArkFileDeps;
    addDeps(depsGraph: FileDepsGraph, node: DependsNode<File>, arkFile: ArkFile): void;
    private processImportInfo;
    private genNodeByImportInfo;
    private simplifyImportInfo;
}
