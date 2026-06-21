import { BaseChecker, BaseMetaData } from '../BaseChecker';
import { Scene } from 'arkanalyzer';
import { Rule, Defects, MatcherCallback } from '../../Index';
import { IssueReport } from '../../model/Defects';
export declare class StartWindowIconCheck implements BaseChecker {
    readonly metaData: BaseMetaData;
    rule: Rule;
    defects: Defects[];
    issues: IssueReport[];
    registerMatchers(): MatcherCallback[];
    check: (scene: Scene) => void;
    private iconCheckByAbility;
    private iconCheckByIcon;
    private iconCheckByIconPath;
    private pathExistsSync;
    private getWarnInfo;
    private iconCheck;
    private getJson5Files;
}
