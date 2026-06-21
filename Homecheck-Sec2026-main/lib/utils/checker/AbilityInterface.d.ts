/**
 * Record the module in the module.json5.
 */
export interface moduleJson5Module {
    name: string;
    type: string;
    description: string;
    mainElement: string;
    deviceTypes: string[];
    deliveryWithInstall: boolean;
    installationFree: boolean;
    abilities: moduleAbility[];
    extensionAbilities: extensionAbility[];
}
/**
 * Record the ability in the module.
 */
export interface moduleAbility {
    name: string;
    srcEntry: string;
    description: string;
    icon: string;
    label: string;
    startWindowIcon: string;
    startWindowBackground: string;
    exported: boolean;
    skills: abilitySkill[];
}
/**
 * Record the skill in the ability.
 */
interface abilitySkill {
    entities: string[];
    actions: string[];
}
/**
 * Record the extensionAbility in the module.
 */
export interface extensionAbility {
    name: string;
    srcEntry: string;
    description: string;
    icon: string;
    label: string;
    type: string;
    metadata: extensionAbilityMetadata[];
}
/**
 * Record the metadata in the extensionAbility.
 */
interface extensionAbilityMetadata {
    name: string;
    resource: string;
}
/**
 * Record the app in the app.json5.
 */
export interface appJson5App {
    bundleName: string;
    vendor: string;
    versionCode: number;
    versionName: string;
    devicetypes: string[];
    icon: string;
    label: string;
}
export {};
