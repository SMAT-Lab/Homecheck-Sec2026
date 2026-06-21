/*
 * Copyright (c) 2024 Huawei Device Co., Ltd. All rights reserved.
 */
/**
 * @file This module provides the capabilities to security audit.
 * @kit DeviceSecurityKit
 */
import type { Callback } from '@ohos.base';
/**
 * The module providers the capability for security audit events.
 *
 * @namespace securityAudit
 * @syscap SystemCapability.Security.SecurityAudit
 * @since 5.0.0(12)
 */
declare namespace securityAudit {
    /**
     * Provides the audit event information, including the eventId, version, timestamp, content, userId and deviceId.
     *
     * @interface AuditEvent
     * @syscap SystemCapability.Security.SecurityAudit
     * @since 5.0.0(12)
     */
    interface AuditEvent {
        /**
         * The event id.
         *
         * @type { number }
         * @syscap SystemCapability.Security.SecurityAudit
         * @since 5.0.0(12)
         */
        eventId: number;
        /**
         * The event version.
         *
         * @type { ?string }
         * @syscap SystemCapability.Security.SecurityAudit
         * @since 5.0.0(12)
         */
        version?: string;
        /**
         * The event timestamp, format is YYYYMMDDHHMMSS.
         *
         * @type { ?string }
         * @syscap SystemCapability.Security.SecurityAudit
         * @since 5.0.0(12)
         */
        timestamp?: string;
        /**
         * The event content.
         *
         * @type { ?string }
         * @syscap SystemCapability.Security.SecurityAudit
         * @since 5.0.0(12)
         */
        content?: string;
        /**
         * The event user id.
         *
         * @type { ?number }
         * @syscap SystemCapability.Security.SecurityAudit
         * @since 5.0.0(12)
         */
        userId?: number;
        /**
         * The event device id.
         *
         * @type { ?string }
         * @syscap SystemCapability.Security.SecurityAudit
         * @since 5.0.0(12)
         */
        deviceId?: string;
    }
    /**
     * Provides the conditions of on/off.
     *
     * @interface AuditEventInfo
     * @syscap SystemCapability.Security.SecurityAudit
     * @since 5.0.0(12)
     */
    interface AuditEventInfo {
        /**
         * The security event id.
         *
         * @type { number }
         * @syscap SystemCapability.Security.SecurityAudit
         * @since 5.0.0(12)
         */
        eventId: number;
    }
    /**
     * Subscribe the audit event.
     *
     * @permission ohos.permission.QUERY_AUDIT_EVENT
     * @param { 'auditEventOccur' } type
     * @param { AuditEventInfo } auditEventInfo - Indicates the subscribed event information.
     * @param { Callback<AuditEvent> } callback - Indicates the listener when the audit event occurs.
     * @throws { BusinessError } 201 - check permission fail.
     * @throws { BusinessError } 401 - invalid parameters.
     * Possible causes:
     *   1. Mandatory parameters are left unspecified.
     *   2. Incorrect parameter types.
     *   3. Parameter verification failed.
     * @syscap SystemCapability.Security.SecurityAudit
     * @since 5.0.0(12)
     */
    function on(type: 'auditEventOccur', auditEventInfo: AuditEventInfo, callback: Callback<AuditEvent>): void;
    /**
     * Unsubscribe the audit event.
     *
     * @permission ohos.permission.QUERY_AUDIT_EVENT
     * @param { 'auditEventOccur' } type
     * @param { AuditEventInfo } auditEventInfo - Indicates the subscribed event information.
     * @param { Callback<AuditEvent> } callback - Indicates the listener when the audit event occurs.
     * @throws { BusinessError } 201 - check permission fail.
     * @throws { BusinessError } 401 - invalid parameters.
     * Possible causes:
     *   1. Mandatory parameters are left unspecified.
     *   2. Incorrect parameter types.
     *   3. Parameter verification failed.
     * @syscap SystemCapability.Security.SecurityAudit
     * @since 5.0.0(12)
     */
    function off(type: 'auditEventOccur', auditEventInfo: AuditEventInfo, callback?: Callback<AuditEvent>): void;
}
export default securityAudit;
