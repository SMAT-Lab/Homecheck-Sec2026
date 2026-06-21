import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class JsCodeCacheByPrecompileCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private viewTreeTool;
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkClass: ArkClass) => void;
    private traverseViewTree;
    private webOperation;
    private findSymbolInAboutToAppear;
    private setReportIssue;
    private isHasJSInValue;
    private findSymbolInMethod;
    private findSymbolInInvokeStmt;
    private findSymbolInArgs;
    private reportIssue;
}
