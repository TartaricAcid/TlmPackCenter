const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');
const session = require('express-session')
const redis = require('redis')
const redisStore = require('connect-redis')(session)
const uuid = require('uuid')

const indexRouter = require('./routes/index');
const registerRouter = require('./routes/user/register')
const loginRouter = require('./routes/user/login')
const logoutRouter = require('./routes/user/logout')
const userRouter = require('./routes/user/user')
const newpackRouter = require('./routes/project/newpack')
const projectRouter = require('./routes/project/project')

const app = express();

// 装载模板
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// 中间件装填
app.use(logger('dev'));     // 日志
app.use(express.json());            // JSON 数据解析
app.use(express.urlencoded({extended: false})); // URL 数据解析
app.use(express.static(path.join(__dirname, 'public'))); // 静态网页文件夹位置设置

app.use(session({
    cookie: {maxAge: 3600 * 1000}, // 默认会话保存一个小时
    secret: "this is a test",      // 加密 cookies 的字符串
    // 存储进 redis 数据库中
    store: new redisStore({client: redis.createClient()}),
    resave: false,
    saveUninitialized: true
}))

// 路由中间件装填
app.use('/', [indexRouter, registerRouter, loginRouter, logoutRouter,
    userRouter, newpackRouter, projectRouter]);

// 上面所有的路由都找不到，抛出一个 404
app.use(function (req, res, next) {
    next(createError(404));
});

// 处理所有的 HTTP 错误
app.use(function (err, req, res, next) {
    // 在开发环境下在页面显示错误信息
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // 渲染错误界面
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
