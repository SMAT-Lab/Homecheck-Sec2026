import { ArkFile } from 'arkanalyzer';
import { Rule } from '../../Index';
import { File2Check } from '../../model/File2Check';
import { Project2Check } from '../../model/Project2Check';
export declare function fileCheckBuilder(arkFile: ArkFile, enabledRules: Rule[]): File2Check;
export declare function projectCheckBuilder(arkFiles: ArkFile[], enabledRules: Rule[]): Project2Check;
