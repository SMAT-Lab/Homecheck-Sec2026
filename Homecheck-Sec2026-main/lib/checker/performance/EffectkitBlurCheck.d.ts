import { ArkFile, Stmt, ViewTreeNode } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class EffectkitBlurCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetCla: ArkClass) => void;
    traverseViewTree(viewTreeRoot: ViewTreeNode, arkClass: ArkClass): void;
    reportIssue(arkFile: ArkFile, stmt: Stmt, keyword: string): void;
}
