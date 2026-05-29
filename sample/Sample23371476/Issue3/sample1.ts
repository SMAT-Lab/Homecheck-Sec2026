// Weak random sample
function generateToken() {
    // insecure pseudo-random for token
    const token = Math.random().toString(36).substring(2);
    return token;
}

export { generateToken };
