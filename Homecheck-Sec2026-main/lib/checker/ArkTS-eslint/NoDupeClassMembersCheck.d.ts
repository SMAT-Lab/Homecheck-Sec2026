import { ArkFile } from "arkanalyzer";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { MatcherCallback } from '../../Index';
import { Defects, IssueReport } from "../../model/Defects";
import { Rule } from "../../model/Rule";
export declare class NoDupeClassMembersCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkFile) => void;
    private checkDuplicateClassMembers;
    private checkClassDeclaration;
    private checkMemberName;
    private normalizeMemberName;
    private getMethodSignature;
    private getAccessorSignature;
    private addIssueReportNode;
}
