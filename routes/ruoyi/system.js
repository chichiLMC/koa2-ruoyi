const router = require('koa-router')()
const { exec, sql } = require('mysqls')
const { StringDecoder } = require('string_decoder')
const decoder = new StringDecoder('utf8')
const config = require('../../config')
const utils = require('../../utils')
const crypto = require('../../utils/crypto')

router.prefix('/system')

/*
@ 字典管理
*/
router.get('/dict/data/type/:name', async (ctx, next) => {
    try {
        const data = await exec(sql.table('sys_dict_data').where({ dict_type: ctx.params.name }).order('dict_sort').select())
        ctx.body = {
            code: config.SUCCODE,
            data: ctx.write(data),
            msg: config.SUCCMSG
        }
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.get('/dict/type/:dictId', async (ctx) => {
    try {
        if (ctx.params.dictId === 'list') {
            const rows = await exec(sql.table('sys_dict_type').select())
            const total = await exec(sql.count().table('sys_dict_type').select())
            ctx.body = {
                code: config.SUCCODE,
                rows: ctx.write(rows),
                total: total[0]['COUNT(1)'],
                msg: config.QUETYMSG
            }
        } else {
            const data = await exec(sql.table('sys_dict_type').where({ dict_id: ctx.params.dictId }).select())
            ctx.body = {
                code: config.SUCCODE,
                data: ctx.write(data[0]),
                msg: config.SUCCMSG
            }
        }
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.get('/dict/data/list', async (ctx) => {
    const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
    var where = {};
    if (params.dictType) { where.dict_type = params.dictType }
    if (params.dictLabel) { where.dict_label = { like: `%${params.dictLabel}%` } }
    if (params.status != undefined && params.status != '') { where.status = params.status }
    const rows = await exec(sql.table('sys_dict_data').where(where).limit(utils.toInt(params.pageNum) - 1, params.pageSize).select())
    const total = await exec(sql.count().table('sys_dict_data').where(where).select())
    ctx.body = {
        code: config.SUCCODE,
        rows: ctx.write(rows),
        total: total[0]['COUNT(1)'],
        msg: config.QUETYMSG
    }
})

/*
@ 用户管理
*/
router.get('/user/list', async (ctx, next) => {
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
        const dept = await exec(sql.table('sys_dept').field('dept_id').where({ del_flag: 0, ancestors: { like: `%,${params.deptId}%` } }).select())
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
    const rows = await exec(sql.table('sys_user').where(where).limit(utils.toInt(params.pageNum) - 1, params.pageSize).select())
    const total = await exec(sql.count().table('sys_user').where(where).select())
    for (let i = 0; i < rows.length; i++) {
        const dept = await exec(sql.table('sys_dept').where({ del_flag: 0, dept_id: rows[i].dept_id }).select())
        rows[i].dept = dept[0]
        delete rows[i].password
    }
    ctx.body = {
        code: config.SUCCODE,
        rows: ctx.write(rows),
        total: total[0]['COUNT(1)'],
        msg: config.QUETYMSG
    }
})
router.post('/user', async (ctx) => {
    const { userName, postIds, roleIds, } = ctx.request.body;
    const data = await exec(sql.table('sys_user').where({ del_flag: 0, user_name: userName }).select())
    if (data.length) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '已存在该用户名'
        }
        utils.operLog(ctx)
    } else {
        var params = ctx.writeLine(ctx.request.body);
        params.password = crypto.enCipher(params.password)
        params.create_time = new Date();
        params.create_by = utils.getUser(ctx, 'user_name');
        delete params.post_ids;
        delete params.role_ids
        const result = await exec(sql.table('sys_user').data(params).insert())
        var userPost = [];
        var userRole = [];
        for (let i = 0; i < postIds.length; i++) {
            userPost.push({ user_id: result.insertId, post_id: postIds[i] })
        }
        for (let i = 0; i < roleIds.length; i++) {
            userRole.push({ user_id: result.insertId, role_id: roleIds[i] })
        }
        if (userPost.length) await exec(sql.table('sys_user_post').data(userPost).insert())
        if (userRole.length) await exec(sql.table('sys_user_role').data(userRole).insert())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    }
})
router.put('/user', async (ctx) => {
    const { postIds, roleIds, } = ctx.request.body;
    var params = ctx.writeLine(ctx.request.body);
    const { user_id } = params;
    params.password = crypto.enCipher(params.password)
    params.update_time = new Date();
    params.update_by = utils.getUser(ctx, 'user_name');
    delete params.dept;
    delete params.post_ids;
    delete params.role_ids
    await exec(sql.table('sys_user').data(params).where({ user_id }).update())
    await exec(sql.table('sys_user_post').where({ user_id }).delet())
    await exec(sql.table('sys_user_role').where({ user_id }).delet())
    var userPost = [];
    var userRole = [];
    for (let i = 0; i < postIds.length; i++) {
        userPost.push({ user_id, post_id: postIds[i] })
    }
    for (let i = 0; i < roleIds.length; i++) {
        userRole.push({ user_id, role_id: roleIds[i] })
    }
    if (userPost.length) await exec(sql.table('sys_user_post').data(userPost).insert())
    if (userRole.length) await exec(sql.table('sys_user_role').data(userRole).insert())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.put('/user/resetPwd', async (ctx) => {
    var { userId, password } = ctx.request.body;
    password = crypto.enCipher(password)
    await exec(sql.table('sys_user').data({ password }).where({ user_id: userId }).update())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.get('/user/', async (ctx) => {
    const posts = await exec(sql.table('sys_post').order('post_sort').select());
    const roles = await exec(sql.table('sys_role').where({ del_flag: 0, role_key: { NEQ: 'admin' } }).order('role_sort').select());
    ctx.body = {
        code: config.SUCCODE,
        posts: ctx.write(posts),
        roles: ctx.write(roles),
        msg: config.SUCCMSG
    }
})
router.get('/user/:userId', async (ctx) => {
    try {
        if(ctx.params.userId == 'profile'){
            const data = ctx.write(await utils.getUserInfo(ctx))
            ctx.body = Object.assign({code: config.SUCCODE, msg: config.SUCCMSG}, data)
        }else{
            const user = await exec(sql.table('sys_user').where({ del_flag: 0, user_id: ctx.params.userId }).select());
            const data = user[0];
            const dept = await exec(sql.table('sys_dept').where({ del_flag: 0, dept_id: data.dept_id }).select())
            data.dept = dept[0];
            delete data.password;
            const posts = await exec(sql.table('sys_post').order('post_sort').select());
            const postRes = await exec(sql.table('sys_user_post').where({ user_id: ctx.params.userId }).select());
            const roles = await exec(sql.table('sys_role').where({ del_flag: 0, role_key: { NEQ: 'admin' } }).order('role_sort').select())
            const roleRes = await exec(sql.table('sys_user_role').where({ user_id: ctx.params.userId }).select());
            var postIds = [], roleIds = [];
            for (let i = 0; i < postRes.length; i++) {
                postIds.push(postRes[i].post_id)
            }
            for (let i = 0; i < roleRes.length; i++) {
                roleIds.push(roleRes[i].role_id)
            }
            ctx.body = {
                code: config.SUCCODE,
                data: ctx.write(data),
                posts: ctx.write(posts),
                postIds,
                roles: ctx.write(roles),
                roleIds,
                msg: config.SUCCMSG
            }
        }
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.get('/user/authRole/:userId', async (ctx) => {
    const user = await exec(sql.table('sys_user').where({ del_flag: 0, user_id: ctx.params.userId }).select());
    const data = user[0];
    const dept = await exec(sql.table('sys_dept').where({ del_flag: 0, dept_id: data.dept_id }).select())
    data.dept = dept[0];
    delete data.password;
    const roles = await exec(sql.table('sys_role').where({ del_flag: 0, role_key: { NEQ: 'admin' } }).order('role_sort').select())
    ctx.body = {
        code: config.SUCCODE,
        user: ctx.write(data),
        roles: ctx.write(roles),
        msg: config.SUCCMSG
    }
})
router.put('/user/authRole', async (ctx) => {
    var { userId, roleIds } = ctx.request.query;
    var roleId = roleIds.split(',')
    var data = [];
    for (let i = 0; i < roleId.length; i++) {
        data.push({
            user_id: userId,
            role_id: roleId[i]
        })
    }
    await exec(sql.table('sys_user_role').where({ user_id: userId }).delet())
    await exec(sql.table('sys_user_role').data(data).insert())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.delete('/user/:userId', async (ctx) => {
    try {
        await exec(sql.table('sys_user').data({ del_flag: 2 }).where({ user_id: ctx.params.userId }).update())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.put('/user/profile', async (ctx) => {
    var params = ctx.request.body;
    var data = {
        nick_name: params.nickName,
        phonenumber: params.phonenumber,
        sex: params.sex
    }
    await exec(sql.table('sys_user').data(data). where({user_id: params.userId}).update())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.put('/user/profile/updatePwd', async (ctx) => {
    var params = ctx.request.query;
    const user =  await exec(sql.table('sys_user'). where({user_id: utils.getUser(ctx, 'user_id')}).select(), 0)
    if(crypto.enCipher(params.oldPassword) != user.password){
        ctx.body = {
            code: config.ERRCODE,
            msg: '旧密码错误'
        }
        utils.operLog(ctx)
        return 
    }
    await exec(sql.table('sys_user').data({password: crypto.enCipher(params.newPassword)}). where({user_id: user.user_id}).update())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})


/*
@ 角色管理
*/
router.get('/role/list', async (ctx, next) => {
    const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
    var where = {};
    if (params.roleName) { where.role_name = { like: `%${params.roleName}%` } }
    if (params.roleKey) { where.role_key = { like: `%${params.roleKey}%` } }
    if (params.status != undefined && params.status != '') { where.status = params.status }
    if (params['params[endTime]']) {
        where.create_time = { EGT: params['params[beginTime]'], LT: params['params[endTime]'] }
    }
    const rows = await exec(sql.table('sys_role').where(where).limit(utils.toInt(params.pageNum) - 1, params.pageSize).order('role_sort').select())
    const total = await exec(sql.count().table('sys_role').where(where).select())
    ctx.body = {
        code: config.SUCCODE,
        rows: ctx.write(rows),
        total: total[0]['COUNT(1)'],
        msg: config.QUETYMSG
    }
})
router.post('/role', async (ctx) => {
    const { menuIds } = ctx.request.body;
    var params = ctx.writeLine(ctx.request.body);
    params.create_time = new Date();
    params.create_by = utils.getUser(ctx, 'user_name');
    delete params.dept_ids;
    delete params.menu_ids;
    const result = await exec(sql.table('sys_role').data(params).insert())
    if (menuIds.length) {
        var menuIdArr = [];
        for (let i = 0; i < menuIds.length; i++) {
            menuIdArr.push({
                role_id: result.insertId,
                menu_id: menuIds[i]
            })
        }
        await exec(sql.table('sys_role_menu').data(menuIdArr).insert())
    }
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.put('/role', async (ctx) => {
    try {
        var menuIds = ctx.request.body.menuIds;
        var params = ctx.request.body;
        delete params.menuIds;
        params.update_time = new Date();
        params.update_by = utils.getUser(ctx, 'user_name');
        await exec(sql.table('sys_role').data(ctx.writeLine(params)).where({ role_id: params.roleId }).update())
        var menuIdArr = [];
        menuIds.forEach(item => {
            menuIdArr.push({
                role_id: params.roleId,
                menu_id: item
            })
        })
        await exec(sql.table('sys_role_menu').where({ role_id: { in: params.roleId } }).delet())
        await exec(sql.table('sys_role_menu').data(menuIdArr).insert())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
        utils.operLog(ctx)
    }
})
router.get('/role/:roleId', async (ctx) => {
    try {
        const data = await exec(sql.table('sys_role').where({ role_id: ctx.params.roleId }).select());
        ctx.body = {
            code: config.SUCCODE,
            data: ctx.write(data[0]),
            msg: config.SUCCMSG
        }
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.delete('/role/:roleId', async (ctx) => {
    try {
        await exec(sql.table('sys_role').where({ role_id: { in: ctx.params.roleId } }).delet())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
        utils.operLog(ctx)
    }
})
router.get('/role/authUser/allocatedList', async (ctx) => {
    const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
    const data = await exec(sql.table('sys_user_role').where({ role_id: params.roleId }).select())
    const roleId = [];
    for (let i = 0; i < data.length; i++) {
        roleId.push(data[i].user_id)
    }
    var where = {
        del_flag: 0,
        user_id: { in: roleId.join(',') }
    }
    if (params.userName) { where.user_name = { like: `%${params.userName}%` } }
    if (params.phonenumber) { where.phonenumber = { like: `%${params.phonenumber}%` } }
    const rows = await exec(sql.table('sys_user').where(where).limit(utils.toInt(params.pageNum) - 1, params.pageSize).select())
    const total = await exec(sql.count().table('sys_user').where(where).select())
    ctx.body = {
        code: config.SUCCODE,
        rows: ctx.write(rows),
        total: total[0]['COUNT(1)'],
        msg: config.QUETYMSG
    }
})
router.put('/role/dataScope', async (ctx) => {
    var roleId = ctx.request.body.roleId;
    var dataScope = ctx.request.body.dataScope;
    var deptIds = [], deptIdArr = [];
    const dept = await exec(sql.table('sys_dept').select())
    await exec(sql.table('sys_role_dept').where({ role_id: { in: roleId } }).delet())
    //全部部门权限
    if (dataScope === '1') {
        for (let i = 0; i < dept.length; i++) {
            if (dept[i].parent_id == 0) {
                deptIds.push(dept[i].dept_id)
            }
        }
    }
    //自定数据权限
    if (dataScope === '2') {
        deptIds = ctx.request.body.deptIds;
        if (deptIds.length) deptIds.splice(0, 1)
    }
    if (deptIds.length) {
        deptIds.forEach(item => {
            deptIdArr.push({
                role_id: roleId,
                dept_id: item
            })
        })
        await exec(sql.table('sys_role_dept').data(deptIdArr).insert())
    }
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})

/*
@ 菜单管理
*/
router.get('/menu/list', async (ctx, next) => {
    const params = ctx.request.query
    var where = {};
    if (params.menuName) { where.menu_name = { like: `%${params.menuName}%` } }
    if (params.status != undefined && params.status != '') { where.status = params.status }
    const data = await exec(sql.table('sys_menu').where(where).order('order_num').select())
    ctx.body = {
        code: config.SUCCODE,
        data: ctx.write(data),
        msg: config.QUETYMSG
    }
})
router.post('/menu', async (ctx) => {
    var params = ctx.writeLine(ctx.request.body);
    params.create_time = new Date();
    params.create_by = utils.getUser(ctx, 'user_name');
    params.parent_id = params.parent_id.toString();
    await exec(sql.table('sys_menu').data(params).insert())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.put('/menu', async (ctx) => {
    var params = ctx.writeLine(ctx.request.body);
    params.update_time = new Date();
    params.update_by = utils.getUser(ctx, 'user_name');
    await exec(sql.table('sys_menu').data(params).where({ menu_id: params.menu_id }).update())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.get('/menu/:menuId', async (ctx) => {
    try {
        if (ctx.params.menuId === 'treeselect') {
            const data = await exec(sql.table('sys_menu').field('menu_id,menu_name,parent_id').select())
            const menuTree = utils.toMenuTreeLable(data)
            ctx.body = {
                code: config.SUCCODE,
                data: ctx.write(menuTree),
                msg: config.SUCCMSG
            }
        } else {
            const data = await exec(sql.table('sys_menu').where({ menu_id: ctx.params.menuId }).select());
            ctx.body = {
                code: config.SUCCODE,
                data: ctx.write(data[0]),
                msg: config.SUCCMSG
            }
        }
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: error.message
        }
    }
})
router.delete('/menu/:menuId', async (ctx) => {
    try {
        const role = await exec(sql.table('sys_role_menu').where({ menu_id: { in: ctx.params.menuId } }).select())
        if(role.length){
            return ctx.body = {
                code: config.ERRCODE,
                msg: '菜单已分配'
            }
        }
        const parent = await exec(sql.table('sys_menu').where({ parent_id: { in: ctx.params.menuId } }).select())
        if(parent.length){
            return ctx.body = {
                code: config.ERRCODE,
                msg: '请先删除子菜单'
            }
        }
        await exec(sql.table('sys_menu').where({ menu_id: { in: ctx.params.menuId } }).delet())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }

    }
})
router.get('/menu/roleMenuTreeselect/:roleId', async (ctx) => {
    try {
        const menu = await exec(sql.table('sys_menu').select());
        const role = await exec(sql.table('sys_role_menu').where({ role_id: ctx.params.roleId }).select());
        var checkedKeys = [];
        for (let i = 0; i < role.length; i++) {
            checkedKeys.push(role[i].menu_id)
        }
        ctx.body = {
            code: config.SUCCODE,
            checkedKeys,
            menus: utils.toMenuTreeLable(menu),
            msg: config.SUCCMSG
        }
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: error.message
        }
    }
})

/*
@ 部门管理
*/
router.get('/dept/list', async (ctx, next) => {
    const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
    var where = { del_flag: 0 };
    if (params.deptName) { where.dept_name = { like: `%${params.deptName}%` } }
    if (params.status != undefined && params.status != '') { where.status = params.status }
    const data = await exec(sql.table('sys_dept').where(where).order('order_num').select())
    ctx.body = {
        code: config.SUCCODE,
        data: ctx.write(data),
        msg: config.QUETYMSG
    }
})
router.post('/dept', async (ctx) => {
    try {
        const rows = await exec(sql.table('sys_dept').field('ancestors').where({ dept_id: ctx.request.body.parentId }).select())
        var params = ctx.writeLine(ctx.request.body);
        params.create_time = new Date();
        params.create_by = utils.getUser(ctx, 'user_name');
        params.ancestors = rows[0].ancestors + ',' + params.parent_id,
        await exec(sql.table('sys_dept').data(params).insert())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
        utils.operLog(ctx)
    }
})
router.put('/dept', async (ctx) => {
    try {
        const rows = await exec(sql.table('sys_dept').field('ancestors').where({ dept_id: ctx.request.body.parentId }).select())
        var params = ctx.writeLine(ctx.request.body);
        params.update_time = new Date();
        params.update_by = utils.getUser(ctx, 'user_name');
        params.ancestors = rows[0].ancestors + ',' + params.parent_id,
        await exec(sql.table('sys_dept').data(params).where({ dept_id: params.dept_id }).update())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
        utils.operLog(ctx)
    }
})
router.get('/dept/:deptId', async (ctx) => {
    try {
        var data;
        if (ctx.params.deptId == 'treeselect') {
            const res = await exec(sql.table('sys_dept').where({ del_flag: 0 }).select());
            data = utils.toMenuTreeLable(res, 0, 'dept_id', 'dept_name')
        } else {
            const res = await exec(sql.table('sys_dept').where({ del_flag: 0, dept_id: ctx.params.deptId }).select());
            data = res[0]
        }
        ctx.body = {
            code: config.SUCCODE,
            data: ctx.write(data),
            msg: config.SUCCMSG
        }
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.delete('/dept/:deptId', async (ctx) => {
    // await exec(sql.table('sys_dept').where({dept_id: { in: ctx.params.deptId } }).delet())
    await exec(sql.table('sys_dept').data({ del_flag: '2' }).where({ dept_id: ctx.params.deptId }).update())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.get('/dept/list/exclude/:deptId', async (ctx) => {
    const data = await exec(sql.table('sys_dept').where({ del_flag: 0, dept_id: ctx.params.deptId }).select())
    var result = [];
    if (data[0].parent_id !== 0) {
        result = await exec(sql.table('sys_dept').where({ del_flag: 0, parent_id: { NEQ: ctx.params.deptId }, dept_id: { NEQ: ctx.params.deptId } }).order('order_num').select())
    }
    ctx.body = {
        code: config.SUCCODE,
        data: ctx.write(result),
        msg: config.QUETYMSG
    }
})
router.get('/dept/roleDeptTreeselect/:roleId', async (ctx) => {
    try {
        const data = await exec(sql.table('sys_dept').where({ del_flag: 0 }).select());
        const role = await exec(sql.table('sys_role_dept').where({ role_id: ctx.params.roleId }).select());
        var checkedKeys = [];
        for (let i = 0; i < role.length; i++) {
            checkedKeys.push(role[i].dept_id)
        }
        ctx.body = {
            code: config.SUCCODE,
            checkedKeys,
            depts: utils.toMenuTreeLable(data, 0, 'dept_id', 'dept_name'),
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
@ 岗位管理
*/
router.get('/post/list', async (ctx, next) => {
    const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
    var where = {};
    if (params.postCode) { where.post_code = { like: `%${params.postCode}%` } }
    if (params.postName) { where.post_name = { like: `%${params.postName}%` } }
    if (params.status != undefined && params.status != '') { where.status = params.status }
    const rows = await exec(sql.table('sys_post').where(where).limit(utils.toInt(params.pageNum) - 1, params.pageSize).order('post_sort').select())
    const total = await exec(sql.count().table('sys_post').where(where).select())
    ctx.body = {
        code: config.SUCCODE,
        rows: ctx.write(rows),
        total: total[0]['COUNT(1)'],
        msg: config.QUETYMSG
    }
})
router.post('/post', async (ctx) => {
    try {
        var params = ctx.writeLine(ctx.request.body);
        params.create_time = new Date();
        params.create_by = utils.getUser(ctx, 'user_name');
        await exec(sql.table('sys_post').data(params).insert())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
        utils.operLog(ctx)
    }
})
router.put('/post', async (ctx) => {
    try {
        var params = ctx.writeLine(ctx.request.body);
        params.update_time = new Date();
        params.update_by = utils.getUser(ctx, 'user_name');
        await exec(sql.table('sys_post').data(params).where({ post_id: params.post_id }).update())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.get('/post/:postId', async (ctx) => {
    try {
        const data = await exec(sql.table('sys_post').where({ post_id: ctx.params.postId }).select());
        ctx.body = {
            code: config.SUCCODE,
            data: ctx.write(data[0]),
            msg: config.SUCCMSG
        }
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.delete('/post/:postId', async (ctx) => {
    try {
        await exec(sql.table('sys_post').where({ post_id: { in: ctx.params.postId } }).delet())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})

/*
@ 通知公告
*/
router.get('/notice/list', async (ctx, next) => {
    const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
    var where = {};
    if (params.noticeTitle) { where.notice_title = { like: `%${params.noticeTitle}%` } }
    if (params.createBy) { where.create_by = { like: `%${params.createBy}%` } }
    if (params.noticeType != undefined && params.noticeType != '') { where.notice_type = params.noticeType }
    const rows = await exec(sql.table('sys_notice').where(where).limit(utils.toInt(params.pageNum) - 1, params.pageSize).select())
    const total = await exec(sql.count().table('sys_notice').where(where).select())
    for (let i = 0; i < rows.length; i++) {
        rows[i].notice_content = decoder.write(rows[i].notice_content)
    }
    ctx.body = {
        code: config.SUCCODE,
        rows: ctx.write(rows),
        total: total[0]['COUNT(1)'],
        msg: config.QUETYMSG
    }
})
router.post('/notice', async (ctx) => {
    try {
        var params = ctx.writeLine(ctx.request.body);
        params.create_time = new Date();
        params.create_by = utils.getUser(ctx, 'user_name');
        await exec(sql.table('sys_notice').data(params).insert())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
        utils.operLog(ctx)
    }
})
router.put('/notice', async (ctx) => {
    var params = ctx.writeLine(ctx.request.body);
    params.update_time = new Date();
    params.update_by = utils.getUser(ctx, 'user_name');
    await exec(sql.table('sys_notice').data(params).where({ notice_id: params.notice_id }).update())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.get('/notice/:noticeId', async (ctx) => {
    try {
        const data = await exec(sql.table('sys_notice').where({ notice_id: ctx.params.noticeId }).select());
        data[0].notice_content = decoder.write(data[0].notice_content)
        ctx.body = {
            code: config.SUCCODE,
            data: ctx.write(data[0]),
            msg: config.SUCCMSG
        }
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.delete('/notice/:noticeId', async (ctx) => {
    try {
        await exec(sql.table('sys_notice').where({ notice_id: { in: ctx.params.noticeId } }).delet())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})

/*
@ 参数设置
*/
router.get('/config/list', async (ctx, next) => {
    const params = ctx.request.query || { pageNum: 1, pageSize: 10 };
    var where = {};
    if (params.configName) { where.config_name = { like: `%${params.configName}%` } }
    if (params.configKey) { where.config_value = { like: `%${params.configKey}%` } }
    if (params.configType) { where.config_type = { config_type: params.configType } }
    if (params['params[endTime]']) {
        where.create_time = { EGT: params['params[beginTime]'], LT: params['params[endTime]'] }
    }
    const rows = await exec(sql.table('sys_config').where(where).limit(utils.toInt(params.pageNum) - 1, params.pageSize).select())
    const total = await exec(sql.count().table('sys_config').where(where).select())
    ctx.body = {
        code: config.SUCCODE,
        rows: ctx.write(rows),
        total: total[0]['COUNT(1)'],
        msg: config.QUETYMSG
    }
})
router.post('/config', async (ctx) => {
    try {
        var params = ctx.writeLine(ctx.request.body);
        params.create_time = new Date();
        params.create_by = utils.getUser(ctx, 'user_name');
        await exec(sql.table('sys_config').data(params).insert())
        ctx.body = {
            code: config.SUCCODE,
            msg: config.SUCCMSG
        }
        utils.operLog(ctx)
    } catch (error) {
        ctx.body = {
            code: config.ERRCODE,
            msg: '参数错误'
        }
    }
})
router.put('/config', async (ctx) => {
    var params = ctx.writeLine(ctx.request.body);
    params.update_time = new Date();
    params.update_by = utils.getUser(ctx, 'user_name');
    await exec(sql.table('sys_config').data(params).where({ config_id: params.config_id }).update())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.get('/config/:configId', async (ctx) => {
    const data = await exec(sql.table('sys_config').where({ config_id: ctx.params.configId }).select(), 0);
    ctx.body = {
        code: config.SUCCODE,
        data: ctx.write(data),
        msg: config.SUCCMSG
    }
})
router.delete('/config/:configId', async (ctx) => {
    await exec(sql.table('sys_config').where({ config_id: { in: ctx.params.Id } }).delet())
    ctx.body = {
        code: config.SUCCODE,
        msg: config.SUCCMSG
    }
    utils.operLog(ctx)
})
router.get('/config/configKey/:name', async (ctx) => {
    const data = await exec(sql.table('sys_config').where({ config_key: ctx.params.name }).select(), 0)
    ctx.body = {
        code: config.SUCCODE,
        msg: data.config_value
    }
})

module.exports = router