export declare class ProjectConfig {
    projectName: string;
    projectPath: string;
    logPath: string;
    ohosSdkPath: string;
    hmsSdkPath: string;
    checkPath: string;
    apiVersion: number;
    fix: string;
    fixSelected: boolean;
    npmPath: string;
    npmInstallDir: string;
    reportDir: string;
    sdksThirdParty: string[];
    arkCheckPath: string;
    product: string;
    homecheck_log_level: string;
    arkanalyzer_log_level: string;
    constructor(config: any);
}
export interface SelectedFileInfo {
    filePath: string;
    fixKey?: string[];
}
