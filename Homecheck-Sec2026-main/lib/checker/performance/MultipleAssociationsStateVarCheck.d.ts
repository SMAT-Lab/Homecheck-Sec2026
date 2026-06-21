import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkFile } from 'arkanalyzer/lib/core/model/ArkFile';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class MultipleAssociationsStateVarCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private processViewTreeClass;
    private traverseViewTree;
    private getAssociateViewCount;
    private getRealAttachViewCount;
    private isNodeRealAttach;
    private isParentIsListComponent;
    private reportIssue;
}
