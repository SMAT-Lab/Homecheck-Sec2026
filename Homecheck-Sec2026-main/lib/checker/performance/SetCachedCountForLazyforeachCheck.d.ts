import { ClassSignature, MethodSignature } from 'arkanalyzer/lib';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class SetCachedCountForLazyforeachCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly CREATE: string;
    readonly CACHED_COUNT: string;
    readonly LAZY_FOREACH: string;
    readonly usedComponentMap: Map<ClassSignature | MethodSignature, string>;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkClass) => void;
    private traverseViewTree;
    private traverseViewTreeByChild;
    private isLazyForeach;
    private isLazyForeachByChild;
    private getWarnInfoByVals;
    private getWarnInfo;
    private addIssueReport;
    private isExistIssueReport;
}
