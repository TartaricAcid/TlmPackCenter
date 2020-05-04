const express = require('express');
const svgCaptcha = require('svg-captcha');
const bcrypt = require('bcryptjs')
const newMongodbClient = require('../util/mongofactory')

const router = express.Router();

// 验证码图片的部分参数设置
svgCaptcha.options.ignoreChars = "0Oo1lI";    // 忽略部分外形相近的字符
svgCaptcha.options.noise = 9;               // 干扰线 ⑨ 条

// 数据库
const dbName = 'data';

// 如果已经登陆了，就返回首页
router.all('/login', function (req, res, next) {
    if (req.session.login) {
        res.redirect("/");
    } else {
        next()
    }
})

// 登陆页面路由
router.get('/login', function (req, res, next) {
    let captcha = svgCaptcha.create();
    req.session.captcha = captcha.text;
    res.render('login', {captcha: captcha.data});
})

// 登陆
router.post('/login', function (req, res, next) {
    let session = req.session;
    let email = req.body.email;
    let password = req.body.password;

    if (req.body.captcha.toLowerCase() !== session.captcha.toLowerCase()) {
        let captcha = svgCaptcha.create();
        req.session.captcha = captcha.text;
        res.render('login', {captcha: captcha.data, registerWarning: "验证码输入错误！"})
        return;
    }

    (async () => {
        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let collection = client.db(dbName).collection('user');
        let result = await collection.findOne({email: email});
        if (!result || !result.password) {
            let captcha = svgCaptcha.create();
            req.session.captcha = captcha.text;
            res.render('login', {captcha: captcha.data, registerWarning: "该用户不存在！"})
            await mongoClient.close()
            return;
        }

        if (!bcrypt.compareSync(password, result.password)) {
            let captcha = svgCaptcha.create();
            req.session.captcha = captcha.text;
            res.render('login', {captcha: captcha.data, registerWarning: "密码错误！"})
            await mongoClient.close()
            return;
        }

        if (req.body.remember) {
            // 保存三十天
            req.session.cookie.originalMaxAge = 30 * 24 * 3600 * 1000;
        }

        req.session.login = true;
        req.session.email = result.email;
        req.session.username = result.username;
        req.session.register_date = result.register_date;
        req.session.level = result.level;
        req.session.signature = result.signature;
        req.session.projects = result.projects;
        res.redirect("/user");

        await mongoClient.close();
    })()
})

module.exports = router;