import { ArkFile } from 'arkanalyzer';
import { BaseChecker } from '../checker/BaseChecker';
import { IssueReport } from './Defects';
import { Rule } from './Rule';
export declare class Project2Check {
    arkFiles: ArkFile[];
    enabledRuleCheckerMap: Map<string, BaseChecker>;
    issues: IssueReport[];
    ruleMap: Map<string, Rule[]>;
    private sceneCallBacks;
    private flMatcherMap;
    private nsMatcherMap;
    private clsMatcherMap;
    private mtdMatcherMap;
    private fieldMatcherMap;
    constructor();
    addChecker(ruleId: string, checker: BaseChecker): void;
    collectMatcherCallbacks(): void;
    emitCheck(): Promise<void>;
    private processSceneCallbacks;
    collectIssues(): void;
    checkDisable(): Promise<void>;
    run(): Promise<void>;
}
