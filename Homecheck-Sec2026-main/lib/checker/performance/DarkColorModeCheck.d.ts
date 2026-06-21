import { Scene } from 'arkanalyzer';
import { Defects, MatcherCallback, Rule } from '../../Index';
import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { IssueReport } from '../../model/Defects';
export declare class DarkColorModeCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    registerMatchers(): MatcherCallback[];
    check: (scene: Scene) => void;
    private reportIssue;
}
