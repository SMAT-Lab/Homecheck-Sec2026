import { ArkMethod } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ImagePixelFormatCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly CREATEPIXELMAP: string;
    readonly INITIALIZATIONOPTIONS: string;
    readonly DECODINGOPTIONS: string;
    readonly PIXELFORMAT: string;
    readonly DESIREDPIXELFORMAT: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private mtdMatcher;
    registerMatchers(): MatcherCallback[];
    check: (target: ArkMethod) => void;
    private stmtProcess;
    private argProcess;
    private newExperProcess;
    private arkInstanceInvokeExprProcess;
    private arkAssignStmtProcess;
    private addIssueReport;
    private getLineAndColumn;
}
