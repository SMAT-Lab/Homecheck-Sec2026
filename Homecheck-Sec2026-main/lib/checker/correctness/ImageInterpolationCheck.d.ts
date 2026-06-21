import { ArkFile } from 'arkanalyzer/lib';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class ImageInterpolationCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    readonly NONE: string;
    readonly IMAGE: string;
    readonly INTERPOLATION: string;
    readonly ABOUTTOAPPEAR: string;
    readonly IMAGEINTERPOLATION: string;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    private fileMatcher;
    registerMatchers(): MatcherCallback[];
    check: (arkFile: ArkFile) => void;
    private classProcess;
    private stmtProcess;
    private staticFieldRefProcess;
    private instanceFieldRefProcess;
    private usedStmtProcess;
    private aboutToAppearStmtProcess;
    private initStmtProcess;
    private arkAssignStmtProcess;
    private addIssueReport;
    private getLineAndColumn;
}
