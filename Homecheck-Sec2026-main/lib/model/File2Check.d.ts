import { ArkFile } from 'arkanalyzer';
import { BaseChecker } from '../checker/BaseChecker';
import { IssueReport } from './Defects';
export declare class File2Check {
    arkFile: ArkFile;
    enabledRuleCheckerMap: Map<string, BaseChecker>;
    issues: IssueReport[];
    private flMatcherMap;
    private nsMatcherMap;
    private clsMatcherMap;
    private mtdMatcherMap;
    private fieldMatcherMap;
    constructor();
    addChecker(ruleId: string, checker: BaseChecker): void;
    collectMatcherCallbacks(): void;
    emitCheck(): Promise<void>;
    collectIssues(): void;
    checkDisable(): Promise<void>;
    run(): Promise<void>;
}
