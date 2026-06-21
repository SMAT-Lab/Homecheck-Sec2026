"use strict";
/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyChecker = exports.project2CheckRuleMap = exports.file2CheckRuleMap = exports.projectRules = exports.fileRules = void 0;
const logger_1 = __importStar(require("arkanalyzer/lib/utils/logger"));
const ArrayDefinitionCheck_1 = require("../../checker/performance/ArrayDefinitionCheck");
const AvoidEmptyCallbackCheck_1 = require("../../checker/performance/AvoidEmptyCallbackCheck");
const AvoidUpdateAutoStateVarAboutToReuseCheck_1 = require("../../checker/performance/AvoidUpdateAutoStateVarAboutToReuseCheck");
const ConstantPropertyReferencingInLoopsCheck_1 = require("../../checker/performance/ConstantPropertyReferencingInLoopsCheck");
const EffectkitBlurCheck_1 = require("../../checker/performance/EffectkitBlurCheck");
const ForEachArgsCheck_1 = require("../../checker/performance/ForEachArgsCheck");
const ForeachIndexCheck_1 = require("../../checker/performance/ForeachIndexCheck");
const LottieAnimationDestoryCheck_1 = require("../../checker/performance/LottieAnimationDestoryCheck");
const HighFrequencyLogCheck_1 = require("../../checker/performance/HighFrequencyLogCheck");
const LayoutPropertiesScaleCheck_1 = require("../../checker/performance/LayoutPropertiesScaleCheck");
const RemoveRedundantStateVarCheck_1 = require("../../checker/performance/RemoveRedundantStateVarCheck");
const TimezoneInterfaceCheck_1 = require("../../checker/performance/TimezoneInterfaceCheck");
const TypedArrayCheck_1 = require("../../checker/performance/TypedArrayCheck");
const UseObjectLinkToReplacePropCheck_1 = require("../../checker/performance/UseObjectLinkToReplacePropCheck");
const WebCacheModeCheck_1 = require("../../checker/performance/WebCacheModeCheck");
const SparseArrayCheck_1 = require("../../checker/performance/SparseArrayCheck");
const WaterFlowUpdateDataCheck_1 = require("../../checker/performance/WaterFlowUpdateDataCheck");
const UnionTypeArrayCheck_1 = require("../../checker/performance/UnionTypeArrayCheck");
const OptionalParametersCheck_1 = require("../../checker/performance/OptionalParametersCheck");
const UseGridLayoutOptionsCheck_1 = require("../../checker/performance/UseGridLayoutOptionsCheck");
const RemoveUnchangedStateVarCheck_1 = require("../../checker/performance/RemoveUnchangedStateVarCheck");
const JsCodeCacheByPrecompileCheck_1 = require("../../checker/performance/JsCodeCacheByPrecompileCheck");
const JsCodeCacheByInterceptionCheck_1 = require("../../checker/performance/JsCodeCacheByInterceptionCheck");
const ImageInterpolationCheck_1 = require("../../checker/correctness/ImageInterpolationCheck");
const AudioInterruptCheck_1 = require("../../checker/correctness/AudioInterruptCheck");
const AudioPauseOrMuteCheck_1 = require("../../checker/correctness/AudioPauseOrMuteCheck");
const AvsessionButtonsCheck_1 = require("../../checker/correctness/AvsessionButtonsCheck");
const AvsessionMetadataCheck_1 = require("../../checker/correctness/AvsessionMetadataCheck");
const ImagePixelFormatCheck_1 = require("../../checker/correctness/ImagePixelFormatCheck");
const ImageSyncLoadCheck_1 = require("../../checker/performance/ImageSyncLoadCheck");
const ListInScrollCheck_1 = require("../../checker/performance/ListInScrollCheck");
const MultipleAssociationsStateVarCheck_1 = require("../../checker/performance/MultipleAssociationsStateVarCheck");
const NumberInitCheck_1 = require("../../checker/performance/NumberInitCheck");
const SetCachedCountForLazyforeachCheck_1 = require("../../checker/performance/SetCachedCountForLazyforeachCheck");
const StartWindowIconCheck_1 = require("../../checker/performance/StartWindowIconCheck");
const SymbolUsageCheck_1 = require("../../checker/security/SymbolUsageCheck");
const WebOnActiveCheck_1 = require("../../checker/performance/WebOnActiveCheck");
const GifHardwareDecodingCheck_1 = require("../../checker/performance/GifHardwareDecodingCheck");
const ModuleTopLevelCodeCheck_1 = require("../../checker/performance/ModuleTopLevelCodeCheck");
const NoFloatingPromisesCheck_1 = require("../../checker/ArkTS-eslint/NoFloatingPromisesCheck");
// @ArkTS-eslint
const InitDeclarationsCheck_1 = require("../../checker/ArkTS-eslint/InitDeclarationsCheck");
const DefaultParamLastCheck_1 = require("../../checker/ArkTS-eslint/DefaultParamLastCheck");
const ExplicitFunctionReturnTypeCheck_1 = require("../../checker/ArkTS-eslint/ExplicitFunctionReturnTypeCheck");
const ExplicitModuleBoundaryTypesCheck_1 = require("../../checker/ArkTS-eslint/ExplicitModuleBoundaryTypesCheck");
const NoDupeClassMembersCheck_1 = require("../../checker/ArkTS-eslint/NoDupeClassMembersCheck");
const BanTsCommentCheck_1 = require("../../checker/ArkTS-eslint/BanTsCommentCheck");
const MemberOrderingCheck_1 = require("../../checker/ArkTS-eslint/MemberOrderingCheck");
const NoUnnecessaryConditionCheck_1 = require("../../checker/ArkTS-eslint/NoUnnecessaryConditionCheck");
const NoUnnecessaryQualifierCheck_1 = require("../../checker/ArkTS-eslint/NoUnnecessaryQualifierCheck");
const NoUnnecessaryTypeArgumentsCheck_1 = require("../../checker/ArkTS-eslint/NoUnnecessaryTypeArgumentsCheck");
const NoUnnecessaryTypeAssertionCheck_1 = require("../../checker/ArkTS-eslint/NoUnnecessaryTypeAssertionCheck");
const ValidTypeofCheck_1 = require("../../checker/ArkTS-eslint/ValidTypeofCheck");
const ArrayTypeCheck_1 = require("../../checker/ArkTS-eslint/ArrayTypeCheck");
const NoUselessBackreferenceCheck_1 = require("../../checker/ArkTS-eslint/NoUselessBackreferenceCheck");
const BanTSLintCommentCheck_1 = require("../../checker/ArkTS-eslint/BanTSLintCommentCheck");
const BanTypesCheck_1 = require("../../checker/ArkTS-eslint/BanTypesCheck");
const BraceStyleCheck_1 = require("../../checker/ArkTS-eslint/BraceStyleCheck");
const NoUnsafeOptionalChainingCheck_1 = require("../../checker/ArkTS-eslint/NoUnsafeOptionalChainingCheck");
const NoUselessEscapeCheck_1 = require("../../checker/ArkTS-eslint/NoUselessEscapeCheck");
const NoThisAliasCheck_1 = require("../../checker/ArkTS-eslint/NoThisAliasCheck");
const NoNonNullAssertionCheck_1 = require("../../checker/ArkTS-eslint/NoNonNullAssertionCheck");
const NoMisusedNewCheck_1 = require("../../checker/ArkTS-eslint/NoMisusedNewCheck");
const NoRequireImportsCheck_1 = require("../../checker/ArkTS-eslint/NoRequireImportsCheck");
const NoParameterPropertiesCheck_1 = require("../../checker/ArkTS-eslint/NoParameterPropertiesCheck");
const NoRedeclareCheck_1 = require("../../checker/ArkTS-eslint/NoRedeclareCheck");
const NoShadowCheck_1 = require("../../checker/ArkTS-eslint/NoShadowCheck");
const NoNonNullAssertedOptionalChainCheck_1 = require("../../checker/ArkTS-eslint/NoNonNullAssertedOptionalChainCheck");
const ConsistentTypeAssertionsCheck_1 = require("../../checker/ArkTS-eslint/ConsistentTypeAssertionsCheck");
const ConsistentTypeDefinitionsCheck_1 = require("../../checker/ArkTS-eslint/ConsistentTypeDefinitionsCheck");
const ConsistentTypeImportsCheck_1 = require("../../checker/ArkTS-eslint/ConsistentTypeImportsCheck");
const ConsistentIndexedObjectStyleCheck_1 = require("../../checker/ArkTS-eslint/ConsistentIndexedObjectStyleCheck");
const NoUselessCatchCheck_1 = require("../../checker/ArkTS-eslint/NoUselessCatchCheck");
const NoNewWrappersCheck_1 = require("../../checker/ArkTS-eslint/NoNewWrappersCheck");
const NoCondAssignCheck_1 = require("../../checker/ArkTS-eslint/NoCondAssignCheck");
const MaxLinesPerFunctionCheck_1 = require("../../checker/ArkTS-eslint/MaxLinesPerFunctionCheck");
const NoDuplicateImportsCheck_1 = require("../../checker/ArkTS-eslint/NoDuplicateImportsCheck");
const NoForInArrayCheck_1 = require("../../checker/ArkTS-eslint/NoForInArrayCheck");
const NoLoopFuncCheck_1 = require("../../checker/ArkTS-eslint/NoLoopFuncCheck");
const NoLossOfPrecisionCheck_1 = require("../../checker/ArkTS-eslint/NoLossOfPrecisionCheck");
const NoExtraneousClassCheck_1 = require("../../checker/ArkTS-eslint/NoExtraneousClassCheck");
const NoArrayConstructorCheck_1 = require("../../checker/ArkTS-eslint/NoArrayConstructorCheck");
const NoCaseDeclarationsCheck_1 = require("../../checker/ArkTS-eslint/NoCaseDeclarationsCheck");
const NoUnsafeAssignmentCheck_1 = require("../../checker/ArkTS-eslint/NoUnsafeAssignmentCheck");
const MaxLinesCheck_1 = require("../../checker/ArkTS-eslint/MaxLinesCheck");
const DefaultCaseCheck_1 = require("../../checker/ArkTS-eslint/DefaultCaseCheck");
const DefaultCaseLastCheck_1 = require("../../checker/ArkTS-eslint/DefaultCaseLastCheck");
const UseIsNaNCheck_1 = require("../../checker/ArkTS-eslint/UseIsNaNCheck");
const TypedefCheck_1 = require("../../checker/ArkTS-eslint/TypedefCheck");
const NoNameSpaceCheck_1 = require("../../checker/ArkTS-eslint/NoNameSpaceCheck");
const MaxDepthCheck_1 = require("../../checker/ArkTS-eslint/MaxDepthCheck");
const MaxClassesPerFileCheck_1 = require("../../checker/ArkTS-eslint/MaxClassesPerFileCheck");
const MaxNestedCallbacksCheck_1 = require("../../checker/ArkTS-eslint/MaxNestedCallbacksCheck");
const NoAsyncPromiseExecutorCheck_1 = require("../../checker/ArkTS-eslint/NoAsyncPromiseExecutorCheck");
const NoUnsafeCallCheck_1 = require("../../checker/ArkTS-eslint/NoUnsafeCallCheck");
const NoUnnecessaryTypeConstraintCheck_1 = require("../../checker/ArkTS-eslint/NoUnnecessaryTypeConstraintCheck");
const NoUnsafeArgumentCheck_1 = require("../../checker/ArkTS-eslint/NoUnsafeArgumentCheck");
const NoControlRegexCheck_1 = require("../../checker/ArkTS-eslint/NoControlRegexCheck");
const NoEmptyCharacterClassCheck_1 = require("../../checker/ArkTS-eslint/NoEmptyCharacterClassCheck");
const NoInvalidRegexpCheck_1 = require("../../checker/ArkTS-eslint/NoInvalidRegexpCheck");
const NoExAssignCheck_1 = require("../../checker/ArkTS-eslint/NoExAssignCheck");
const NoOctalCheck_1 = require("../../checker/ArkTS-eslint/NoOctalCheck");
const RequireAwaitCheck_1 = require("../../checker/ArkTS-eslint/RequireAwaitCheck");
const SwitchExhaustivenessCheck_1 = require("../../checker/ArkTS-eslint/SwitchExhaustivenessCheck");
const UnifiedSignaturesCheck_1 = require("../../checker/ArkTS-eslint/UnifiedSignaturesCheck");
const NoUnexpectedMultilineCheck_1 = require("../../checker/ArkTS-eslint/NoUnexpectedMultilineCheck");
const NoUnreachableCheck_1 = require("../../checker/ArkTS-eslint/NoUnreachableCheck");
const NoInferrableTypesCheck_1 = require("../../checker/ArkTS-eslint/NoInferrableTypesCheck");
const SpaceInfixOpsCheck_1 = require("../../checker/ArkTS-eslint/SpaceInfixOpsCheck");
const SpaceBeforeFunctionParenCheck_1 = require("../../checker/ArkTS-eslint/SpaceBeforeFunctionParenCheck");
const NoRestrictedSyntaxCheck_1 = require("../../checker/ArkTS-eslint/NoRestrictedSyntaxCheck");
const AdjacentOverloadSignaturesCheck_1 = require("../../checker/ArkTS-eslint/AdjacentOverloadSignaturesCheck");
const ClassLiteralPropertyStyleCheck_1 = require("../../checker/ArkTS-eslint/ClassLiteralPropertyStyleCheck");
const NoEmptyFunctionCheck_1 = require("../../checker/ArkTS-eslint/NoEmptyFunctionCheck");
const PreferForOfCheck_1 = require("../../checker/ArkTS-eslint/PreferForOfCheck");
const NoConfusingNonNullAssertionCheck_1 = require("../../checker/ArkTS-eslint/NoConfusingNonNullAssertionCheck");
const NoMagicNumbersCheck_1 = require("../../checker/ArkTS-eslint/NoMagicNumbersCheck");
const AwaitThenableCheck_1 = require("../../checker/ArkTS-eslint/AwaitThenableCheck");
const NoUselessConstructorCheck_1 = require("../../checker/ArkTS-eslint/NoUselessConstructorCheck");
const PreferEnumInitializwersCheck_1 = require("../../checker/ArkTS-eslint/PreferEnumInitializwersCheck");
const PreferLiteralEnumMemberCheck_1 = require("../../checker/ArkTS-eslint/PreferLiteralEnumMemberCheck");
const PreferReadonlyParametertypesCheck_1 = require("../../checker/ArkTS-eslint/PreferReadonlyParametertypesCheck");
const RequireArraySortCompareCheck_1 = require("../../checker/ArkTS-eslint/RequireArraySortCompareCheck");
const NoUnusedVarsCheck_1 = require("../../checker/ArkTS-eslint/NoUnusedVarsCheck");
const NoInvalidVoidTypeCheck_1 = require("../../checker/ArkTS-eslint/NoInvalidVoidTypeCheck");
const NoInvalidThisCheck_1 = require("../../checker/ArkTS-eslint/NoInvalidThisCheck");
const NoFallthroughCheck_1 = require("../../checker/ArkTS-eslint/NoFallthroughCheck");
const NoBaseToStringCheck_1 = require("../../checker/ArkTS-eslint/NoBaseToStringCheck");
const NoExplicitAnyCheck_1 = require("../../checker/ArkTS-eslint/NoExplicitAnyCheck");
const NamingConventionCheck_1 = require("../../checker/ArkTS-eslint/NamingConventionCheck");
const NoUnusedExpressionsCheck_1 = require("../../checker/ArkTS-eslint/NoUnusedExpressionsCheck");
const NoUnsafeMemberAccessCheck_1 = require("../../checker/ArkTS-eslint/NoUnsafeMemberAccessCheck");
const NoThrowLiteralCheck_1 = require("../../checker/ArkTS-eslint/NoThrowLiteralCheck");
const EqeqeqCheck_1 = require("../../checker/ArkTS-eslint/EqeqeqCheck");
const NoExtraSemiCheck_1 = require("../../checker/ArkTS-eslint/NoExtraSemiCheck");
const CommaDangleCheck_1 = require("../../checker/ArkTS-eslint/CommaDangleCheck");
const PreferRegexpExecCheck_1 = require("../../checker/ArkTS-eslint/PreferRegexpExecCheck");
const PreferTsExpectErrorCheck_1 = require("../../checker/ArkTS-eslint/PreferTsExpectErrorCheck");
const DotNotationCheck_1 = require("../../checker/ArkTS-eslint/DotNotationCheck");
const ExplicitMemberAccessibilityCheck_1 = require("../../checker/ArkTS-eslint/ExplicitMemberAccessibilityCheck");
const NoExtraParensCheck_1 = require("../../checker/ArkTS-eslint/NoExtraParensCheck");
const NoDynamicDeleteCheck_1 = require("../../checker/ArkTS-eslint/NoDynamicDeleteCheck");
const NoImplicitAnyCatchCheck_1 = require("../../checker/ArkTS-eslint/NoImplicitAnyCatchCheck");
const NoEmptyInterfaceCheck_1 = require("../../checker/ArkTS-eslint/NoEmptyInterfaceCheck");
const NoUnsafeFinallyCheck_1 = require("../../checker/ArkTS-eslint/NoUnsafeFinallyCheck");
const PreferFunctionTypeCheck_1 = require("../../checker/ArkTS-eslint/PreferFunctionTypeCheck");
const PreferNamespaceKeywordCheck_1 = require("../../checker/ArkTS-eslint/PreferNamespaceKeywordCheck");
const PreferNullishCoalescingCheck_1 = require("../../checker/ArkTS-eslint/PreferNullishCoalescingCheck");
const ReturnAwaitCheck_1 = require("../../checker/ArkTS-eslint/ReturnAwaitCheck");
const PreferReduceTypeParameterCheck_1 = require("../../checker/ArkTS-eslint/PreferReduceTypeParameterCheck");
const CommaSpacingCheck_1 = require("../../checker/ArkTS-eslint/CommaSpacingCheck");
const NoExtraNonNullAssertionCheck_1 = require("../../checker/ArkTS-eslint/NoExtraNonNullAssertionCheck");
const NoTypeAliasCheck_1 = require("../../checker/ArkTS-eslint/NoTypeAliasCheck");
const NoMisusedPromisesCheck_1 = require("../../checker/ArkTS-eslint/NoMisusedPromisesCheck");
const TypeAnnotationSpacingCheck_1 = require("../../checker/ArkTS-eslint/TypeAnnotationSpacingCheck");
const StrictBooleanExpressionsCheck_1 = require("../../checker/ArkTS-eslint/StrictBooleanExpressionsCheck");
const SemiCheck_1 = require("../../checker/ArkTS-eslint/SemiCheck");
const NoArrayConstructorTSCheck_1 = require("../../checker/ArkTS-eslint/NoArrayConstructorTSCheck");
const PreferStringStartsEndsWithCheck_1 = require("../../checker/ArkTS-eslint/PreferStringStartsEndsWithCheck");
const PromiseFunctionAsyncCheck_1 = require("../../checker/ArkTS-eslint/PromiseFunctionAsyncCheck");
const KeywordSpacingCheck_1 = require("../../checker/ArkTS-eslint/KeywordSpacingCheck");
const FuncCallSpacingCheck_1 = require("../../checker/ArkTS-eslint/FuncCallSpacingCheck");
const MethodSignatureStyleCheck_1 = require("../../checker/ArkTS-eslint/MethodSignatureStyleCheck");
const LinesBetweenClassMembersCheck_1 = require("../../checker/ArkTS-eslint/LinesBetweenClassMembersCheck");
const MemberDelimiterStyleCheck_1 = require("../../checker/ArkTS-eslint/MemberDelimiterStyleCheck");
const NoUnsafeReturnCheck_1 = require("../../checker/ArkTS-eslint/NoUnsafeReturnCheck");
const PreferReadonlyCheck_1 = require("../../checker/ArkTS-eslint/PreferReadonlyCheck");
const NoUseBeforeDefineCheck_1 = require("../../checker/ArkTS-eslint/NoUseBeforeDefineCheck");
const PreferAsConstCheck_1 = require("../../checker/ArkTS-eslint/PreferAsConstCheck");
const QuotesCheck_1 = require("../../checker/ArkTS-eslint/QuotesCheck");
const NoRegexSpacesCheck_1 = require("../../checker/ArkTS-eslint/NoRegexSpacesCheck");
const PreferOptionalChainCheck_1 = require("../../checker/ArkTS-eslint/PreferOptionalChainCheck");
const NoTrailingSpacesCheck_1 = require("../../checker/ArkTS-eslint/NoTrailingSpacesCheck");
const NoExtraBooleanCastCheck_1 = require("../../checker/ArkTS-eslint/NoExtraBooleanCastCheck");
const NoConfusingVoidExpressionCheck_1 = require("../../checker/ArkTS-eslint/NoConfusingVoidExpressionCheck");
const PreferArrowCallbackCheck_1 = require("../../checker/ArkTS-eslint/PreferArrowCallbackCheck");
const NoUnnecessaryBooleanLiteralCompareCheck_1 = require("../../checker/ArkTS-eslint/NoUnnecessaryBooleanLiteralCompareCheck");
const NoImpliedEvalCheck_1 = require("../../checker/ArkTS-eslint/NoImpliedEvalCheck");
const PreferConstCheck_1 = require("../../checker/ArkTS-eslint/PreferConstCheck");
const PreferIncludesCheck_1 = require("../../checker/ArkTS-eslint/PreferIncludesCheck");
const RestrictPlusOperandsCheck_1 = require("../../checker/ArkTS-eslint/RestrictPlusOperandsCheck");
const UnboundMethodCheck_1 = require("../../checker/ArkTS-eslint/UnboundMethodCheck");
const RestrictTemplateExpressionsCheck_1 = require("../../checker/ArkTS-eslint/RestrictTemplateExpressionsCheck");
const TripleSlashReferenceCheck_1 = require("../../checker/ArkTS-eslint/TripleSlashReferenceCheck");
const CacheAvplayerCheck_1 = require("../../checker/performance/CacheAvplayerCheck");
const ColorOverlayEffectCheck_1 = require("../../checker/performance/ColorOverlayEffectCheck");
const CombineSameArgAnimatetoCheck_1 = require("../../checker/performance/CombineSameArgAnimatetoCheck");
const ConstantCheck_1 = require("../../checker/performance/ConstantCheck");
const HomepagePrepareLoadCheck_1 = require("../../checker/performance/HomepagePrepareLoadCheck");
const ImageFormatCheck_1 = require("../../checker/performance/ImageFormatCheck");
const ImageSizeCheck_1 = require("../../checker/performance/ImageSizeCheck");
const LimitRefreshScopeCheck_1 = require("../../checker/performance/LimitRefreshScopeCheck");
const LoadOnDemandCheck_1 = require("../../checker/performance/LoadOnDemandCheck");
const NoStateVarAccessInLoopCheck_1 = require("../../checker/performance/NoStateVarAccessInLoopCheck");
const NoUseAnyExportCurrentCheck_1 = require("../../checker/performance/NoUseAnyExportCurrentCheck");
const NoUseAnyExportOtherCheck_1 = require("../../checker/performance/NoUseAnyExportOtherCheck");
const PagePrefetchCheck_1 = require("../../checker/performance/PagePrefetchCheck");
const RemoveContainerWithoutPropertyCheck_1 = require("../../checker/performance/RemoveContainerWithoutPropertyCheck");
const ReplaceNestedReusableComponentByBuilderCheck_1 = require("../../checker/performance/ReplaceNestedReusableComponentByBuilderCheck");
const ResourcesFileCheck_1 = require("../../checker/performance/ResourcesFileCheck");
const SuggestReuseidForlfElseReusableComponentCheck_1 = require("../../checker/performance/SuggestReuseidForlfElseReusableComponentCheck");
const UseAttributeUpdaterControlRefreshScopeCheck_1 = require("../../checker/performance/UseAttributeUpdaterControlRefreshScopeCheck");
const UseReusableComponentCheck_1 = require("../../checker/performance/UseReusableComponentCheck");
const WebResourceForImageComponentCheck_1 = require("../../checker/performance/WebResourceForImageComponentCheck");
const NoCycleCheck_1 = require("../../checker/security/NoCycleCheck");
const NoUnsafeAesCheck_1 = require("../../checker/security/NoUnsafeAesCheck");
const NoUnsafeDhCheck_1 = require("../../checker/security/NoUnsafeDhCheck");
const NoUnsafeDhKeyCheck_1 = require("../../checker/security/NoUnsafeDhKeyCheck");
const NoUnsafeDsaCheck_1 = require("../../checker/security/NoUnsafeDsaCheck");
const NoUnsafeDsaKeyCheck_1 = require("../../checker/security/NoUnsafeDsaKeyCheck");
const NoUnsafeEcdsaCheck_1 = require("../../checker/security/NoUnsafeEcdsaCheck");
const NoUnsafeHashCheck_1 = require("../../checker/security/NoUnsafeHashCheck");
const NoUnsafeRsaEncryptCheck_1 = require("../../checker/security/NoUnsafeRsaEncryptCheck");
const NoUnsafeRsaKeyCheck_1 = require("../../checker/security/NoUnsafeRsaKeyCheck");
const NoUnsafeMacCheck_1 = require("../../checker/security/NoUnsafeMacCheck");
const NoUnsafeRsaSignCheck_1 = require("../../checker/security/NoUnsafeRsaSignCheck");
const NoHighLoadedFrameRateRangeCheck_1 = require("../../checker/performance/NoHighLoadedFrameRateRangeCheck");
const OneMultiBreakpointCheck_1 = require("../../checker/cross-device-app-dev/OneMultiBreakpointCheck");
const AvoidInspectorInterfaceCheck_1 = require("../../checker/stability/AvoidInspectorInterfaceCheck");
const AwaitTimeSequenceNormalCheck_1 = require("../../checker/stability/AwaitTimeSequenceNormalCheck");
const BanCallbackOperationsCheck_1 = require("../../checker/stability/BanCallbackOperationsCheck");
const CallAddInputBeforeAddOutputCheck_1 = require("../../checker/stability/CallAddInputBeforeAddOutputCheck");
const CameraInputOpenCheck_1 = require("../../checker/stability/CameraInputOpenCheck");
const ImageSyncBlurCheck_1 = require("../../checker/stability/ImageSyncBlurCheck");
const DarkColorModeCheck_1 = require("../../checker/performance/DarkColorModeCheck");
const LowerAppBrightnessCheck_1 = require("../../checker/performance/LowerAppBrightnessCheck");
const StreamUsageApiCheck_1 = require("../../checker/performance/StreamUsageApiCheck");
const AvoidMemoryLeakInAnimator_1 = require("../../checker/performance/AvoidMemoryLeakInAnimator");
const AvoidMemoryLeakInDisplaysync_1 = require("../../checker/performance/AvoidMemoryLeakInDisplaysync");
const CommandExecutionCheck_1 = require("../../checker/SoftwareSecurity26/Checker19241042/CommandExecutionCheck");
const CommandExecutionCheck_2 = require("../../checker/SoftwareSecurity26/Checker23373456/CommandExecutionCheck");
const HardcodedSecretCheck_1 = require("../../checker/SoftwareSecurity26/Checker23373456/HardcodedSecretCheck");
const SQLInjectionCheck_1 = require("../../checker/SoftwareSecurity26/Checker23373456/SQLInjectionCheck");
const PathTraversalCheck_1 = require("../../checker/SoftwareSecurity26/Checker23373456/PathTraversalCheck");
const logger = logger_1.default.getLogger(logger_1.LOG_MODULE_TYPE.HOMECHECK, 'CheckerIndex');
exports.fileRules = {
    // @ArkTS-eslint
    "@ArkTS-eslint/init-declarations-check": InitDeclarationsCheck_1.InitDeclarationsCheck,
    "@ArkTS-eslint/default-param-last-check": DefaultParamLastCheck_1.DefaultParamLastCheck,
    "@ArkTS-eslint/explicit-function-return-type-check": ExplicitFunctionReturnTypeCheck_1.ExplicitFunctionReturnTypeCheck,
    "@ArkTS-eslint/explicit-module-boundary-types-check": ExplicitModuleBoundaryTypesCheck_1.ExplicitModuleBoundaryTypesCheck,
    "@ArkTS-eslint/no-dupe-class-members-check": NoDupeClassMembersCheck_1.NoDupeClassMembersCheck,
    "@ArkTS-eslint/ban-ts-comment-check": BanTsCommentCheck_1.BanTsCommentCheck,
    "@ArkTS-eslint/member-ordering-check": MemberOrderingCheck_1.MemberOrderingCheck,
    "@ArkTS-eslint/no-unsafe-optional-chaining-check": NoUnsafeOptionalChainingCheck_1.NoUnsafeOptionalChainingCheck,
    "@ArkTS-eslint/no-unnecessary-condition-check": NoUnnecessaryConditionCheck_1.NoUnnecessaryConditionCheck,
    "@ArkTS-eslint/no-unnecessary-qualifier-check": NoUnnecessaryQualifierCheck_1.NoUnnecessaryQualifierCheck,
    "@ArkTS-eslint/no-unnecessary-type-arguments-check": NoUnnecessaryTypeArgumentsCheck_1.NoUnnecessaryTypeArgumentsCheck,
    "@ArkTS-eslint/no-unnecessary-type-assertion-check": NoUnnecessaryTypeAssertionCheck_1.NoUnnecessaryTypeAssertionCheck,
    "@ArkTS-eslint/require-await-check": RequireAwaitCheck_1.RequireAwaitCheck,
    "@ArkTS-eslint/prefer-arrow-callback-check": PreferArrowCallbackCheck_1.PreferArrowCallbackCheck,
    "@ArkTS-eslint/no-unnecessary-boolean-literal-compare-check": NoUnnecessaryBooleanLiteralCompareCheck_1.NoUnnecessaryBooleanLiteralCompareCheck,
    "@ArkTS-eslint/switch-exhaustiveness-check": SwitchExhaustivenessCheck_1.SwitchExhaustivenessCheck,
    "@ArkTS-eslint/unified-signatures-check": UnifiedSignaturesCheck_1.UnifiedSignaturesCheck,
    "@ArkTS-eslint/restrict-plus-operands-check": RestrictPlusOperandsCheck_1.RestrictPlusOperandsCheck,
    "@ArkTS-eslint/restrict-template-expressions-check": RestrictTemplateExpressionsCheck_1.RestrictTemplateExpressionsCheck,
    "@ArkTS-eslint/unbound-method-check": UnboundMethodCheck_1.UnboundMethodCheck,
    "@ArkTS-eslint/triple-slash-reference-check": TripleSlashReferenceCheck_1.TripleSlashReferenceCheck,
    "@ArkTS-eslint/valid-typeof-check": ValidTypeofCheck_1.ValidTypeofCheck,
    "@ArkTS-eslint/array-type-check": ArrayTypeCheck_1.ArrayTypeCheck,
    "@ArkTS-eslint/no-floating-promises-check": NoFloatingPromisesCheck_1.NoFloatingPromisesCheck,
    "@ArkTS-eslint/no-useless-backreference-check": NoUselessBackreferenceCheck_1.NoUselessBackreferenceCheck,
    "@ArkTS-eslint/ban-tslint-comment-check": BanTSLintCommentCheck_1.BanTSLintCommentCheck,
    "@ArkTS-eslint/ban-types-check": BanTypesCheck_1.BanTypesCheck,
    "@ArkTS-eslint/brace-style-check": BraceStyleCheck_1.BraceStyleCheck,
    "@ArkTS-eslint/no-useless-escape-check": NoUselessEscapeCheck_1.NoUselessEscapeCheck,
    "@ArkTS-eslint/no-this-alias-check": NoThisAliasCheck_1.NoThisAliasCheck,
    "@ArkTS-eslint/no-non-null-assertion-check": NoNonNullAssertionCheck_1.NoNonNullAssertionCheck,
    "@ArkTS-eslint/no-misused-new-check": NoMisusedNewCheck_1.NoMisusedNewCheck,
    "@ArkTS-eslint/no-require-imports-check": NoRequireImportsCheck_1.NoRequireImportsCheck,
    "@ArkTS-eslint/no-parameter-properties-check": NoParameterPropertiesCheck_1.NoParameterPropertiesCheck,
    "@ArkTS-eslint/no-redeclare-check": NoRedeclareCheck_1.NoRedeclareCheck,
    "@ArkTS-eslint/no-shadow-check": NoShadowCheck_1.NoShadowCheck,
    "@ArkTS-eslint/no-non-null-asserted-optional-chain-check": NoNonNullAssertedOptionalChainCheck_1.NoNonNullAssertedOptionalChainCheck,
    "@ArkTS-eslint/consistent-type-assertions-check": ConsistentTypeAssertionsCheck_1.ConsistentTypeAssertionsCheck,
    "@ArkTS-eslint/consistent-type-definitions-check": ConsistentTypeDefinitionsCheck_1.ConsistentTypeDefinitionsCheck,
    "@ArkTS-eslint/consistent-type-imports-check": ConsistentTypeImportsCheck_1.ConsistentTypeImportsCheck,
    "@ArkTS-eslint/consistent-indexed-object-style-check": ConsistentIndexedObjectStyleCheck_1.ConsistentIndexedObjectStyleCheck,
    "@ArkTS-eslint/no-useless-catch-check": NoUselessCatchCheck_1.NoUselessCatchCheck,
    "@ArkTS-eslint/no-new-wrappers-check": NoNewWrappersCheck_1.NoNewWrappersCheck,
    "@ArkTS-eslint/no-cond-assign-check": NoCondAssignCheck_1.NoCondAssignCheck,
    "@ArkTS-eslint/max-lines-per-function-check": MaxLinesPerFunctionCheck_1.MaxLinesPerFunctionCheck,
    "@ArkTS-eslint/no-duplicate-imports-check": NoDuplicateImportsCheck_1.NoDuplicateImportsCheck,
    "@ArkTS-eslint/no-regex-spaces-check": NoRegexSpacesCheck_1.NoRegexSpacesCheck,
    "@ArkTS-eslint/no-loop-func-check": NoLoopFuncCheck_1.NoLoopFuncCheck,
    "@ArkTS-eslint/no-extraneous-class-check": NoExtraneousClassCheck_1.NoExtraneousClassCheck,
    "@ArkTS-eslint/no-loss-of-precision-check": NoLossOfPrecisionCheck_1.NoLossOfPrecisionCheck,
    "@ArkTS-eslint/no-for-in-array-check": NoForInArrayCheck_1.NoForInArrayCheck,
    "@ArkTS-eslint/max-classes-per-file-check": MaxClassesPerFileCheck_1.MaxClassesPerFileCheck,
    "@ArkTS-eslint/max-nested-callbacks-check": MaxNestedCallbacksCheck_1.MaxNestedCallbacksCheck,
    "@ArkTS-eslint/no-async-promise-executor-check": NoAsyncPromiseExecutorCheck_1.NoAsyncPromiseExecutorCheck,
    "@ArkTS-eslint/no-array-constructor-check": NoArrayConstructorCheck_1.NoArrayConstructorCheck,
    "@ArkTS-eslint/max-depth-check": MaxDepthCheck_1.MaxDepthCheck,
    "@ArkTS-eslint/eqeqeq-check": EqeqeqCheck_1.EqeqeqCheck,
    "@ArkTS-eslint/no-extra-semi-check": NoExtraSemiCheck_1.NoExtraSemiCheck,
    "@ArkTS-eslint/no-array-constructor-ts-check": NoArrayConstructorTSCheck_1.NoArrayConstructorTSCheck,
    "@ArkTS-eslint/no-extra-boolean-cast-check": NoExtraBooleanCastCheck_1.NoExtraBooleanCastCheck,
    "@ArkTS-eslint/no-confusing-void-expression-check": NoConfusingVoidExpressionCheck_1.NoConfusingVoidExpressionCheck,
    "@ArkTS-eslint/prefer-const-check": PreferConstCheck_1.PreferConstCheck,
    "@ArkTS-eslint/no-case-declarations-check": NoCaseDeclarationsCheck_1.NoCaseDeclarationsCheck,
    "@ArkTS-eslint/no-unsafe-assignment-check": NoUnsafeAssignmentCheck_1.NoUnsafeAssignmentCheck,
    "@ArkTS-eslint/max-lines-check": MaxLinesCheck_1.MaxLinesCheck,
    "@ArkTS-eslint/default-case-check": DefaultCaseCheck_1.DefaultCaseCheck,
    "@ArkTS-eslint/default-case-last-check": DefaultCaseLastCheck_1.DefaultCaseLastCheck,
    "@ArkTS-eslint/use-isnan-check": UseIsNaNCheck_1.UseIsNaNCheck,
    "@ArkTS-eslint/no-invalid-void-type-check": NoInvalidVoidTypeCheck_1.NoInvalidVoidTypeCheck,
    "@ArkTS-eslint/no-namespace-check": NoNameSpaceCheck_1.NoNameSpaceCheck,
    "@ArkTS-eslint/typedef-check": TypedefCheck_1.TypedefCheck,
    "@ArkTS-eslint/no-unnecessary-type-constraint-check": NoUnnecessaryTypeConstraintCheck_1.NoUnnecessaryTypeConstraintCheck,
    "@ArkTS-eslint/no-unsafe-argument-check": NoUnsafeArgumentCheck_1.NoUnsafeArgumentCheck,
    "@ArkTS-eslint/no-unsafe-call-check": NoUnsafeCallCheck_1.NoUnsafeCallCheck,
    "@ArkTS-eslint/no-control-regex-check": NoControlRegexCheck_1.NoControlRegexCheck,
    "@ArkTS-eslint/no-empty-character-class-check": NoEmptyCharacterClassCheck_1.NoEmptyCharacterClassCheck,
    "@ArkTS-eslint/no-invalid-regexp-check": NoInvalidRegexpCheck_1.NoInvalidRegexpCheck,
    "@ArkTS-eslint/no-ex-assign-check": NoExAssignCheck_1.NoExAssignCheck,
    "@ArkTS-eslint/no-octal-check": NoOctalCheck_1.NoOctalCheck,
    "@ArkTS-eslint/no-unexpected-multiline-check": NoUnexpectedMultilineCheck_1.NoUnexpectedMultilineCheck,
    "@ArkTS-eslint/no-unreachable-check": NoUnreachableCheck_1.NoUnreachableCheck,
    "@ArkTS-eslint/no-inferrable-types-check": NoInferrableTypesCheck_1.NoInferrableTypesCheck,
    "@ArkTS-eslint/space-infix-ops-check": SpaceInfixOpsCheck_1.SpaceInfixOpsCheck,
    "@ArkTS-eslint/space-before-function-paren-check": SpaceBeforeFunctionParenCheck_1.SpaceBeforeFunctionParenCheck,
    "@ArkTS-eslint/no-restricted-syntax-check": NoRestrictedSyntaxCheck_1.NoRestrictedSyntaxCheck,
    "@ArkTS-eslint/adjacent-overload-signatures-check": AdjacentOverloadSignaturesCheck_1.AdjacentOverloadSignaturesCheck,
    "@ArkTS-eslint/class-literal-property-style-check": ClassLiteralPropertyStyleCheck_1.ClassLiteralPropertyStyleCheck,
    "@ArkTS-eslint/no-confusing-non-null-assertion-check": NoConfusingNonNullAssertionCheck_1.NoConfusingNonNullAssertionCheck,
    "@ArkTS-eslint/no-empty-function-check": NoEmptyFunctionCheck_1.NoEmptyFunctionCheck,
    "@ArkTS-eslint/prefer-for-of-check": PreferForOfCheck_1.PreferForOfCheck,
    "@ArkTS-eslint/no-magic-numbers-check": NoMagicNumbersCheck_1.NoMagicNumbersCheck,
    "@ArkTS-eslint/return-await-check": ReturnAwaitCheck_1.ReturnAwaitCheck,
    "@ArkTS-eslint/prefer-reduce-type-parameter-check": PreferReduceTypeParameterCheck_1.PreferReduceTypeParameterCheck,
    "@ArkTS-eslint/prefer-nullish-coalescing-check": PreferNullishCoalescingCheck_1.PreferNullishCoalescingCheck,
    "@ArkTS-eslint/await-thenable-check": AwaitThenableCheck_1.AwaitThenableCheck,
    "@ArkTS-eslint/no-useless-constructor-check": NoUselessConstructorCheck_1.NoUselessConstructorCheck,
    "@ArkTS-eslint/prefer-enum-initializers-check": PreferEnumInitializwersCheck_1.PreferEnumInitializwersCheck,
    "@ArkTS-eslint/prefer-literal-enum-member-check": PreferLiteralEnumMemberCheck_1.PreferLiteralEnumMemberCheck,
    "@ArkTS-eslint/prefer-readonly-parameter-types-check": PreferReadonlyParametertypesCheck_1.PreferReadonlyParametertypesCheck,
    "@ArkTS-eslint/require-array-sort-compare-check": RequireArraySortCompareCheck_1.RequireArraySortCompareCheck,
    "@ArkTS-eslint/no-unused-vars-check": NoUnusedVarsCheck_1.NoUnusedVarsCheck,
    "@ArkTS-eslint/no-invalid-this-check": NoInvalidThisCheck_1.NoInvalidThisCheck,
    "@ArkTS-eslint/no-fallthrough-check": NoFallthroughCheck_1.NoFallthroughCheck,
    "@ArkTS-eslint/no-base-to-string-check": NoBaseToStringCheck_1.NoBaseToStringCheck,
    "@ArkTS-eslint/no-explicit-any-check": NoExplicitAnyCheck_1.NoExplicitAnyCheck,
    "@ArkTS-eslint/naming-convention-check": NamingConventionCheck_1.NamingConventionCheck,
    "@ArkTS-eslint/no-unused-expressions-check": NoUnusedExpressionsCheck_1.NoUnusedExpressionsCheck,
    "@ArkTS-eslint/no-unsafe-member-access-check": NoUnsafeMemberAccessCheck_1.NoUnsafeMemberAccessCheck,
    "@ArkTS-eslint/no-throw-literal-check": NoThrowLiteralCheck_1.NoThrowLiteralCheck,
    "@ArkTS-eslint/comma-dangle-check": CommaDangleCheck_1.CommaDangleCheck,
    "@ArkTS-eslint/prefer-regexp-exec-check": PreferRegexpExecCheck_1.PreferRegexpExecCheck,
    "@ArkTS-eslint/prefer-ts-expect-error-check": PreferTsExpectErrorCheck_1.PreferTsExpectErrorCheck,
    "@ArkTS-eslint/dot-notation-check": DotNotationCheck_1.DotNotationCheck,
    "@ArkTS-eslint/explicit-member-accessibility-check": ExplicitMemberAccessibilityCheck_1.ExplicitMemberAccessibilityCheck,
    "@ArkTS-eslint/no-extra-parens-check": NoExtraParensCheck_1.NoExtraParensCheck,
    "@ArkTS-eslint/no-dynamic-delete-check": NoDynamicDeleteCheck_1.NoDynamicDeleteCheck,
    "@ArkTS-eslint/no-implicit-any-catch-check": NoImplicitAnyCatchCheck_1.NoImplicitAnyCatchCheck,
    "@ArkTS-eslint/no-empty-interface-check": NoEmptyInterfaceCheck_1.NoEmptyInterfaceCheck,
    "@ArkTS-eslint/no-unsafe-finally-check": NoUnsafeFinallyCheck_1.NoUnsafeFinallyCheck,
    "@ArkTS-eslint/prefer-function-type-check": PreferFunctionTypeCheck_1.PreferFunctionTypeCheck,
    "@ArkTS-eslint/prefer-namespace-keyword-check": PreferNamespaceKeywordCheck_1.PreferNamespaceKeywordCheck,
    "@ArkTS-eslint/comma-spacing-check": CommaSpacingCheck_1.CommaSpacingCheck,
    "@ArkTS-eslint/no-extra-non-null-assertion-check": NoExtraNonNullAssertionCheck_1.NoExtraNonNullAssertionCheck,
    "@ArkTS-eslint/no-type-alias-check": NoTypeAliasCheck_1.NoTypeAliasCheck,
    "@ArkTS-eslint/no-misused-promises-check": NoMisusedPromisesCheck_1.NoMisusedPromisesCheck,
    "@ArkTS-eslint/type-annotation-spacing-check": TypeAnnotationSpacingCheck_1.TypeAnnotationSpacingCheck,
    "@ArkTS-eslint/strict-boolean-expressions-check": StrictBooleanExpressionsCheck_1.StrictBooleanExpressionsCheck,
    "@ArkTS-eslint/semi-check": SemiCheck_1.SemiCheck,
    "@ArkTS-eslint/prefer-string-starts-ends-with-check": PreferStringStartsEndsWithCheck_1.PreferStringStartsEndsWithCheck,
    "@ArkTS-eslint/promise-function-async-check": PromiseFunctionAsyncCheck_1.PromiseFunctionAsyncCheck,
    "@ArkTS-eslint/keyword-spacing-check": KeywordSpacingCheck_1.KeywordSpacingCheck,
    "@ArkTS-eslint/func-call-spacing-check": FuncCallSpacingCheck_1.FuncCallSpacingCheck,
    "@ArkTS-eslint/method-signature-style-check": MethodSignatureStyleCheck_1.MethodSignatureStyleCheck,
    "@ArkTS-eslint/prefer-as-const-check": PreferAsConstCheck_1.PreferAsConstCheck,
    "@ArkTS-eslint/lines-between-class-members-check": LinesBetweenClassMembersCheck_1.LinesBetweenClassMembersCheck,
    "@ArkTS-eslint/member-delimiter-style-check": MemberDelimiterStyleCheck_1.MemberDelimiterStyleCheck,
    "@ArkTS-eslint/no-unsafe-return-check": NoUnsafeReturnCheck_1.NoUnsafeReturnCheck,
    "@ArkTS-eslint/no-use-before-define-check": NoUseBeforeDefineCheck_1.NoUseBeforeDefineCheck,
    "@ArkTS-eslint/prefer-readonly-check": PreferReadonlyCheck_1.PreferReadonlyCheck,
    "@ArkTS-eslint/quotes-check": QuotesCheck_1.QuotesCheck,
    "@ArkTS-eslint/prefer-optional-chain-check": PreferOptionalChainCheck_1.PreferOptionalChainCheck,
    "@ArkTS-eslint/no-trailing-spaces-check": NoTrailingSpacesCheck_1.NoTrailingSpacesCheck,
    "@ArkTS-eslint/no-implied-eval-check": NoImpliedEvalCheck_1.NoImpliedEvalCheck,
    "@ArkTS-eslint/prefer-includes-check": PreferIncludesCheck_1.PreferIncludesCheck,
    "@performance/array-definition-check": ArrayDefinitionCheck_1.ArrayDefinitionCheck,
    "@performance/avoid-empty-callback-check": AvoidEmptyCallbackCheck_1.AvoidEmptyCallbackCheck,
    "@performance/avoid-update-auto-state-var-in-aboutToReuse-check": AvoidUpdateAutoStateVarAboutToReuseCheck_1.AvoidUpdateAutoStateVarAboutToReuseCheck,
    "@performance/constant-property-referencing-check-in-loops": ConstantPropertyReferencingInLoopsCheck_1.ConstantPropertyReferencingInLoopsCheck,
    "@performance/effectkit-blur-check": EffectkitBlurCheck_1.EffectkitBlurCheck,
    "@performance/foreach-args-check": ForEachArgsCheck_1.ForeachArgsCheck,
    "@performance/foreach-index-check": ForeachIndexCheck_1.ForeachIndexCheck,
    "@performance/layout-properties-scale-check": LayoutPropertiesScaleCheck_1.LayoutPropertiesScaleCheck,
    "@performance/remove-redundant-state-var-check": RemoveRedundantStateVarCheck_1.RemoveRedundantStateVarCheck,
    "@performance/timezone-interface-check": TimezoneInterfaceCheck_1.TimezoneInterfaceCheck,
    "@performance/typed-array-check": TypedArrayCheck_1.TypedArrayCheck,
    "@performance/use-object-link-to-replace-prop-check": UseObjectLinkToReplacePropCheck_1.UseObjectLinkToReplacePropCheck,
    "@performance/web-cache-mode-check": WebCacheModeCheck_1.WebCacheModeCheck,
    "@performance/web-on-active-check": WebOnActiveCheck_1.WebOnActiveCheck,
    "@performance/sparse-array-check": SparseArrayCheck_1.SparseArrayCheck,
    "@performance/waterflow-data-preload-check": WaterFlowUpdateDataCheck_1.WaterFlowUpdateDataCheck,
    "@performance/union-type-array-check": UnionTypeArrayCheck_1.UnionTypeArrayCheck,
    "@performance/optional-parameters-check": OptionalParametersCheck_1.OptionalParametersCheck,
    "@performance/use-grid-layout-options-check": UseGridLayoutOptionsCheck_1.UseGridLayoutOptionsCheck,
    "@performance/remove-unchanged-state-var-check": RemoveUnchangedStateVarCheck_1.RemoveUnchangedStateVarCheck,
    "@performance/js-code-cache-by-precompile-check": JsCodeCacheByPrecompileCheck_1.JsCodeCacheByPrecompileCheck,
    "@performance/js-code-cache-by-interception-check": JsCodeCacheByInterceptionCheck_1.JsCodeCacheByInterceptionCheck,
    "@correctness/image-interpolation-check": ImageInterpolationCheck_1.ImageInterpolationCheck,
    "@correctness/image-pixel-format-check": ImagePixelFormatCheck_1.ImagePixelFormatCheck,
    "@performance/gif-hardware-decoding-check": GifHardwareDecodingCheck_1.GifHardwareDecodingCheck,
    "@performance/cache-avplayer-check": CacheAvplayerCheck_1.CacheAvplayerCheck,
    "@performance/color-overlay-effect-check": ColorOverlayEffectCheck_1.ColorOverlayEffectCheck,
    "@performance/combine-same-arg-animateto-check": CombineSameArgAnimatetoCheck_1.CombineSameArgAnimatetoCheck,
    "@performance/constant-check": ConstantCheck_1.ConstantCheck,
    "@performance/limit-refresh-scope-check": LimitRefreshScopeCheck_1.LimitRefreshScopeCheck,
    "@performance/load-on-demand-check": LoadOnDemandCheck_1.LoadOnDemandCheck,
    "@performance/no-state-var-access-in-loop-check": NoStateVarAccessInLoopCheck_1.NoStateVarAccessInLoopCheck,
    "@performance/no-use-any-export-current-check": NoUseAnyExportCurrentCheck_1.NoUseAnyExportCurrentCheck,
    "@performance/no-use-any-export-other-check": NoUseAnyExportOtherCheck_1.NoUseAnyExportOtherCheck,
    "@performance/remove-container-without-property-check": RemoveContainerWithoutPropertyCheck_1.RemoveContainerWithoutPropertyCheck,
    "@performance/replace-nested-reusable-component-by-builder-check": ReplaceNestedReusableComponentByBuilderCheck_1.ReplaceNestedReusableComponentByBuilderCheck,
    "@performance/suggest-reuseid-for-if-else-reusable-component-check": SuggestReuseidForlfElseReusableComponentCheck_1.SuggestReuseidForIfElseReusableComponentCheck,
    "@performance/use-attribute-updater-control-refresh-scope-check": UseAttributeUpdaterControlRefreshScopeCheck_1.UseAttributeUpdaterControlRefreshScopeCheck,
    "@performance/use-reusable-component-check": UseReusableComponentCheck_1.UseReusableComponentCheck,
    "@performance/web-resource-for-image-component-check": WebResourceForImageComponentCheck_1.WebResourceForImageComponentCheck,
    "@performance/module-top-level-code-check": ModuleTopLevelCodeCheck_1.ModuleTopLevelCodeCheck,
    "@performance/no-high-loaded-frame-rate-range": NoHighLoadedFrameRateRangeCheck_1.NoHighLoadedFrameRateRangeCheck,
    "@performance/lower-app-brightness-check": LowerAppBrightnessCheck_1.LowerAppBrightnessCheck,
    "@performance/stream-usage-api-check": StreamUsageApiCheck_1.StreamUsageApiCheck,
    "@performance/avoid-memory-leak-in-animator": AvoidMemoryLeakInAnimator_1.AvoidMemoryLeakInAnimator,
    "@performance/avoid-memory-leak-in-displaysync": AvoidMemoryLeakInDisplaysync_1.AvoidMemoryLeakInDisplaysync,
    "@security/no-unsafe-aes-check": NoUnsafeAesCheck_1.NoUnsafeAesCheck,
    "@security/no-unsafe-dh-check": NoUnsafeDhCheck_1.NoUnsafeDhCheck,
    "@security/no-unsafe-dh-key-check": NoUnsafeDhKeyCheck_1.NoUnsafeDhKeyCheck,
    "@security/no-unsafe-dsa-check": NoUnsafeDsaCheck_1.NoUnsafeDsaCheck,
    "@security/no-unsafe-dsa-key-check": NoUnsafeDsaKeyCheck_1.NoUnsafeDsaKeyCheck,
    "@security/no-unsafe-ecdsa-check": NoUnsafeEcdsaCheck_1.NoUnsafeEcdsaCheck,
    "@security/no-unsafe-hash-check": NoUnsafeHashCheck_1.NoUnsafeHashCheck,
    "@security/no-unsafe-mac-check": NoUnsafeMacCheck_1.NoUnsafeMacCheck,
    "@security/no-unsafe-rsa-encrypt-check": NoUnsafeRsaEncryptCheck_1.NoUnsafeRsaEncryptCheck,
    "@security/no-unsafe-rsa-key-check": NoUnsafeRsaKeyCheck_1.NoUnsafeRsaKeyCheck,
    "@security/no-unsafe-rsa-sign-check": NoUnsafeRsaSignCheck_1.NoUnsafeRsaSignCheck,
    "@cross-device-app-dev/one-multi-breakpoint-check": OneMultiBreakpointCheck_1.OneMultiBreakpointCheck,
    "@stability/avoid-inspector-interface-check": AvoidInspectorInterfaceCheck_1.AvoidInspectorInterfaceCheck,
    "@stability/await-time-sequence-normal-check": AwaitTimeSequenceNormalCheck_1.AwaitTimeSequenceNormalCheck,
    "@stability/ban-callback-operations-check": BanCallbackOperationsCheck_1.BanCallbackOperationsCheck,
    "@stability/call-addInput-before-addOutput-check": CallAddInputBeforeAddOutputCheck_1.CallAddInputBeforeAddOutputCheck,
    "@stability/camera-input-open-check": CameraInputOpenCheck_1.CameraInputOpenCheck,
    //software-security2026 start
    "@software-sec/checker19241042/command-execution-check": CommandExecutionCheck_1.CommandExecutionCheck
    //software-security2026 end
};
exports.projectRules = {
    '@correctness/audio-interrupt-check': AudioInterruptCheck_1.AudioInterruptCheck,
    '@performance/start-window-icon-check': StartWindowIconCheck_1.StartWindowIconCheck,
    '@correctness/audio-pause-or-mute-check': AudioPauseOrMuteCheck_1.AudioPauseOrMuteCheck,
    "@correctness/avsession-buttons-check": AvsessionButtonsCheck_1.AvsessionButtonsCheck,
    "@correctness/avsession-metadata-check": AvsessionMetadataCheck_1.AvsessionMetadataCheck,
    "@security/specified-interface-call-chain-check": SymbolUsageCheck_1.SymbolUsageCheck,
    "@performance/number-init-check": NumberInitCheck_1.NumberInitCheck,
    "@performance/image-sync-load-check": ImageSyncLoadCheck_1.ImageSyncLoadCheck,
    "@performance/list-in-scroll-check": ListInScrollCheck_1.ListInScrollCheck,
    "@performance/high-frequency-log-check": HighFrequencyLogCheck_1.HighFrequencyLogCheck,
    "@performance/lottie-animation-destroy-check": LottieAnimationDestoryCheck_1.LottieAnimationDestoryCheck,
    "@performance/multiple-associations-state-var-check": MultipleAssociationsStateVarCheck_1.MultipleAssociationsStateVarCheck,
    "@performance/set-cached-count-for-lazyforeach-check": SetCachedCountForLazyforeachCheck_1.SetCachedCountForLazyforeachCheck,
    "@performance/homepage-prepare-load-check": HomepagePrepareLoadCheck_1.HomepagePrepareLoadCheck,
    "@performance/image-format-check": ImageFormatCheck_1.ImageFormatCheck,
    "@performance/image-size-check": ImageSizeCheck_1.ImageSizeCheck,
    "@performance/page-prefetch-check": PagePrefetchCheck_1.PagePrefetchCheck,
    "@performance/resources-file-check": ResourcesFileCheck_1.ResourcesFileCheck,
    "@performance/dark-color-mode-check": DarkColorModeCheck_1.DarkColorModeCheck,
    "@security/no-cycle-check": NoCycleCheck_1.NoCycleCheck,
    "@stability/image-sync-blur-check": ImageSyncBlurCheck_1.ImageSyncBlurCheck,
    //software-security2026 start
    "@software-sec/checker23373456/command-execution-check": CommandExecutionCheck_2.CommandExecutionCheck,
    "@software-sec/checker23373456/hardcoded-secret-check": HardcodedSecretCheck_1.HardcodedSecretCheck,
    "@software-sec/checker23373456/sql-injection-check": SQLInjectionCheck_1.SQLInjectionCheck,
    "@software-sec/checker23373456/path-traversal-check": PathTraversalCheck_1.PathTraversalCheck
    //software-security2026 end
};
// 新增文件级的checker，需要在此处注册
exports.file2CheckRuleMap = new Map(Object.entries(exports.fileRules));
// 新增项目级checker，需要在此处注册
exports.project2CheckRuleMap = new Map(Object.entries(exports.projectRules));
class ProxyChecker {
    static getClass(ruleId) {
        const checker = exports.file2CheckRuleMap.get(ruleId) ?? exports.project2CheckRuleMap.get(ruleId);
        if (!checker) {
            logger.error(`${ruleId} is not matched to any checker`);
            return null;
        }
        return new checker();
    }
}
exports.ProxyChecker = ProxyChecker;
