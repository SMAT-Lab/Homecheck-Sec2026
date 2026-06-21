import { geoLocationManager } from '@ohos.geoLocationManager';

class Tracker {
    getDeviceLocation() {
        // 危险：直接调 getCurrentLocation，没有调 atManager.checkAccessToken()
        geoLocationManager.getCurrentLocation({
            latitude: 0,
            longitude: 0
        }, (err, location) => {
            if (err) return;
            console.log('Location: ' + JSON.stringify(location));
        });
    }
}
