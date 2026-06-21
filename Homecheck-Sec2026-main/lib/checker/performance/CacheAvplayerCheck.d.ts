import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback } from '../../matcher/Matchers';
import { Defects } from '../../model/Defects';
import { Rule } from '../../model/Rule';
import { IssueReport } from '../../model/Defects';
export declare class CacheAvplayerCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    private importCheck;
    private classProcess;
    private findSymbolInMethod;
    private findSymbolInvokeStmt;
    private findSymbolInArgs;
    private reportIssue;
}
