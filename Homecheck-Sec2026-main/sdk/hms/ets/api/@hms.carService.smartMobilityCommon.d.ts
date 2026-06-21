/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2024-2024. All rights reserved.
 */
/**
 * @file This module provides the common capability to smart mobility.
 * @kit CarKit
 */
import { Callback } from '@kit.BasicServicesKit';
/**
 * @namespace smartMobilityCommon
 * @syscap SystemCapability.CarService.DistributedEngine
 * @since 5.0.0(12)
 */
declare namespace smartMobilityCommon {
    /**
     * Get single instance of SmartMobilityAwareness.
     *
     * @permission ohos.permission.ACCESS_CAR_DISTRIBUTED_ENGINE
     * @returns { SmartMobilityAwareness } - SmartMobilityAwareness instance.
     * @throws { BusinessError } 201 - Permission verify failed.
     * @syscap SystemCapability.CarService.DistributedEngine
     * @since 5.0.0(12)
     */
    function getSmartMobilityAwareness(): SmartMobilityAwareness;
    /**
     * The application uses this interface to get and register for SmartMobility listening.
     * @syscap SystemCapability.CarService.DistributedEngine
     * @since 5.0.0(12)
     */
    class SmartMobilityAwareness {
        /**
         * Registers callback to smart mobility status change.
         *
         * @permission ohos.permission.ACCESS_CAR_DISTRIBUTED_ENGINE
         * @param { 'smartMobilityStatus' } type - SmartMobility status.
         * @param { SmartMobilityType[] } smartMobilityTypes - Subscription types.
         * @param { Callback<SmartMobilityInfo> } callback
         * Indicates the device SmartMobility status to register.
         * @throws { BusinessError } 201 - Permission verify failed.
         * @throws { BusinessError } 401 - Parameter error. Possible causes:
         *                                                  1. Mandatory parameters are left unspecified;
         *                                                  2. Incorrect parameter type;
         *                                                  3. Parameter verification failed;
         *                                                  4. The size of specified type is greater than 255.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        on(type: 'smartMobilityStatus', smartMobilityTypes: SmartMobilityType[], callback: Callback<SmartMobilityInfo>): void;
        /**
         * UnRegister callback to smart mobility status change.
         *
         * @permission ohos.permission.ACCESS_CAR_DISTRIBUTED_ENGINE
         * @param { 'smartMobilityStatus' } type - SmartMobility status.
         * @param { SmartMobilityType[] } smartMobilityTypes - Unsubscription types.
         * @param { Callback<SmartMobilityInfo> } callback
         * Indicates the device discovery callback to unregister.
         * @throws { BusinessError } 201 - Permission verify failed.
         * @throws { BusinessError } 401 - Parameter error. Possible causes:
         *                                                  1. Mandatory parameters are left unspecified;
         *                                                  2. Incorrect parameter type;
         *                                                  3. Parameter verification failed;
         *                                                  4. The size of specified type is greater than 255.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        off(type: 'smartMobilityStatus', smartMobilityTypes: SmartMobilityType[], callback?: Callback<SmartMobilityInfo>): void;
        /**
         * Registers callback to smart mobility event.
         *
         * @permission ohos.permission.ACCESS_CAR_DISTRIBUTED_ENGINE
         * @param { 'smartMobilityEvent' } type - SmartMobility event.
         * @param { SmartMobilityType[] } smartMobilityTypes - Subscription types.
         * @param { Callback<SmartMobilityEvent> } callback
         * Indicates the device SmartMobility event to register.
         * @throws { BusinessError } 201 - Permission verify failed.
         * @throws { BusinessError } 401 - Parameter error. Possible causes:
         *                                                  1. Mandatory parameters are left unspecified;
         *                                                  2. Incorrect parameter type;
         *                                                  3. Parameter verification failed;
         *                                                  4. The size of specified type is greater than 255.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        on(type: 'smartMobilityEvent', smartMobilityTypes: SmartMobilityType[], callback: Callback<SmartMobilityEvent>): void;
        /**
         * UnRegisters callback to smart mobility event.
         *
         * @permission ohos.permission.ACCESS_CAR_DISTRIBUTED_ENGINE
         * @param { 'smartMobilityEvent' } type - SmartMobility event.
         * @param { SmartMobilityType[] } smartMobilityTypes - Unsubscription types.
         * @param { Callback<SmartMobilityEvent> } callback
         * Indicates the device SmartMobility event to register.
         * @throws { BusinessError } 201 - Permission verify failed.
         * @throws { BusinessError } 401 - Parameter error. Possible causes:
         *                                                  1. Mandatory parameters are left unspecified;
         *                                                  2. Incorrect parameter type;
         *                                                  3. Parameter verification failed;
         *                                                  4. The size of specified type is greater than 255.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        off(type: 'smartMobilityEvent', smartMobilityTypes: SmartMobilityType[], callback?: Callback<SmartMobilityEvent>): void;
        /**
         * Get SmartMobility status.
         * @permission ohos.permission.ACCESS_CAR_DISTRIBUTED_ENGINE
         * @param { SmartMobilityType } type - Indicates the query type.
         * @returns { SmartMobilityInfo } - Smart mobility info.
         * @throws { BusinessError } 201 - Permission verify failed.
         * @throws { BusinessError } 401 - Parameter error. Possible causes:
         *                                                  1. Mandatory parameters are left unspecified;
         *                                                  2. Incorrect parameter type;
         *                                                  3. Parameter verification failed;
         *                                                  4. The size of specified type is greater than 255.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        getSmartMobilityStatus(type: SmartMobilityType): SmartMobilityInfo;
        /**
         * Get SmartMobility event.
         * @permission ohos.permission.ACCESS_CAR_DISTRIBUTED_ENGINE
         * @param { SmartMobilityType } type - Indicates the query type.
         * @param { string } eventName - Indicates the event name.
         * @returns { SmartMobilityEvent } - Smart mobility event.
         * @throws { BusinessError } 201 - Permission verify failed.
         * @throws { BusinessError } 401 - Parameter error. Possible causes:
         *                                                  1. Mandatory parameters are left unspecified;
         *                                                  2. Incorrect parameter type;
         *                                                  3. Parameter verification failed;
         *                                                  4. The size of specified type is greater than 255.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        getSmartMobilityEvent(type: SmartMobilityType, eventName: string): SmartMobilityEvent;
    }
    /**
     * SmartMobility info.
     * @typedef SmartMobilityInfo
     * @syscap SystemCapability.CarService.DistributedEngine
     * @since 5.0.0(12)
     */
    interface SmartMobilityInfo {
        /**
         * SmartMobility service status.
         * @type { SmartMobilityStatus }
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        status: SmartMobilityStatus;
        /**
         * SmartMobility service type.
         * @type { SmartMobilityType }
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        type: SmartMobilityType;
        /**
         * Additional Data.For example,HiCar and SuperLauncher is displayId
         * @type { Record<string, Object> }
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        data: Record<string, Object>;
    }
    /**
     * SmartMobility event.
     * @typedef SmartMobilityEvent
     * @syscap SystemCapability.CarService.DistributedEngine
     * @since 5.0.0(12)
     */
    interface SmartMobilityEvent {
        /**
         * SmartMobility event name.
         * @type { string }
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        eventName: string;
        /**
         * SmartMobility service type.
         * @type { SmartMobilityType }
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        type: SmartMobilityType;
        /**
         * Additional Data.
         * @type { Record<string, Object> }
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        data: Record<string, Object>;
    }
    /**
     * SmartMobility service status.
     * @enum { number }
     * @syscap SystemCapability.CarService.DistributedEngine
     * @since 5.0.0(12)
     */
    enum SmartMobilityStatus {
        /**
         * SmartMobility service is in idle status.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        IDLE = 0,
        /**
         * SmartMobility service is in running status.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        RUNNING = 1
    }
    /**
     * SmartMobility service type.
     * @enum { number }
     * @syscap SystemCapability.CarService.DistributedEngine
     * @since 5.0.0(12)
     */
    enum SmartMobilityType {
        /**
         * SmartMobility service is hicar.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        HICAR = 0,
        /**
         * SmartMobility service is superlauncher.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        SUPER_LAUNCHER = 1,
        /**
         * SmartMobility service is car hop.
         * @syscap SystemCapability.CarService.DistributedEngine
         * @since 5.0.0(12)
         */
        CAR_HOP = 2
    }
}
export default smartMobilityCommon;
