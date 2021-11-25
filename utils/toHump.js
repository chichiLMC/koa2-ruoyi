const toHump = async (ctx, next) => {
    ctx.json = (obj) => ctx.body = toHumpFun(obj)
    ctx.write = (obj) => toLineFun(obj)
    await next()
}

//1为true 0为假的驼峰字段名
const boolVal = ['deptCheckStrictly', 'menuCheckStrictly']

function toHumpFun(obj) {
    const result = Array.isArray(obj) ? [] : {}
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const element = obj[key];
            const index = key.indexOf('_')
            let newKey = key
            if (index === -1 || key.length === 1) {
                result[key] = element
            } else {
                const keyArr = key.split('_')
                const newKeyArr = keyArr.map((item, index) => {
                    if (index === 0) return item
                    return item.charAt(0).toLocaleUpperCase() + item.slice(1)
                })
                newKey = newKeyArr.join('')
                result[newKey] = boolVal.includes(newKey) ? (element ==1 ? true: false): element;
            }
            if (typeof element === 'object' && element !== null) {
                result[newKey] = toHumpFun(element)
            }
        }
    }
    return result
}

function toLineFun(obj, char = '_') {
    let newObj = {};
    for (const key in obj) {
        let newKey = key.replace(/([A-Z])/g, (res) => {
            return char + res.toLowerCase()
        })
          newObj[newKey] = obj[key] == true? 1 : obj[key] == false ? 0 : obj[key]
    }
    return newObj
}

module.exports = toHump