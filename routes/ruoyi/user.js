const router = require('koa-router')()
const captchapng = require('captchapng');
const jwt = require("jsonwebtoken");
const { exec, sql } = require('mysqls')
const swaggerJSDoc = require('swagger-jsdoc')
const path = require('path')
const config = require('../../config')
const utils = require('../../utils')

router.get('/', async (ctx, next) => {
  await ctx.render('index', {
    title: 'Hello Koa 2!',
  })
})

router.post('/login', async (ctx, next) => {
  const data = ctx.request.body;
  const captcha = ctx.session.captcha;
  if (!data.username || !data.password) {
    return ctx.body = {
      code: config.ERRCODE,
      msg: '参数不合法'
    }
  }
  if(captcha){
    if(captcha.code != data.code){
      return ctx.body = {
        code: config.ERRCODE,
        msg: '验证码错误'
      }
    }
  }else{
    return ctx.body = {
      code: config.ERRCODE,
      msg: '验证码已过期'
    }
  }
  const result = await exec(sql.table('sys_user').where({ user_name: data.username }).select())
  if (result !== null) {
    if(utils.enCipher(data.password) != result[0].password){
      ctx.body = {
          code: config.ERRCODE,
          msg: '密码错误'
      }
    }else{
      const token = jwt.sign({
        user_name: result[0].user_name,
        user_id: result[0].user_id
      }, 'token', { expiresIn: '2h' });
      exec(sql.table('sys_user').data({ login_date: new Date(), login_ip: ctx.request.ip }).where({ user_id: result[0].user_id, user_name: data.username }).update())
      ctx.session.captchap = '';
      ctx.body = {
        code: config.SUCCODE,
        token,
        msg: '登录成功'
      }
    }
    utils.inLog(ctx, data.username)
  } else {
    ctx.body = {
      code: config.ERRCODE,
      msg: '用户名或密码错误'
    }
    utils.inLog(ctx, data.username)
  }
})

router.post('/logout', async (ctx, next) => {
  ctx.body = {
    code: config.SUCCODE,
    msg: '登出成功'
  }
  utils.inLog(ctx, utils.getUser(ctx, 'user_name'))
})

router.get('/getInfo', async (ctx, next) => {
  const token = ctx.header.authorization.split(' ');
  const userInfo = jwt.verify(token[1], 'token')
  var user = await exec(sql.table('sys_user').where({ user_id: userInfo.user_id }).select(), 0)
  const userRole = await exec(sql.table('sys_user_role').where({ user_id: userInfo.user_id }).select(), 0)
  user.roles = await exec(sql.table('sys_role').where({ role_id: userRole.role_id }).select())
  user.dept = await exec(sql.table('sys_dept').where({ dept_id: user.dept_id }).select())
  if (user.roles[0].role_key == 'admin') {
    user.admin = true;
    ctx.body = {
      code: config.SUCCODE,
      msg: config.SUCCMSG,
      permissions: ["*:*:*"],
      roles: [user.roles[0].role_key],
      user: ctx.write(user)
    }
  } else {
    user.admin = false;
    const menuIds = await exec(sql.table('sys_role_menu').where({ role_id: userRole.role_id }).select())
    var menuId = [];
    for (let i = 0; i < menuIds.length; i++) {
      menuId.push(menuIds[i].menu_id)
    }
    const permission = await exec(sql.table('sys_menu').field('perms').where({ menu_id: { IN: menuId.join(',') } }).select())
    var permissions = [];
    for (let i = 0; i < permission.length; i++) {
      if (permission[i].perms) {
        permissions.push(permission[i].perms)
      }
    }
    ctx.body = {
      code: config.SUCCODE,
      msg: config.SUCCMSG,
      permissions,
      roles: [user.roles[0].role_key],
      user: ctx.write(user)
    }
  }
})

router.get('/getRouters', async (ctx, next) => {
  const user_id = utils.getUser(ctx, 'user_id')
  const userRole = await exec(sql.table('sys_user_role').where({ user_id }).select(), 0)
  const role = await exec(sql.table('sys_role').where({ role_id: userRole.role_id }).select(), 0)
  var data = [];
  if (role.role_key == 'admin') {
    data = await exec(sql.table('sys_menu').where({ menu_type: { NEQ: 'F' } }).select())
  } else {
    var menuId = [];
    const menuIds = await exec(sql.table('sys_role_menu').where({ role_id: userRole.role_id }).select())
    if (menuIds.length) {
      for (let i = 0; i < menuIds.length; i++) {
        menuId.push(menuIds[i].menu_id)
      }
      data = await exec(sql.table('sys_menu').where({ menu_id: { IN: menuId.join(',') }, menu_type: { NEQ: 'F' } }).select())
    } else {
      ctx.body = {
        code: config.ERRCODE,
        msg: '未分配菜单，请联系管理员'
      }
    }
  }
  ctx.body = {
    code: config.SUCCODE,
    msg: config.SUCCMSG,
    data: utils.toMenuVue(data)
  }
})

router.get('/captchaImage', async (ctx, next) => {
  var code = parseInt(Math.random() * 9000 + 1000);
  var uuid = Date.now() + code.toString();
  var p = new captchapng(115, 38, code);
  p.color(220, 220, 230, 80);
  p.color(41, 133, 217, 255);
  ctx.session.captcha = {
    uuid,
    code,
  }
  ctx.body = {
    code: config.SUCCODE,
    captchaOnOff: true,
    img: p.getBase64(),
    uuid,
  }
})

/*
接口文档
*/
router.get('/swagger', async (ctx) => {
  const swaggerDefinition = {
      info: {
          title: 'koa2-rouyi',
          version: '1.0.0',
          description: 'API',
      },
      basePath: '/' // Base path (optional)
  };
  const options = {
      swaggerDefinition,
      apis: [path.resolve('./routes/**/*.js')],
  };
  const swaggerSpec = swaggerJSDoc(options)
  ctx.set('Content-Type', 'application/json');
  ctx.body = swaggerSpec;
})

module.exports = router
