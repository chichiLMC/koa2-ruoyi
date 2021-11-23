
const sessionConfig = {
    key: 'koaRuoyi:sess',
    maxAge: 1000 * 60 * 5,
    autoCommit: true,
    overwrite: true,
    httpOnly: true,
    signed: true,
    signedKey: ["koaRuoyi"],
    rolling: false,
    renew: false
}

module.exports = sessionConfig