const jwt = require("jsonwebtoken");
const { exec, sql } = require('mysqls')
const UAParser = require('ua-parser-js')

//获取当前用户
function getUser(ctx, filed) {
    try {
        const token = ctx.header.authorization.split(' ');
        const userInfo = jwt.verify(token[1], 'token');
        if(filed){
            return userInfo[filed]
        }
        return userInfo
    } catch (error) {
        console.log(error)
        return ''
    }
    
}

async function getUserInfo(ctx) {
    try {
        const token = ctx.header.authorization.split(' ');
        const userInfo = jwt.verify(token[1], 'token');
        var user = await exec(sql.table('sys_user').where({ user_id: userInfo.user_id }).select(), 0);
        delete user.password;
        const userRole = await exec(sql.table('sys_user_role').where({ user_id: userInfo.user_id }).select(), 0);
        const userPost = await exec(sql.table('sys_user_post').where({ user_id: userInfo.user_id }).select(), 0);
        const postGroup = await exec(sql.table('sys_post').where({ post_id: userPost.post_id }).select(), 0);
        user.roles = await exec(sql.table('sys_role').where({ role_id: userRole.role_id }).select());
        user.dept = await exec(sql.table('sys_dept').where({ dept_id: user.dept_id }).select());
        user.admin = false;
        if (user.roles[0].role_key == 'admin') {
            user.admin = true;
        }
        return {
            data: user,
            postGroup: postGroup.post_name,
            roleGroup: user.roles[0].role_name || ''
        }
    } catch (error) {
        return error
    }
}

//操作栏目  
async function getName(url) {
    const menu = await exec(sql.table('sys_menu').field('menu_name, component').where({ menu_type: 'C' }).select())
    var result =  menu.filter(item =>{
        return item.component.indexOf(url) != -1
    })
    return  result.length ? result[0].menu_name : ''
}

//操作记录 
async function operLog(ctx) {
    var body = ctx.response.body;
    var method = ctx.request.method;
    var operator_type = ctx.request.headers['user-agent'].indexOf('Mobile') != -1 ? 2: 1;
    var ip = ctx.request.headers['x-forwarded-for'];
    var title = await getName(ctx.originalUrl.substring(1));
    var oper_param = method == 'POST' ? ctx.request.body : ctx.request.query;
    var logParams = {
        title,
        business_type: method == 'POST' ? 1: method == 'PUT'? 2 :method =='DELETE'? 3 : 0,
        method: ctx.originalUrl.split('/')[1],
        request_method: method,
        operator_type,
        oper_name: getUser(ctx, 'user_name'),
        dept_name: '',
        oper_url: ctx.originalUrl,
        oper_ip: ip,
        oper_location: ip.indexOf('127.0.0.1') != -1 && ip.indexOf('192.168') != -1 ? '外网IP' : '内网IP',
        oper_param: JSON.stringify(oper_param) ,
        json_result: JSON.stringify(body) || '',
        status: body.code == 200 ? 0 : 1,
        error_msg: body.code != 200 ? body.msg: '',
        oper_time: new Date()
    }
    
    exec(sql.table('sys_oper_log').data(logParams).insert())
}

//登录记录
async function inLog(ctx, user_name) {
    var body = ctx.response.body;
    const ua = new UAParser(ctx.headers['user-agent']);
    var ipaddr = ctx.request.headers['x-forwarded-for'];
    var logParams = {
        user_name,
        ipaddr,
        login_location: ipaddr.indexOf('127.0.0.1') != -1 && ipaddr.indexOf('192.168') != -1 ? '外网IP' : '内网IP',
        browser: ua.getBrowser().name + ua.getBrowser().version,
        os: ua.getOS().name + ua.getOS().version,
        status: body.code == 200 ? 0 : 1,
        msg: body.msg,
        login_time: new Date()
    }
    exec(sql.table('sys_logininfor').data(logParams).insert())
 }

module.exports = {
    getUser,
    getUserInfo,
    operLog,
    inLog
}