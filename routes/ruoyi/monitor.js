const router = require('koa-router')()
const { exec , sql } = require('mysqls')
const config = require('../../config')
const utils = require('../../utils')

router.prefix('/monitor')

/*
登录日志
*/
router.get('/logininfor/list', async (ctx, next) => {
  const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
  var where = {};
  if(params.userName){where.user_name = {like:`%${params.userName}%`}}
  if(params.ipaddr){where.ipaddr = {like:`%${params.ipaddr}%`}}
  if(params.status!=undefined&&params.status!=''){where.status = params.status}
  if(params['params[endTime]']){
    where.login_time = { EGT: params['params[beginTime]'], LT: params['params[endTime]']}
  }
  const rows = await exec(sql.table('sys_logininfor').where(where).limit(utils.toInt(params.pageNum)-1,params.pageSize).select())
  const total = await exec(sql.count().table('sys_logininfor').where(where).select())
  ctx.body = {
      code: config.SUCCODE,
      rows: ctx.write(rows),
      total: total[0]['COUNT(1)'],
      msg: config.QUETYMSG
  }
})
router.delete('/logininfor/:infoId', async (ctx) => {
  try {
    if(ctx.params.infoId == 'clean'){
      await exec(sql.table('sys_logininfor').delet())
    }else{
      await exec(sql.table('sys_logininfor').where({info_id: ctx.params.infoId}).delet())
    }
    utils.operLog(ctx)
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
  } catch (error) {
     ctx.body = {
         code: config.ERRCODE,
         msg: '参数错误'
     } 
  }
})

/*
操作日志
*/
router.get('/operlog/list', async (ctx, next) => {
  const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
  var where = {};
  if(params.title){where.title = {like:`%${params.title}%`}}
  if(params.businessType){where.business_type = params.businessType}
  if(params.operName){where.oper_name = {like:`%${params.operName}%`}}
  if(params.status!=undefined&&params.status!=''){where.status = params.status}
  if(params['params[endTime]']){
    where.create_time = { EGT: params['params[beginTime]'], LT: params['params[endTime]']}
  }
  const rows = await exec(sql.table('sys_oper_log').where(where).limit(utils.toInt(params.pageNum)-1,params.pageSize).select())
  const total = await exec(sql.count().table('sys_oper_log').where(where).select())
  ctx.body = {
      code: 200,
      rows: ctx.write(rows),
      total: total[0]['COUNT(1)'],
      msg: '查询成功'
  }
})
router.delete('/operlog/:operId', async (ctx) => {
  try {
    if(ctx.params.operId == 'clean'){
      await exec(sql.table('sys_oper_log').delet())
    }else{
      await exec(sql.table('sys_oper_log').where({oper_id: ctx.params.operId}).delet())
    }
    utils.operLog(ctx, { name: '日志管理', routes: 'monitor', status: 1 })
    ctx.body = {
        code: 200,
        msg: '操作成功'
    }
  } catch (error) {
     ctx.body = {
         code: 500,
         msg: '参数错误'
     } 
  }
})

router.get('/server', async (ctx, next) => {
  ctx.body = {
      code: 200,
      msg: '查询成功'
  }
})

module.exports = router
