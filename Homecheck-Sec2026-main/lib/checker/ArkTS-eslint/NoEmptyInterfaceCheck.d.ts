import { ArkFile } from "arkanalyzer/lib";
import { BaseChecker, BaseMetaData } from "../BaseChecker";
import { Defects, IssueReport } from '../../model/Defects';
import { MatcherCallback } from "../../matcher/Matchers";
import { Rule } from "../../model/Rule";
export declare class NoEmptyInterfaceCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    private classMatcher;
    private methodMatcher;
    registerMatchers(): MatcherCallback[];
    private issueMap;
    check: (arkFile: ArkFile) => void;
    private checkInterfacesInFile;
    private handleEmptyInterface;
    private handleEmptyInterfaceWithoutHeritage;
    private handleEmptyInterfaceWithHeritage;
    private generateFixText;
    private isEmptyInterface;
    private findInterfaceNodeByName;
    private ruleFix;
    private reportSortedIssues;
    private addIssueReport;
    private getLineAndColumn;
}
