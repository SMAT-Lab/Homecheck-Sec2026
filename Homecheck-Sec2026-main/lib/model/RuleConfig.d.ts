import { GlobMatch } from '../utils/common/GlobMatch';
export declare class RuleConfig {
    files: GlobMatch;
    ignore: GlobMatch;
    rules: object;
    extRules: object;
    extRuleSet: object[];
    ruleSet: string[];
    overrides: RuleConfig[];
    constructor(config: any);
}
