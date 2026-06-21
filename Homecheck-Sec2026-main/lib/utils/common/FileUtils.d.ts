import { Sdk } from 'arkanalyzer/lib/Config';
import { ProjectConfig, SelectedFileInfo } from '../../model/ProjectConfig';
import { RuleConfig } from '../../model/RuleConfig';
import { GlobMatch } from './GlobMatch';
export declare class FileUtils {
    /**
     * 读取指定文件并返回其内容
     * @param {string} fileName - 要读取的文件名
     * @returns {string} - 文件内容
     */
    static readFile(fileName: string): string;
    /**
     * 根据给定的文件列表和规则配置，过滤出符合规则的文件列表。
     * @param fileList 文件列表。
     * @param ruleConfig 规则配置，包含匹配和忽略文件的规则，以及可能的重写规则。
     * @returns 返回符合规则的文件列表，异常情况下返回空数组。
     */
    static getFiltedFiles(fileList: string[], ruleConfig: RuleConfig): Promise<string[]>;
    /**
     * 匹配文件列表中的文件，返回符合条件的文件路径列表
     * @param fileList 文件路径列表
     * @param fileTypes 文件类型列表，使用glob模式匹配
     * @param ignoreDirs 要忽略的目录列表，使用glob模式匹配，默认为空数组
     * @returns 符合条件的文件路径列表
     */
    static matchFiles(fileList: string[], fileGlob: GlobMatch, ignoreGlob: GlobMatch): Promise<string[]>;
    /**
     * 从文件中读取指定行或全部行
     * @param filePath 文件路径
     * @param lineNo 要读取的行号，不传或者0值则读取全部行
     * @returns 读取到的行组成的字符串数组
     * @throws 如果读取文件时发生错误，将抛出异常
     */
    static readLinesFromFile(filePath: string, lineNo?: number): Promise<string[]>;
    /**
     * 检查文件是否存在
     * @param filePath 文件路径
     * @returns 如果文件存在则返回true，否则返回false
     */
    static isExistsSync(filePath: string): boolean;
    /**
     * 从指定路径的JSON文件中获取符合条件的文件信息列表
     * @param jsonPath JSON文件路径
     * @param exts 文件扩展名数组
     * @returns 符合条件的文件信息数组
     */
    static getSeletctedFileInfos(jsonPath: string, exts: string[]): SelectedFileInfo[];
    /**
     * 获取指定目录下所有符合条件的文件
     * @param dirPath - 目录路径
     * @param exts - 文件扩展名数组，如果为空则获取所有文件，['.ts', '.ets', '.json5']
     * @param filenameArr - 存储符合条件的文件路径的数组，默认为空数组
     * @param visited - 已访问的目录集合，默认为空集合
     * @returns 符合条件的文件路径数组
     */
    static getAllFiles(dirPath: string, exts: string[], filenameArr?: string[], visited?: Set<string>): string[];
    private static shouldSkipFile;
    private static shouldAddFile;
    /**
     * 生成SDK数组
     * @param projectConfig - 项目配置
     * @returns Sdk[] - SDK数组
     */
    static genSdks(projectConfig: ProjectConfig): Sdk[];
    /**
     * 写入文件，同步接口
     * @param filePath 文件路径
     * @param content 写入的内容
     * @param mode 写入模式，不传默认为追加模式
     **/
    static writeToFile(filePath: string, content: string, mode?: WriteFileMode): void;
}
export declare enum WriteFileMode {
    OVERWRITE = 0,
    APPEND = 1
}
