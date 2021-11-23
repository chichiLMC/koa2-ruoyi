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
        ctx.body = {
            code: config.SUCCODE,
            rows: ctx.write(rows),
            total,
            msg: config.QUETYMSG
        }
    }
}

module.exports = userController;