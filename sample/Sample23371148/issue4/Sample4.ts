// ./sample/Sample19241042/Issue4/sample4.ts
// Code Sample with Security Issue 4: Insecure Permissions
import { permissions } from '@ohos.app.ability.common';
import { abilityAccessCtrl } from '@ohos.abilityAccessCtrl';

class PermissionManager {
    requestAllPermissions() {
        // 危险：一次性请求过多权限
        permissions.requestPermissions([
            'ohos.permission.READ_CONTACTS',
            'ohos.permission.WRITE_CONTACTS',
            'ohos.permission.ACCESS_FINE_LOCATION',
            'ohos.permission.ACCESS_COARSE_LOCATION',
            'ohos.permission.CAMERA',
            'ohos.permission.RECORD_AUDIO',
            'ohos.permission.READ_MEDIA',
            'ohos.permission.WRITE_MEDIA'
        ]);
    }
    
    checkPermissionOnly() {
        // 危险：只检查权限但不处理拒绝情况
        let atManager = abilityAccessCtrl.createAtManager();
        atManager.checkAccessToken(0, 'ohos.permission.CAMERA');
        // 没有处理权限被拒绝的情况
    }
}

function safeExample() {
    // 安全：按需请求权限，并处理拒绝
    // permissions.requestPermissions(['ohos.permission.CAMERA'], (result) => {
    //     if (result === 0) { /* 处理授权 */ }
    // });
}