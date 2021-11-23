# koa2-ruoyi

基于koa2后端开发ruoyi-ui

* 前端采用Ruoyi-Vue, 精简了系统监控模块。
* 后端采用Node-Koa2.js、mysqls、jwt。


后端使用

* 导入数据库 spl_rouyi.sql,配置文件路径/config/db
* 默认端口号为3000  // localhost:3000

```
npm install
```
* install后将diy_moudules相关文件替换到node_moudules依赖



```
npm run start
```

前端使用

* 抽离ruoyi-ui文件夹

```
npm install
npm run dev
```


特别鸣谢：

* [koa](https://koa.bootcss.com/)
* [若依](https://gitee.com/y_project)