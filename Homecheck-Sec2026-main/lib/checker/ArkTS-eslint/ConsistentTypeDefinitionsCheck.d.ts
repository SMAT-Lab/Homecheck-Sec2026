import { ArkFile, ts } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects } from '../../Index';
import { MatcherCallback } from '../../Index';
import { Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ConsistentTypeDefinitionsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private issueMap;
    private enforceInterfaceMessage;
    private enforceTypeMessage;
    private enforceInterface;
    private enforceType;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    loopNode(targetFile: ArkFile, sourceFile: ts.SourceFileLike, aNode: ts.Node): void;
    private checkType;
    private checkTypeFix;
    private getTypeNode;
    private checkInterface;
    private checkInterfaceFix;
    private isInDeclareGlobal;
    private addIssueReport;
    private reportSortedIssues;
}
