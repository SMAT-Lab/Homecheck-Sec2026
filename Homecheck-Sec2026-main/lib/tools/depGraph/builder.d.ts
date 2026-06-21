import { ArkFile, Scene } from 'arkanalyzer';
import { FileDepsGraph } from './fileComponent';
import { ModuleDepsGraph } from './moduleComponent';
export declare function buildFileDepGraph(arkFiles: ArkFile[]): FileDepsGraph;
export declare function buildModuleDepGraph(scene: Scene): ModuleDepsGraph;
