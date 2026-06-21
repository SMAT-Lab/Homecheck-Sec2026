// http 明文通信

import { http } from '@ohos.net.http';



function fetchData() {
    let httpRequest = http.createHttp();
    httpRequest.request("http://example.com/api/data", {
        method: http.RequestMethod.GET
    });
}
