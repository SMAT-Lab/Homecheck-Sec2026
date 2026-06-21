import { Defects } from '../../model/Defects';
export declare class RuleListUtil {
    static push(defect: Defects): void;
    static updateDefect(defect: Defects): void;
    static printDefects(): void;
    static isFilter(ruleId: string): boolean;
}
