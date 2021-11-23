const { exec, sql } = require('mysqls')

class sqlServices {
    constructor(tableName, where = {}){
        this.tableName = tableName;
        this.where = where;
    }

    /**
     * select 
     */
    async index(order = '') {
        return await exec(sql.table(this.tableName).where(this.where).order(order).select())
    }

    async list(pageNum = 0, pageSize = 10, order = '') {
        return await exec(sql.table(this.tableName).where(this.where).limit(pageNum, pageSize).order(order).select())
    }

    async query(field = '', index) {
        const data = await exec(sql.table(this.tableName).field(field).where(this.where).select())
        return index === 0 ? data[0] : data
    }

    async count() {
      const count = await exec(sql.count().table(this.tableName).where(this.where).select())
      return  count[0]['COUNT(1)']
    }

    /**
     * inset
     */
    async insert(data) {
        return await exec(sql.table(this.tableName).data(data).insert())
    }

    /**
     * update
     */
     async update(data) {
        return await exec(sql.table(this.tableName).data(data).where(this.where).update())
    }

    /**
     * delete
     */
     async delete() {
        return await exec(sql.table(this.tableName).where(this.where).delet())
    }
}

module.exports = sqlServices