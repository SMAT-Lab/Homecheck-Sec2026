import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkFile } from 'arkanalyzer/lib/core/model/ArkFile';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class LottieAnimationDestoryCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private processArkFile;
    private getDestroyAnimCount;
    private getCountFromDestroryMethod;
    private findCallerMethodByInvoker;
    private processArkMethod;
    private findReleaseMethod;
    private getAnimName;
    private getInstanceName;
    private getInstanceBaseName;
    private reportIssue;
}
