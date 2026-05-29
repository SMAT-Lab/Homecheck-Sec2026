// Hardcoded credential sample
const API_KEY = "ABCD-1234-SECRET-KEY";

function callService() {
    http.post('/api', { headers: { 'x-api-key': API_KEY } });
}

export { callService };
