import { IssueReport } from '../../model/Defects';
export declare const DisableText: {
    FILE_DISABLE_TEXT: string;
    NEXT_LINE_DISABLE_TEXT: string;
};
export declare function filterDisableIssue(lineList: string[], issues: IssueReport[]): IssueReport[];
