import { ArkField, ArkFile, Stmt } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class WebResourceForImageComponentCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkClass: ArkClass) => void;
    private traverseViewTree;
    private checkImageUri;
    private checkImageInArkField;
    reportIssue(arkFile: ArkFile, stmtLike: Stmt | ArkField, uri: string): void;
}
