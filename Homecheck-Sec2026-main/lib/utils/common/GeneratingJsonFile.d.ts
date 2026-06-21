import { FileReports } from '../../model/Defects';
import { CheckEntry } from './CheckEntry';
export declare class GeneratingJsonFile {
    static generatingJsonFile(checkEntry: CheckEntry, filePath: string, fileReports: FileReports[]): void;
    /**
     * 过滤掉部分不需要的defect属性
     *
     * @param fileReports 原始文件缺陷信息数组
     * @returns 过滤后的文件缺陷信息数组
     */
    private static format;
    private static addResult;
    private static format2;
}
