const router = require('koa-router')() //引入路由函数
const swaggerJSDoc = require('swagger-jsdoc')
const path = require('path')
const swaggerDefinition = {
    info: {
        title: 'koa2-rouyi',
        version: '1.0.0',
        description: 'API',
    },
    host: 'localhost:3000',//那么接口文档访问地址为：localhost:3000/swagger
    basePath: '/' // Base path (optional)
};
const options = {
    swaggerDefinition,
    apis: [path.join(__dirname, './routes/**/*.js')], // 写有注解的router的存放地址, 最好path.join()
};
const swaggerSpec = swaggerJSDoc(options)
// 通过路由获取生成的注解文件
router.get('/swagger.json', async function (ctx) {
    console.log('123')
    ctx.set('Content-Type', 'application/json');
    ctx.body = swaggerSpec;
})
module.exports = router
