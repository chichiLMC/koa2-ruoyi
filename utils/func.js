
function toInt(str) {
    if (typeof str === 'number') return str;
    if (!str) return str;
    return parseInt(str, 10) || 0;
}

//树结构
function toMenuTree(data, pid = 0) {
    var tree = [];
    data.forEach(item => {
        if(item.parent_id === pid){
            let itemChildren = toMenuTree(data,item.menu_id);
            if(itemChildren.length) item.children = itemChildren;
            tree.push(item);
        }
    });
    return tree;
}

//角色权限结构
function toMenuTreeLable(data, pid = 0, id = 'menu_id', name= 'menu_name') {
    let res = [];
    data.forEach(item => {
        if(item.parent_id === pid){
            let fmtItem = { id: item[id], label: item[name]}
            let itemChildren = toMenuTreeLable(data,item[id], id, name);
            if(itemChildren.length) fmtItem.children = itemChildren;
            res.push(fmtItem);
        }
    });
    return res;
}

function toMenuVue(data, pid = 0) {
    var tree = [];
    data.forEach(item => {
        if(item.parent_id === pid){
            let router = {
                component: item.component ? item.component : item.parent_id == 0 ? "Layout": "ParentView",
                hidden: item.visible == 0 ? false : true,
                name: item.path.charAt(0).toUpperCase() + item.path.slice(1),
                path:  pid == 0 ? `/${item.path}` : item.path,
                meta: {
                    icon: item.icon,
                    link: null,
                    noCache: item.is_cache == 0 ? false : true,
                    title: item.menu_name,
                }
            }
            if (item.menu_type == 'M') {
                router.alwaysShow = true;
                router.redirect = "noRedirect";
            }
            let itemChildren = toMenuVue(data,item.menu_id);
            if(itemChildren.length) router.children = itemChildren;
            tree.push(router);
        }
    });
    return tree;
}

//时间格式化
function timeFormat(dateTime = null, fmt = 'yyyy-mm-dd hh:MM:ss') {
    if (!dateTime) dateTime = Number(new Date());
    if (dateTime.toString().length == 10) dateTime *= 1000;
    let date = new Date(Number(dateTime));
    let ret;
    let opt = {
        "y+": date.getFullYear().toString(), // 年
        "m+": (date.getMonth() + 1).toString(), // 月
        "d+": date.getDate().toString(), // 日
        "h+": date.getHours().toString(), // 时
        "M+": date.getMinutes().toString(), // 分
        "s+": date.getSeconds().toString() // 秒
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
        };
    };
    return fmt;
}

//字符格式化
function transformStr(str) {
    var newStr = '';
    var arr = str.split('_');
    for (var i = 0; i < arr.length; i++) {
        var s = arr[i];
        if (i == 0) {
            newStr += s;
        } else {
            newStr += s.substr(0, 1).toLocaleUpperCase();
            newStr += s.substr(1, s.length - 1);
        }
    }

    return newStr;
}

//二进制转字符串
function binaryToStr(str){
    var result = [];
    var list = str.split(" ");
    for(var i=0;i<list.length;i++){
         var item = list[i];
         var asciiCode = parseInt(item,2);
         var charValue = String.fromCharCode(asciiCode);
         result.push(charValue);
    }
    return result.join("");
}


module.exports = {
    toInt,
    toMenuTree,
    toMenuTreeLable,
    toMenuVue,
    timeFormat,
    transformStr,
    binaryToStr
}