import { ArkFile } from 'arkanalyzer';
import { FileReports, IssueReport } from './Defects';
export interface Engine {
    /**
     * 首次调用修复引擎时会调用，不同引擎的后续修复，可以内部单独实现
     * @param arkFile
     * @param fixIssues 需要修复的issues列表
     * @param remainIssues 剩余issues列表
     * @returns FileReports
     */
    applyFix(arkFile: ArkFile, fixIssues: IssueReport[], remainIssues: IssueReport[]): FileReports;
}
