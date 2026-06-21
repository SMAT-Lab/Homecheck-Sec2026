import type { DependsNode } from 'arkanalyzer/lib/core/graph/DependsGraph';
import { Module, ModuleDepsGraph } from './moduleComponent';
export declare class ModuleDeps {
    private static instance;
    private constructor();
    static getInstance(): ModuleDeps;
    addDeps(depsGraph: ModuleDepsGraph, src: DependsNode<Module>): void;
    private getDstDeps;
    private genDstNode;
    private handleLocal;
}
