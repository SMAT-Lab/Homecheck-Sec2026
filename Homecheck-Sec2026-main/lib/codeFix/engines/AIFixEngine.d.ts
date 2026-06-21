import { ArkFile } from 'arkanalyzer';
import { FileReports, IssueReport } from '../../model/Defects';
import { Engine } from '../../model/Engine';
export declare class AIFixEngine implements Engine {
    applyFix(arkFile: ArkFile, isses: IssueReport[]): FileReports;
}
