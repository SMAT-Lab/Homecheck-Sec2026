import { ts, ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { MatcherCallback } from '../../matcher/Matchers';
import { Defects, IssueReport } from '../../model/Defects';
import { Rule } from '../../model/Rule';
export declare class NoUnusedVarsCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly SHORT_STR: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetFile: ArkFile) => void;
    private beforeFilternoUsedSet;
    private processDefaultMethod;
    private isVariableDeclaration;
    private pushAllVar;
    private extractGlobalVarsFromComment;
    private pushAllGlobal;
    private mergedOptions;
    private mergeArgs;
    private mergeCaughtErrors;
    private mergeDestructuredArray;
    private mergeBooleanFlags;
    private mergeVars;
    private getNoUsedVars;
    private processMethod;
    private getMethodOffset;
    private processBody;
    private filterInvokeMethodOrClass;
    private isUsedMethod;
    private isUsedClass;
    private commentGlobalVars;
    private extractObjectArrayBindingPatternNames;
    private extractObjectArrayPatterns;
    private execLocalandGlobal;
    private isRealGlobal;
    private getArrayBindingPatternParameters;
    private getObjectBindingPatternParameters;
    private processArrayBindingPatternVars;
    private processObjectBindingPatternVars;
    private processRegularVars;
    private addallVarByEndIndex;
    private computeVariablePosition;
    private processOtherVarsity;
    private processLocalVar;
    private execDeclareStmt;
    private execDeclareStmtIndex;
    private removeInitArgsVars;
    private getPosionParamsIndex;
    /**
     * 处理未使用变量的逻辑
     */
    private handleUnusedVariable;
    private isSpecialCase;
    private isDestructuredArrayCase;
    private isCaughtVariableCase;
    private handleDefaultCase;
    private getDestructuredArrayVars;
    private addNoUseVar;
    /**
     * 处理已使用但符合 `reportUsedIgnorePattern` 规则的变量
     */
    private handleUsedIgnorePattern;
    /**
     * 处理 `ArrayBindingPattern` 相关逻辑
     */
    private handleArrayPattern;
    private isVarUsed;
    private execUsedStmts;
    private execUsedGlobals;
    private foreachStmts;
    private isFieldNameMatched;
    private execMethodStmt;
    private isClassAssigned;
    private checkLeftOpUsage;
    private isRightClassAssigned;
    private isMethodInvoked;
    private callFunctionDecParams;
    private isOherDeclareStmt;
    private isMyselfDec;
    private isMyselfMaxDec;
    private filterUnuseds;
    private addDescription;
    private addIssueReport;
    private setWarnInfoForVarTypePosion;
    private createDefect;
    private getLineAndColumn;
    private getLineAndColumn_line;
    private getLineAndColumn_OrigText;
    private getLineAndColumn_startLine;
    private loopNode;
    private execLoopParams;
    private exceLoopParamsStatement;
    private exceLoopParams_next;
    private exceLoopParams_nextnode;
    hasStaticBlock(sourceFile: ts.SourceFile): boolean;
    loopStatic(sourceFile: ts.SourceFile, aNode: ts.Node): boolean;
    private collectUnusednameSpaces;
    private collectUnusedClasses;
    private isUsedClassFilter;
}
