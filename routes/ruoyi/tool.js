const router = require('koa-router')()
const { exec , sql } = require('mysqls')
const config = require('../../config')
const utils = require('../../utils')

router.prefix('/tool')

/*
代码生成
*/
router.get('/gen/list', async (ctx, next) => {
    const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
    var where = {};
    if(params.tableName){where.table_name = {like:`%${params.tableName}%`}}
    if(params.tableComment){where.table_comment = {like:`%${params.tableComment}%`}}
    if(params['params[endTime]']){
        where.login_time = { EGT: params['params[beginTime]'], LT: params['params[endTime]']}
    }
    const rows = await exec(sql.table('gen_table').where(where).limit(utils.toInt(params.pageNum)-1,params.pageSize).select())
    const total = await exec(sql.count().table('gen_table').where(where).select())
    ctx.json({
        code: config.SUCCODE,
        rows,
        total: total[0]['COUNT(1)'],
        msg: config.QUETYMSG
    })
})



module.exports = router