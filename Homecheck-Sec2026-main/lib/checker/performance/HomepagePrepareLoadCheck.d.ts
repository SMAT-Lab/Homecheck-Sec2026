import { Scene } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
/**
 * Pre-connection before opening the home page can improve the page loading speed.
 */
export declare class HomepagePrepareLoadCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    registerMatchers(): MatcherCallback[];
    check: (scene: Scene) => void;
    private getMainAbilityPath;
    private abilityProcess;
    private abilityClazzProcess;
    /**
     * Search the symbol in deeply.
     *
     * @param method Method to be checked.
     * @param scene Scene
     * @param busyMethods the set of busy methods.
     * @returns boolean
     */
    private findSymbolInMethod;
    /**
     * Parse the arguments which is a anonymous functions, and search the symbol in deeply.
     *
     * @param stmt Stmt
     * @param scene Scene
     * @param busyMethods the set of busy methods.
     * @returns boolean
     */
    private findSymbolInstmt;
    /**
     * Parse the arguments which is a anonymous functions, and search the symbol in deeply.
     *
     * @param invokeArgvs
     * @param scene
     * @param busyMethods
     * @returns boolean
     */
    private findSymbolInArgs;
    private getHomePageFile;
    private getFileByInvokeExpr;
    private getFile;
    private homePageProcess;
    private homePageClazzProcess;
    /**
     * Traverse the viewtree.
     *
     * @param viewTreeRoot
     * @param clazz
     * @param scene
     */
    private traverseViewTree;
    /**
     * Find symbol in web control.
     *
     * @param vals
     * @param scene
     * @returns boolean if finded that return true, else return false.
     */
    private findSymbolInWebControl;
    private findSymbolInAboutToAppear;
    /**
     * Get the warn info.
     *
     * @param method: The method of control.
     */
    private getWarnInfo;
    /**
     * When not finded targets signature Push the issueReports.
     */
    private pushIssueReport;
    /**
     * Check the IssueReport is exist.
     *
     * @returns boolean
     */
    private isExistIssueReport;
    private getJson5Files;
}
