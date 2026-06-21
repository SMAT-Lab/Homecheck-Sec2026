/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2023-2023. All rights reserved.
 */
/**
 * @file This module provides the capabilities to use E-CNY payment service.
 * @kit PaymentKit
 */
import type common from '@ohos.app.ability.common';
/**
 * This module provides the capabilities to use E-CNY payment service.
 *
 * @namespace ecnyPaymentService
 * @syscap SystemCapability.Payment.ECNYPaymentService
 * @stagemodelonly
 * @atomicservice
 * @since 5.0.1(13)
 */
declare namespace ecnyPaymentService {
    /**
     * Pull up checkout of E-CNY payment
     *
     * @param { common.Context } context - The context of an ability.
     * @param { EcnyOrderInfo } orderInfo - order information
     * @returns { Promise<EcnyPayResult> } - Promise used to return the result.
     * @throws { BusinessError } 401 - Parameter error.
     * @throws { BusinessError } 1014900000 - The operation was canceled by the user.
     * @throws { BusinessError } 1014900001 - Payment failed.
     * @throws { BusinessError } 1014900002 - The transaction has been processed.
     * @throws { BusinessError } 1014900003 - Duplicate request.
     * @throws { BusinessError } 1014900004 - Network connection error.
     * @throws { BusinessError } 1014900005 - The payment environment is not ready.
     * @syscap SystemCapability.Payment.ECNYPaymentService
     * @stagemodelonly
     * @atomicservice
     * @since 5.0.1(13)
     */
    function requestEcnyPayment(context: common.Context, orderInfo: EcnyOrderInfo): Promise<EcnyPayResult>;
    /**
     * Order information of E-CNY Payment API
     *
     * @typedef EcnyOrderInfo
     * @syscap SystemCapability.Payment.ECNYPaymentService
     * @stagemodelonly
     * @atomicservice
     * @since 5.0.1(13)
     */
    interface EcnyOrderInfo {
        /**
         * The merchant app ID
         *
         * @type { string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        merchantAppId: string;
        /**
         * The merchant number
         *
         * @type { string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        merchantNo: string;
        /**
         * Acquiring Agent Institution Identification
         *
         * @type { ?string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        acqAgtInstnId?: string;
        /**
         * Creditor Institution Identification
         *
         * @type { string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        creditorInstitutionId: string;
        /**
         * The key ciphertext which is encrypted using the public key of the creditor institution
         *
         * @type { string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        encryptedKey: string;
        /**
         * The order information which is encrypted by encryptedKey
         *
         * @type { string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        encryptedInfo: string;
        /**
         * The serial number of encryption certificate
         *
         * @type { ?string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        encryptionSN?: string;
        /**
         * The last four digits of wallet ID
         *
         * @type { ?string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        lastWalletId?: string;
        /**
         * This parameter is used to pass the extra fields set by a merchant in a JSON string in the key:value format.
         *
         * @type { ?string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        extraInfo?: string;
    }
    /**
     * The Result of E-CNY payment
     *
     * @typedef EcnyPayResult
     * @syscap SystemCapability.Payment.ECNYPaymentService
     * @stagemodelonly
     * @atomicservice
     * @since 5.0.1(13)
     */
    interface EcnyPayResult {
        /**
         * Order number
         *
         * @type { string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        orderNo: string;
        /**
         * This parameter is used to return the extra fields in a JSON string in the key:value format.
         *
         * @type { ?string }
         * @syscap SystemCapability.Payment.ECNYPaymentService
         * @stagemodelonly
         * @atomicservice
         * @since 5.0.1(13)
         */
        extraInfo?: string;
    }
}
export default ecnyPaymentService;
