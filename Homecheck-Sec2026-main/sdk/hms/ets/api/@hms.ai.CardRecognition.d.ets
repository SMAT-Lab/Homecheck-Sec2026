/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024-2024. All rights reserved.
 */
/**
 * @file This module provides card recognition component.
 * @kit VisionKit
 */
import { Callback } from '@ohos.base';
/**
 * This is a ui component used to identify card
 * @struct { CardRecognition }
 * @syscap SystemCapability.AI.Component.CardRecognition
 * @atomicservice
 * @since 5.0.0(12)
 */
@Component
declare struct CardRecognition {
    /**
     * Supported card identification types.
     * @type { CardType }
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    supportType: CardType;
    /**
     * Card side to recognize.
     * @type { ?CardSide }
     * @default CardSide.DEFAULT
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    cardSide?: CardSide;
    /**
     * Card recognition result callback.
     * @type { Callback<CallbackParam> }
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    callback: Callback<CallbackParam>;
    /**
     * Card recognition config.
     * @type { ?CardRecognitionConfig }
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    cardRecognitionConfig?: CardRecognitionConfig;
    /**
     * Constructor used to create a <b>CardRecognition</b> object.
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    build(): void;
}
/**
 * Supported card identification types.
 *
 * @enum { number }
 * @syscap SystemCapability.AI.Component.CardRecognition
 * @atomicservice
 * @since 5.0.0(12)
 */
declare enum CardType {
    /**
     * Card recognition automatic mode.
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    CARD_AUTO = 0,
    /**
     * ID card.
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    CARD_ID = 1,
    /**
     * Bank card.
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    CARD_BANK = 2,
    /**
     * Passport.
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    CARD_PASSPORT = 3,
    /**
     * Driver license.
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    CARD_DRIVER_LICENSE = 4,
    /**
     * Vehicle license.
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    CARD_VEHICLE_LICENSE = 5
}
/**
 * Card side to recognize.
 *
 * @enum { number }
 * @syscap SystemCapability.AI.Component.CardRecognition
 * @atomicservice
 * @since 5.0.0(12)
 */
declare enum CardSide {
    /**
     * Front side.
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    FRONT = 0,
    /**
     * Back side.
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    BACK = 1,
    /**
     * Default side.
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    DEFAULT = 2
}
/**
 * This is the card recognition result callback.
 * @typedef CallbackParam
 * @syscap SystemCapability.AI.Component.CardRecognition
 * @atomicservice
 * @since 5.0.0(12)
 */
declare interface CallbackParam {
    /**
     * Card recognition results.
     * @type { number }
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    code: number;
    /**
     * Card recognition type.
     * @type { ?CardType }
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    cardType?: CardType;
    /**
     * Card recognition card info.
     * @type { ?Record<string, Record<string, string>> }
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    cardInfo?: Record<string, Record<string, string>>;
}
/**
 * This is the card recognition config.
 * @typedef CardRecognitionConfig
 * @syscap SystemCapability.AI.Component.CardRecognition
 * @atomicservice
 * @since 5.0.0(12)
 */
declare interface CardRecognitionConfig {
    /**
     * Default shooting mode.
     * @type { ?ShootingMode }
     * @default ShootingMode.MANUAL
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    defaultShootingMode?: ShootingMode;
    /**
     * Whether support selecting photos.
     * @type { ?boolean }
     * @default true
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    isPhotoSelectionSupported?: boolean;
    /**
     * Card recognition content config.
     * @type { ?CardContentConfig }
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    cardContentConfig?: CardContentConfig;
}
/**
 * Enum for shooting mode, whether shoot automatically or manually.
 *
 * @enum { number }
 * @syscap SystemCapability.AI.Component.CardRecognition
 * @atomicservice
 * @since 5.0.0(12)
 */
declare enum ShootingMode {
    /**
     * Auto shoot
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    AUTO = 0,
    /**
     * Manual shoot
     *
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    MANUAL = 1
}
/**
 * This is the card recognition content config.
 * @typedef CardContentConfig
 * @syscap SystemCapability.AI.Component.CardRecognition
 * @atomicservice
 * @since 5.0.0(12)
 */
declare interface CardContentConfig {
    /**
     * Card content config for bank card.
     * @type { ?BankCardConfig }
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    bankCard?: BankCardConfig;
}
/**
 * Specific configuration of bank card.
 * @typedef BankCardConfig
 * @syscap SystemCapability.AI.Component.CardRecognition
 * @atomicservice
 * @since 5.0.0(12)
 */
declare interface BankCardConfig {
    /**
     * Whether show the bank number confirm dialog after recognition.
     * @type { ?boolean }
     * @default true
     * @syscap SystemCapability.AI.Component.CardRecognition
     * @atomicservice
     * @since 5.0.0(12)
     */
    isBankNumberDialogShown?: boolean;
}
export { CardRecognition, CardType, CardSide, CallbackParam, CardRecognitionConfig, ShootingMode, CardContentConfig, BankCardConfig };
