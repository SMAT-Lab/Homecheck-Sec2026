import { OptionValues } from 'commander';
export declare function runTool(tool: Tools, argvObj: OptionValues): void;
export declare enum Tools {
    ImportChains = 0,
    DepGraph = 1
}
