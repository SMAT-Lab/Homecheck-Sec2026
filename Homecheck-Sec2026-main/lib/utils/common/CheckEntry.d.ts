import { Scene } from 'arkanalyzer';
import { RuleConfig } from '../../model/RuleConfig';
import { ProjectConfig, SelectedFileInfo } from '../../model/ProjectConfig';
import { Project2Check } from '../../model/Project2Check';
import { File2Check } from '../../model/File2Check';
import { Message } from '../../model/Message';
import { FileIssues, FileReports } from '../../model/Defects';
export declare class CheckEntry {
    ruleConfig: RuleConfig;
    projectConfig: ProjectConfig;
    projectCheck: Project2Check;
    fileChecks: File2Check[];
    scene: Scene;
    message: Message;
    selectFileList: SelectedFileInfo[];
    constructor();
    addFileCheck(fileCheck: File2Check): void;
    addProjectCheck(projectCheck: Project2Check): void;
    setDisableText(fileDisableText: string, nextLineDisableText: string): void;
    setEngineName(engineName: string): void;
    setCheckFileList(selectFileList: SelectedFileInfo[]): void;
    setMessage(message: Message): void;
    runAll(): Promise<void>;
    /**
     * 按规则维度统计并输出告警信息，按文件维度汇总并返回告警信息。
     *
     * @returns FileReport[] 文件报告数组，每个元素包含文件名、缺陷列表和输出信息
     */
    sortIssues(): FileIssues[];
    buildScope(): void;
    /**
     * 修复代码问题
     *
     * @param fileIssues 以文件为维度的issues信息
     * @returns 修复后的文件报告数组，去掉已修复issues，且需更新未修复issues行列号等信息
     */
    codeFix(fileIssues: FileIssues[]): FileReports[];
    private classifyIssues;
}
export declare function checkEntryBuilder(checkEntry: CheckEntry): Promise<boolean>;
/**
 * 获取指定检查的文件列表
 *
 * @param checkFilePath - 指定的检查文件路径的配置文件路径，该文件内容示例{"checkPath": [{"filePath": "xxx", "fixKey": ["%line%sCol%eCol%ruleId"]}]}
 * filePath为需要检查的文件路径，fixKey为需要修复的缺陷key，空数组则不修复。
 * @returns SelectFileInfo[] - 需要检查的文件列表
 */
export declare function getSelectFileList(checkFilePath: string): SelectedFileInfo[];
