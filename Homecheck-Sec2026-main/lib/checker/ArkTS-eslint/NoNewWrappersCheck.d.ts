import { ArkField, ArkFile, ArkMethod } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
interface CommentMatch {
    fullMatch: string;
    globalConfigs: Map<string, string>;
}
export declare class NoNewWrappersCheck implements BaseChecker {
    readonly globalConfigRegex: RegExp;
    readonly metaData: BaseMetaData;
    readonly WRAPPERS_STR: string;
    readonly CREAER_STR: string;
    readonly CREAERNUM_STR: string;
    readonly CREAERBOOL_STR: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private currentFilePath;
    arkFile: ArkFile;
    comments: CommentMatch[];
    private fieldMatcher;
    private fileMatcher;
    private clsMatcher;
    private methodMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkMethod | ArkField) => void;
    private updateFileContext;
    private processStatements;
    private containsWrapperConstructor;
    private checkBlockStmts;
    private isGlobalConstructor;
    private checkDeclared;
    private checkImported;
    private checkGlobalConfig;
    private getAllComments;
    private addIssueReport;
    private getLineAndColumn;
    private getWrapperPosition;
}
export {};
