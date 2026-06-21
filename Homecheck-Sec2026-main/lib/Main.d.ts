import { CheckEntry } from './utils/common/CheckEntry';
export declare function start(checkEntry: CheckEntry): Promise<boolean>;
export declare function run(projectConfigPath: string, configPath: string): Promise<boolean>;
