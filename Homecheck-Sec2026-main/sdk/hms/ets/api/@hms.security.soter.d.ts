/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved.
 */
/**
 * @file This module provides the capabilities to use SOTER online authentication.
 * @kit OnlineAuthenticationKit
 */
/**
 * Support the SOTER protocol, provide platform infrastructure to support password-free payment, support super
 * application ecosystem capabilities, and improve system security and user experience.
 *
 * @namespace soter
 * @syscap SystemCapability.Security.SOTER
 * @atomicservice
 * @since 5.0.0(12)
 */
declare namespace soter {
    /**
   * Enum for key type.
   *
   * @enum { number }
   * @syscap SystemCapability.Security.SOTER
   * @since 5.0.0(12)
   */
    export enum KeyType {
        /**
         * ECC P256 TYPE
         * @syscap SystemCapability.Security.SOTER
         * @since 5.0.0(12)
         */
        ECC_P256 = 0
    }
    /**
   * The class of an signed result.
   *
   * @syscap SystemCapability.Security.SOTER
   * @since 5.0.0(12)
   */
    class SignedResult {
        /**
         * Original message.
         *
         * @type { Uint8Array }
         * @syscap SystemCapability.Security.SOTER
         * @since 5.0.0(12)
         * */
        message: Uint8Array;
        /**
         * Signed message.
         *
         * @type { Uint8Array }
         * @syscap SystemCapability.Security.SOTER
         * @since 5.0.0(12)
         * */
        signature: Uint8Array;
        /**
         * Salt length.
         *
         * @type { number }
         * @syscap SystemCapability.Security.SOTER
         * @since 5.0.0(12)
         * */
        saltLength: number;
    }
    /**
      * Generate application secure key.
      *
      * @param { keyType } KeyType - The type of key.
      * @returns { Uint8Array } Certificate chain with applictaion sercure key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function generateAppSecureKeySync(keyType: KeyType): Uint8Array;
    /**
      * Generate application secure key.
      *
      * @param { keyType } KeyType - The type of key.
      * @returns { Promise<Uint8Array> } Certificate chain with applictaion sercure key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function generateAppSecureKey(keyType: KeyType): Promise<Uint8Array>;
    /**
      * Get application secure key.
      *
      * @param { keyType } KeyType - The type of key.
      * @returns { Uint8Array } Certificate chain with applictaion sercure key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function getAppSecureKeySync(keyType: KeyType): Uint8Array;
    /**
      * Get application secure key.
      *
      * @param { keyType } KeyType - The type of key.
      * @returns { Promise<Uint8Array> } Certificate chain with applictaion sercure key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function getAppSecureKey(keyType: KeyType): Promise<Uint8Array>;
    /**
      * Query whether app secure key exists.
      *
      * @param { keyType } KeyType - The type of key.
      * @returns { boolean } The existence of appliation secure key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function hasAppSecureKeySync(keyType: KeyType): boolean;
    /**
      * Query whether app secure key exists.
      *
      * @param { keyType } KeyType - The type of key.
      * @returns { Promise<boolean> } The existence of appliation secure key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function hasAppSecureKey(keyType: KeyType): Promise<boolean>;
    /**
      * Generate auth key with alias.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @param { keyType } KeyType - The type of key.
      * @returns { SignedResult } Signed result with auth key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function generateAuthKeySync(keyAlias: string, keyType: KeyType): SignedResult;
    /**
      * Generate auth key with alias.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @param { keyType } KeyType - The type of key.
      * @returns { Promise<SignedResult> } Signed result with auth key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function generateAuthKey(keyAlias: string, keyType: KeyType): Promise<SignedResult>;
    /**
      * Get auth key by alias.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @param { keyType } KeyType - The type of key.
      * @returns { SignedResult } Signed result with auth key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function getAuthKeySync(keyAlias: string, keyType: KeyType): SignedResult;
    /**
      * Get auth key by alias.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @param { keyType } KeyType - The type of key.
      * @returns { Promise<SignedResult> } Signed result with auth key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function getAuthKey(keyAlias: string, keyType: KeyType): Promise<SignedResult>;
    /**
      * Query whether the auth key exists by alias.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @param { keyType } KeyType - The type of key.
      * @returns { boolean } The existence of auth key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function hasAuthKeySync(keyAlias: string, keyType: KeyType): boolean;
    /**
      * Query whether the auth key exists by alias.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @param { keyType } KeyType - The type of key.
      * @returns { Promise<boolean> } The existence of auth key.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function hasAuthKey(keyAlias: string, keyType: KeyType): Promise<boolean>;
    /**
      * Generate challenge used for authentication request.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @returns { Uint8Array } Challenge.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function generateChallengeSync(keyAlias: string): Uint8Array;
    /**
      * Generate challenge used for authentication request.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @returns { Promise<Uint8Array> } Challenge.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function generateChallenge(keyAlias: string): Promise<Uint8Array>;
    /**
      * Sign with an auth key.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @param { authToken } Uint8Array - Result of the biometric authentication.
      * @param { info } string - Data to be signed by auth key. The info cannot exceed 511 characters.
      * @returns { SignedResult } Signed result.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function signWithAuthKeySync(keyAlias: string, authToken: Uint8Array, info: string): SignedResult;
    /**
      * Sign with an auth key.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @param { authToken } Uint8Array - Result of the biometric authentication.
      * @param { info } string - Data to be signed by auth key. The info cannot exceed 511 characters.
      * @returns { Promise<SignedResult> } Signed result.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function signWithAuthKey(keyAlias: string, authToken: Uint8Array, info: string): Promise<SignedResult>;
    /**
      * Delete auth key by alias.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function deleteAuthKeySync(keyAlias: string): void;
    /**
      * Delete auth key by alias.
      *
      * @param { keyAlias } string - Key alias. The keyAlias cannot exceed 31 characters.
      * @returns { Promise<void> } the promise returned by the function.
      * @throws { BusinessError } 401 - Parameter error. Possible causes:
      *                   1. Mandatory parameters are left unspecified.
      *                   2. Parameter verification failed.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function deleteAuthKey(keyAlias: string): Promise<void>;
    /**
      * Delete application secure key.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function deleteAppSecureKeySync(): void;
    /**
      * Delete application secure key.
      * @returns { Promise<void> } the promise returned by the function.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function deleteAppSecureKey(): Promise<void>;
    /**
      * Get SOTER version.
      * @returns { string } SOTER version.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function getVersionSync(): string;
    /**
      * Get SOTER version.
      * @returns { Promise<string> } SOTER version.
      * @throws { BusinessError } 1014500001 - The service is abnormal.
      * @syscap SystemCapability.Security.SOTER
      * @atomicservice
      * @since 5.0.0(12)
      */
    function getVersion(): Promise<string>;
}
export default soter;
