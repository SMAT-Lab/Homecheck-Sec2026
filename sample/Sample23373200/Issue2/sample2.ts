function login(username: string, password: string) {
    // 危险：将密码输出到日志
    console.info(`User ${username} login with password: ${password}`);
    authenticate(username, password);
}

function fetchData(token: string) {
    // 危险：将 token 输出到日志
    console.log('Fetching with token: ' + token);
    api.getData(token);
}
