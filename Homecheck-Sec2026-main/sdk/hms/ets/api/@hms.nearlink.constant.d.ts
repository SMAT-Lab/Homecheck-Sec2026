/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024. All rights reserved.
 */
/**
 * @file The module provides the constant definitions.
 * @kit NearLinkKit
 */
/**
 * The definition of constant.
 *
 * @namespace constant
 * @syscap SystemCapability.Communication.NearLink.Core
 * @since 5.0.1(13)
 */
declare namespace constant {
    /**
     * The enum of pair state.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    export enum PairingState {
        /**
         * Indicate the pair state is none.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        PAIRING_STATE_NONE = 1,
        /**
         * Indicate the pair state is pairing.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        PAIRING_STATE_PAIRING = 2,
        /**
         * Indicate the pair state is paired.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        PAIRING_STATE_PAIRED = 3
    }
    /**
     * The enum of connection state.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    export enum ConnectionState {
        /**
         * the current profile is being connected
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        STATE_CONNECTING = 0,
        /**
         * the current is connected
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        STATE_CONNECTED = 1,
        /**
         * the current is being disconnected
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        STATE_DISCONNECTING = 2,
        /**
         * the current is disconnected
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        STATE_DISCONNECTED = 3
    }
    /**
     * The enum of device class.
     *
     * @enum { number }
     * @syscap SystemCapability.Communication.NearLink.Core
     * @since 5.0.1(13)
     */
    export enum DeviceClass {
        /**
         * Unclassified device.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_UNCATEGORIZED = 0x000100,
        /**
         * General phone.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_PHONE = 0x000200,
        /**
         * Smartphone.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_SMARTPHONE = 0x000201,
        /**
         * General computer.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_COMPUTER = 0x000300,
        /**
         * Laptop.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_LAPTOP = 0x000301,
        /**
         * Tablet.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_TABLET = 0x000302,
        /**
         * All-in-one computer.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_ALL_IN_ONE_COMPUTER = 0x000303,
        /**
         * Mini PC.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_MINI_PC = 0x000304,
        /**
         * General watch.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_WATCH = 0x000400,
        /**
         * Smart watch.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_SMART_WATCH = 0x000401,
        /**
         * General human interface device.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_HUMAN_INTERFACE = 0x000500,
        /**
         * Keyboard.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_KEYBOARD = 0x000501,
        /**
         * Mouse.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_MOUSE = 0x000502,
        /**
         * Handle.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_HANDLE = 0x000503,
        /**
         * Stylus pen.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_STYLUS = 0x000504,
        /**
         * Touchpad.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_TOUCHPAD = 0x000505,
        /**
         * General audio playback device.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_AUDIO_PLAYBACK = 0x000600,
        /**
         * Smart speaker.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_SMART_SPEAKER = 0x000601,
        /**
         * Echo Wall.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_ECHO_WALL = 0x000602,
        /**
         * General audio capture device.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_AUDIO_CAPTURE = 0x000700,
        /**
         * Karaoke microphone.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_KARAOKE_MICROPHONE = 0x000701,
        /**
         * Lapel Microphone.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_LAPEL_MICROPHONE = 0x000702,
        /**
         * General wearable audio device.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_WEARABLE_AUDIO = 0x000800,
        /**
         * In-ear earphone.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_IN_EAR_EARPHONE = 0x000801,
        /**
         * Headset.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_HEADSET = 0x000802,
        /**
         * Over-ear headphone.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_OVER_EAR_HEADPHONE = 0x000803,
        /**
         * Neck-worn earphone.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_NECKBAND_EARPHONE = 0x000804,
        /**
         * General personal care.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_PERSONAL_CARE = 0x000900,
        /**
         * Intelligent toothbrush.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_INTELLIGENT_TOOTHBRUSH = 0x000901,
        /**
         * Smart cup.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_SMART_CUP = 0x000902,
        /**
         * Intelligent shaver.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_INTELLIGENT_SHAVER = 0x000903,
        /**
         * General HVAC.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_HVAC = 0x000A00,
        /**
         * Air purifier.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_AIR_PURIFIER = 0x000A01,
        /**
         * Humidifier.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_HUMIDIFIER = 0x000A02,
        /**
         * Air circulation fan.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_AIR_CIRCULATION_FAN = 0x000A03,
        /**
         * General electric riding.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_ELECTRIC_RIDE = 0x000B00,
        /**
         * Electric scooter.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_ELECTRIC_SCOOTER = 0x000B01,
        /**
         * Electric bicycle.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_ELECTRIC_BICYCLE = 0x000B02,
        /**
         * General light fitting.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_LIGHT_FITTING = 0x000C00,
        /**
         * Smart table lamp.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_SMART_TABLE_LAMP = 0x000C01,
        /**
         * General remote control.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_REMOTE_CONTROL = 0x000D00,
        /**
         * TV remote control.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_TV_REMOTE_CONTROL = 0x000D01,
        /**
         * General imaging device.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_IMAGING = 0x000E00,
        /**
         * Smart TV.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_SMART_TV = 0x000E01,
        /**
         * IP camera.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_IP_CAMERA = 0x000E02,
        /**
         * Screen caster.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_SCREEN_CASTER = 0x000E03,
        /**
         * General network device.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_NETWORKING = 0x000F00,
        /**
         * IoT gateway.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_IOT_GATEWAY = 0x000F01,
        /**
         * General access control.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_ACCESS_CONTROL = 0x001000,
        /**
         * Intelligent Lock.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_INTELLIGENT_LOCK = 0x001001,
        /**
         * Smart key.
         *
         * @syscap SystemCapability.Communication.NearLink.Core
         * @since 5.0.1(13)
         */
        DEVICE_SMART_KEY = 0x001002
    }
}
export default constant;
