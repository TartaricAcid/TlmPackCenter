const express = require('express');
const svgCaptcha = require('svg-captcha');
const bcrypt = require('bcryptjs')
const mongoClient = require('mongodb').MongoClient("mongodb://localhost:27017", {useUnifiedTopology: true});

const router = express.Router();

// 验证码图片的部分参数设置
svgCaptcha.options.ignoreChars = "0Oo1lI";    // 忽略部分外形相近的字符
svgCaptcha.options.noise = 9;               // 干扰线 ⑨ 条

// 各种输入数据的正则
const reEmail = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
const reUsername = /[\S]{3,}/;
const rePassword = /[\S]{6,}/;

// 数据库
const dbName = 'data';

// 如果已经登陆了，就返回首页
router.all('/register', function (req, res, next) {
    if (req.session.login) {
        res.redirect("/");
    } else {
        next()
    }
})

// 注册页面的发送
router.get('/register', function (req, res, next) {
    let captcha = svgCaptcha.create();
    req.session.captcha = captcha.text;
    res.render('register', {captcha: captcha.data});
})

// 注册数据的写入
router.post('/register', function (req, res, next) {
    if (req.session.login) {
        res.redirect("/");
        return;
    }

    let captcha = req.body.captcha;
    let email = req.body.email;
    let username = req.body.username;
    let password1 = req.body.password1;
    let password2 = req.body.password2;

    if (captcha.toLowerCase() !== req.session.captcha.toLowerCase()) {
        let captcha = svgCaptcha.create();
        req.session.captcha = captcha.text;
        res.render('register', {captcha: captcha.data, registerWarning: "验证码输入错误！"})
        return;
    }

    if (!email || !reEmail.test(email)) {
        let captcha = svgCaptcha.create();
        req.session.captcha = captcha.text;
        res.render('register', {captcha: captcha.data, registerWarning: "请输入合法的 Email"})
        return;
    }

    if (!username || !reUsername.test(username)) {
        let captcha = svgCaptcha.create();
        req.session.captcha = captcha.text;
        res.render('register', {captcha: captcha.data, registerWarning: "用户名过短，至少应为 3 个非空字符"})
        return;
    }

    if (!password1 || !password2 || password1 !== password2) {
        let captcha = svgCaptcha.create();
        req.session.captcha = captcha.text;
        res.render('register', {captcha: captcha.data, registerWarning: "两次密码输入不一致"})
        return;
    }

    if (!rePassword.test(password1)) {
        let captcha = svgCaptcha.create();
        req.session.captcha = captcha.text;
        res.render('register', {captcha: captcha.data, registerWarning: "密码过短，为安全起见，强制要求密码至少为 6 个非空字符"})
        return;
    }

    // 数据存储
    mongoClient.connect().then(client => {
        let db = client.db(dbName);
        let collection = db.collection('user');

        collection.find({email: email}).toArray(function (err, docs) {
            // 检查是否该邮箱已经注册了？
            if (docs.length > 0) {
                let captcha = svgCaptcha.create();
                req.session.captcha = captcha.text;
                res.render('register', {captcha: captcha.data, registerWarning: "该邮箱已经注册过了！"})
                return;
            }

            let hash = bcrypt.hashSync(password1, bcrypt.genSaltSync(10));
            let userData = {
                email: email,
                username: username,
                password: hash
            }

            collection.insertOne(userData)
                .then(r => {
                    return client.close();
                }).then(r => {
                if (req.body.remember) {
                    // 保存三十天
                    req.session.cookie.originalMaxAge = 30 * 24 * 3600 * 1000;
                }
                req.session.login = true;
                req.session.username = username;
                res.redirect("/");
            })
        });
    });
});

module.exports = router;
