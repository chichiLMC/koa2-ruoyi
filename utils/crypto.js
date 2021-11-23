const Crypto  = require('crypto')

const secretkey = 'RUOYI&NODEKOA2';
/**
 * Crypto加密
 */
var enCipher = function(data){ //加密
    return Crypto.createHmac('sha256', data + secretkey).digest('hex');
}


module.exports = {
    enCipher,
}