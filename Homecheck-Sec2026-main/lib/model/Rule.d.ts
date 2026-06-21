export declare class Rule {
    ruleId: string;
    alert: ALERT_LEVEL;
    allowExpressions: boolean;
    ignoreRestArgs: boolean;
    option: Object[];
    constructor(ruleId: string, alert?: ALERT_LEVEL);
}
export declare enum ALERT_LEVEL {
    OFF = 0,
    WARN = 1,
    ERROR = 2,
    SUGGESTION = 3
}
export interface ExtRuleSet {
    ruleSetName: string;
    packagePath: string;
    extRules: object;
}
