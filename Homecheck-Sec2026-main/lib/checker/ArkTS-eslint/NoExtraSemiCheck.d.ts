import { ArkFile, ts } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from '../../matcher/Matchers';
import { Rule } from '../../model/Rule';
export declare class NoExtraSemiCheck implements BaseChecker {
    metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    static readonly allowedParentTypes: ts.SyntaxKind[];
    private methodAst;
    private arkFile;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkNoExtraSemi;
    private checkNode;
    private checkClassDeclaration;
    private checkMember;
    private createFix;
    private addIssueReport;
}
