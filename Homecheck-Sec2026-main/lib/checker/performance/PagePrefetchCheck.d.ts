import { Scene } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
/**
 * Invoking pre-download in the onPageEnd of the web component can speed up the loading speed.
 */
export declare class PagePrefetchCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    registerMatchers(): MatcherCallback[];
    check: (scene: Scene) => void;
    private clazzProcess;
    /**
    * Traverse the viewtree.
    *
    * @param viewTreeRoot
    * @param clazz
    * @param scene
    */
    private traverseViewTree;
    /**
     * Find symbol in appear.
     *
     * @param stmts
     * @param scene
     * @returns boolean if finded that return true, else return false.
     */
    private findSymbolInStmts;
    /**
     * Parse the arguments which is a anonymous functions, and search the symbol in deeply.
     *
     * @param stmt Stmt
     * @param scene Scene
     * @param busyMethods the set of busy methods.
     * @returns boolean
     */
    private findSymbolInStmt;
    /**
     * Parse the arguments which is a anonymous functions, and search the symbol in deeply.
     *
     * @param invokeArgvs
     * @param scene
     * @param busyMethods
     * @returns boolean
     */
    private findSymbolInArgs;
    /**
     * Search the symbol in deeply.
     *
     * @param method Method to be checked.
     * @param scene Scene
     * @param busyMethods the set of busy methods.
     * @returns boolean
     */
    private findSymbolInMethod;
    private findSymbolInAboutToAppear;
    /**
     * Get the warn info by attributes.
     *
     * @param vals: The stmt of control.
     */
    private getWarnInfoByAttributes;
    /**
     * Get the warn info.
     *
     * @param method: The stmt of method.
     */
    private getWarnInfo;
    /**
     * When not finded targets signature Push the issueReports.
     */
    private pushIssueReport;
}
