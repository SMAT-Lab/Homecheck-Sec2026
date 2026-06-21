import { ArkField, ArkFile, ArkInstanceFieldRef, ArkMethod } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { ArkClass } from 'arkanalyzer/lib/core/model/ArkClass';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class AvoidUpdateAutoStateVarAboutToReuseCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly COMPONENT_DEC: string;
    readonly ABOUTTOREUSE_MET: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private clsMatcher;
    registerMatchers(): MatcherCallback[];
    check: (targetCla: ArkClass) => void;
    saveStateField(arkClass: ArkClass): ArkField[];
    invokestmt(stateFields: ArkField[], method: ArkMethod, arkFile: ArkFile): void;
    stateValueUpdate(stateFields: ArkField[], leftOp: ArkInstanceFieldRef): ArkField | null;
    reportIssue(arkFile: ArkFile, arkField: ArkField): void;
}
