import { cryptoFramework } from '@ohos.security.cryptoFramework';

function hashData(data: string) {
    // 危险：使用已不安全的 MD5
    let md5 = cryptoFramework.createMd("MD5");
    md5.update({ data: data });
    let result = md5.digest();
    return result;
}

function signPayload(payload: string) {
    // 危险：使用已不安全的 SHA-1
    let sha1 = cryptoFramework.createMd("SHA1");
    sha1.update({ data: payload });
    return sha1.digest();
}
