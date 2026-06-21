import { AIFix, FunctionFix, RuleFix } from './Fix';
export declare const engine: {
    engineName: string;
};
export declare class Defects {
    reportLine: number;
    reportColumn: number;
    description: string;
    severity: number;
    ruleId: string;
    mergeKey: string;
    ruleDocPath: string;
    disabled: boolean;
    checked: boolean;
    fixable: boolean;
    fixKey: string;
    showIgnoreIcon: boolean;
    engineName: string;
    constructor(reportLine: number, reportColumn: number, endColumn: number, description: string, severity: number, ruleId: string, filePath: string, ruleDocPath: string, disabled: boolean, checked: boolean, fixable: boolean, showIgnoreIcon?: boolean);
}
export declare class IssueReport {
    defect: Defects;
    fix: RuleFix | FunctionFix | AIFix | undefined;
    constructor(defect: Defects, fix: RuleFix | FunctionFix | AIFix | undefined);
}
export interface FileIssues {
    filePath: string;
    issues: IssueReport[];
}
export interface FileReports {
    filePath: string;
    defects: Defects[];
    output?: string;
}
