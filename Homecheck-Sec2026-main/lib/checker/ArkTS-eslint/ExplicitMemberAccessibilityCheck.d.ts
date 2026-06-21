import { ts, ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback } from '../../matcher/Matchers';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
type AccessibilityLevel = 'explicit' | 'no-public' | 'off';
type Options = {
    accessibility?: AccessibilityLevel;
    ignoredMethodNames?: string[];
    overrides?: {
        accessors?: AccessibilityLevel;
        constructors?: AccessibilityLevel;
        methods?: AccessibilityLevel;
        properties?: AccessibilityLevel;
        parameterProperties?: AccessibilityLevel;
    };
};
export declare class ExplicitMemberAccessibilityCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private issueMap;
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    loopNode(targetFilePath: string, sourceFile: ts.SourceFile, aNode: ts.Node, mergedOptions: Options, alloct?: string[]): string[];
    private addIssueReport;
    private checkParameterPropertyAccessibilityModifier;
    private checkMethodAccessibilityModifier;
    private getAccessibilityCheckAndMessage;
    private checkPropertyAccessibilityModifier;
    private getNameFromMember1;
    private ruleFix;
    private reportSortedIssues;
    private execFix;
}
export {};
