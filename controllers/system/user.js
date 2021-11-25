const sqlServices = require('../../services')
const config = require('../../config')
const utils = require('../../utils')

class userController {

    static async index(ctx) {
        const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
        var where = { del_flag: 0 };
        if (params.userName) { where.user_name = { like: `%${params.userName}%` } }
        if (params.phonenumber) { where.phonenumber = { like: `%${params.phonenumber}%` } }
        if (params.status != undefined && params.status != '') { where.status = params.status }
        if (params['params[endTime]']) {
            where.create_time = { EGT: params['params[beginTime]'], LT: params['params[endTime]'] }
        }
        if (params.deptId) {
            var deptIds = [];
            const dept = await new sqlServices('sys_dept', where).query('dept_id')
            if (dept.length) {
                deptIds.push(params.deptId)
                for (let i = 1; i <= dept.length; i++) {
                    deptIds.push(dept[i - 1].dept_id)
                }
                where.dept_id = { in: deptIds.join(',') }
            } else {
                where.dept_id = params.deptId
            }
        }
        const rows = await new sqlServices('sys_user', where).list(utils.toInt(params.pageNum) - 1, params.pageSize)
        const total = await new sqlServices('sys_user', where).count()
        for (let i = 0; i < rows.length; i++) {
            const dept =  await new sqlServices('sys_dept', { del_flag: 0, dept_id: rows[i].dept_id }).query('',0);
            rows[i].dept = dept
            delete rows[i].password
        }
        ctx.json({
            code: config.SUCCODE,
            rows,
            total,
            msg: config.QUETYMSG
        })
    }

    static async create(ctx) {
        const { userName, postIds, roleIds, } = ctx.request.body;
        const data = await new sqlServices('sys_user', { del_flag: 0, user_name: userName }).index();
        if (data.length) {
            ctx.body = {
                code: config.ERRCODE,
                msg: '已存在该用户名'
            }
            utils.operLog(ctx)
        } else {
            var params = ctx.write(ctx.request.body);
            params.password = utils.enCipher(params.password)
            params.create_time = new Date();
            params.create_by = utils.getUser(ctx, 'user_name');
            delete params.post_ids;
            delete params.role_ids
            const result = await new sqlServices('sys_user').insert(params)
            var userPost = [];
            var userRole = [];
            for (let i = 0; i < postIds.length; i++) {
                userPost.push({ user_id: result.insertId, post_id: postIds[i] })
            }
            for (let i = 0; i < roleIds.length; i++) {
                userRole.push({ user_id: result.insertId, role_id: roleIds[i] })
            }
            if (userPost.length) await new sqlServices('sys_user_post').insert(userPost);
            if (userRole.length) await new sqlServices('sys_user_role').insert(userRole);
            ctx.body = {
                code: config.SUCCODE,
                msg: config.SUCCMSG
            }
            utils.operLog(ctx)
        }
    }
}

module.exports = userController;