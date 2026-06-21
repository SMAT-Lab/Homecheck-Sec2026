import { ArkFile } from 'arkanalyzer';
import { FileReports, IssueReport } from '../../model/Defects';
import { Engine } from '../../model/Engine';
export declare class EsLintFixEngine implements Engine {
    applyFix(arkFile: ArkFile, fixIssues: IssueReport[], remainIssues: IssueReport[]): FileReports;
    private checkAndSortIssues;
    private compareIssueByRange;
    private compareIssueByLocation;
    private updateRemainIssues;
}
