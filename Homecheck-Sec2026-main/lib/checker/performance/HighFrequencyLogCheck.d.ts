import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkFile } from 'arkanalyzer';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class HighFrequencyLogCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    private gFinishedMethodMap;
    private curFinishedMap;
    private conditionScopeTypes;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private arkMethodProcess;
    private genIssueReports;
    private getFilePathInUsedChain;
    private getCurUsedChain;
    private findSymbolInArgs;
    private findSymbolInMethod;
    private findDeeply;
    private getClassName;
    private getRealClassName;
    private recordWarnInfo;
}
