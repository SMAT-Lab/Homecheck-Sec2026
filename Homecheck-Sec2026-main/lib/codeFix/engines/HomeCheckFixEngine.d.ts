import { ArkFile } from 'arkanalyzer';
import { FileReports, IssueReport } from '../../model/Defects';
import { Engine } from '../../model/Engine';
export declare class HomeCheckFixEngine implements Engine {
    constructor();
    applyFix(arkFile: ArkFile, issues: IssueReport[]): FileReports;
    private arkFileToFile;
}
