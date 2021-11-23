
/**
 * 自定义参数说明
 *
 * @param {boolean} [dateStrings=true]
 * 直接返回字符串日期格式
 * @method
 * 修改node_modules/mysqls/main[init函数]添加参数： dateStrings: config.dateStrings ||  false
 * 
 * @param {boolean} [isdev=true]
 * 是否开发环境，可打印sql信息
 * @method
 * 修改node_modules/mysqls/main变量： let isdev = false; [exec函数] 
 * if(isdev){
    console.log('The Sql is => '+ sqlstring, type)
    }
 *   [exec函数] type === 0 时， 直接返回obj: resolve(type === 0 ? results[0] : results);
 */

module.exports = {
    user: "root",
    password: "root",
    database: "spl_ruoyi",
    host: "127.0.0.1",
    port: 3306,
    dateStrings: true,
    isdev: true,
}