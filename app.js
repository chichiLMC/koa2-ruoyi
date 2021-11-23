const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')

const koa_session = require('koa-session')
const sessionConfig = require('./config/session')
const jwt = require('./middleware/jwt')
const { init } = require('mysqls')
const dbConfig = require('./config/db')
const toHump = require('./utils/toHump')

const routes = require('./routes')

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(jwt())
app.use(toHump)
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

init(dbConfig)

//session
const session = koa_session(sessionConfig, app)
app.keys = sessionConfig.signedKey;
app.use(session);

// routes
app.use(routes())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
