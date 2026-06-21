import { ArkFile } from 'arkanalyzer';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Rule } from '../../model/Rule';
import { MatcherCallback } from '../../matcher/Matchers';
import { Defects } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class SymbolUsageCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private excutedFunc;
    private buildMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => never[] | undefined;
    private checkTargetInfo;
    private getTargetInfo;
    private handleSelector;
    private findTargetInFiles;
    private processClassesInNamespaces;
    private findTargetInClass;
    private getExcutedFunc;
    private arkFieldProcess;
    private genErrorIssue;
    private isExceededTheMaxNum;
    private genIssueAndWriteFile;
    private processWarnInfoList;
    private filterSign;
    private convertUsedChain;
    private getFilePathInUsedChain;
    private genNsList;
    private findClassOrNsInSuper;
    private findInterfaceInimplements;
    private findFuncInArgs;
    private getChainsLen;
    /**
     * Search the symbol api in deeply.
     *
     * @param method Method to be checked.
     * @param scene Scene
     * @param busyNode the set of busy methods.
     * @returns return all of the matched usedChain.
     */
    private findTargetInMethod;
    private findTargetInGeneric;
    private getChainsInWithLen;
    private findTargetInTypeMap;
    private isTargetWithMethodSign;
    private isTargetWithClassSign;
    private isTargetWithAliasType;
    private getLineColFromGeneric;
    private findFuncInStmt;
    private concatDeeplyResult;
    private findDeeplyClass;
    private findClassOrNsInStmt;
    private findPropertyInStmt;
    private findTypeInStmt;
    private isTargetType;
    private isPropertyInOp;
    private isTargetProperty;
    private isUselessTemp;
    private isClassOrNsInAssign;
    private isExplicitsType;
    private isTargetClassOrNs;
    private getSignInRightOP;
    private getClassType;
    private isMethodInOp;
    private isTargetMethod;
    private isTargetMethodInner;
    private findDeeplyFunc;
    private getClassName;
    private getRealClassName;
    private getLineColFromStmt;
}
