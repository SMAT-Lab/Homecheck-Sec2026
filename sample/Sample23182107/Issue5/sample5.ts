// Issue5: 将不可信 HTML 写入 innerHTML 可导致 XSS
function renderRemote(htmlFromServer: string): void {
    const host: ESObject = { innerHTML: '' };
    host.innerHTML = htmlFromServer;
}
