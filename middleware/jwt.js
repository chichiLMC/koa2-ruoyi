const jwt = require("jsonwebtoken");
const noVerifyApi = ['/login', '/logout', '/captchaImage', '/swagger', '/swagger-ui/']

module.exports = function () {
    return async (ctx, next) => {
        try {
            if(noVerifyApi.indexOf(ctx.originalUrl) == -1){
                const token = ctx.header.authorization.split(' ');
                const userInfo = jwt.verify(token[1], 'token');
                ctx.user = {
                    userId: userInfo.user_id,
                    userName: userInfo.user_name
                }
            }
            await next();
        } catch (error) {
            if(error.message == 'jwt expired'){
                ctx.body = {
                    code: 401,
                    msg: `请求访问：${ctx.request.path}，认证失败，无法访问系统资源`
                } 
            }else{
                ctx.body = {
                    code: 500,
                    msg: error.message || `请求访问失败`
                }
            }
        }
    }
}
