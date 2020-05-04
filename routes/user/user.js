const express = require('express');
const newMongodbClient = require('../util/mongofactory')
const router = express.Router();

const svgCaptcha = require('svg-captcha');

// 如果没有登录，直接重定向回首页
router.all('/user*', function (req, res, next) {
    if (req.session.login) {
        next()
    } else {
        res.redirect("/");
    }
})

router.get('/user', function (req, res, next) {
    (async function () {
        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let collection = await client.db("data").collection("projects");
        let result = await collection.find({email: req.session.email}).toArray();

        res.render('user', {
            login: req.session.login,
            username: req.session.username,
            level: req.session.level,
            date: req.session.register_date.slice(0, 10),
            signature: req.session.signature ? req.session.signature : "Emmmmmmmmmmm……抱歉我没有签名",
            project: result
        });

        await mongoClient.close()
    })()
});

router.get('/user/edit', function (req, res, next) {
    (async function () {
        let captcha = svgCaptcha.create();
        req.session.captcha = captcha.text;
        res.render('useredit', {
            login: req.session.login,
            username: req.session.username,
            level: req.session.level,
            date: req.session.register_date.slice(0, 10),
            captcha: captcha.data,
            signature: req.session.signature ? req.session.signature : "Emmmmmmmmmmm……抱歉我没有签名",
        });
    })()
});

router.post('/user/edit', function (req, res, next) {
    (async function () {
        let username = req.body.username
        let signature = req.body.signature
        let captcha = req.body.captcha

        if (captcha.toLowerCase() !== req.session.captcha.toLowerCase()) {
            captcha = svgCaptcha.create();
            req.session.captcha = captcha.text;
            res.render('useredit', {
                login: req.session.login,
                username: req.session.username,
                level: req.session.level,
                date: req.session.register_date.slice(0, 10),
                captcha: captcha.data,
                signature: req.session.signature ? req.session.signature : "Emmmmmmmmmmm……抱歉我没有签名",
                warning: "验证码错误！"
            });
            return;
        }

        if (!username) {
            captcha = svgCaptcha.create();
            req.session.captcha = captcha.text;
            res.render('useredit', {
                login: req.session.login,
                username: req.session.username,
                level: req.session.level,
                date: req.session.register_date.slice(0, 10),
                captcha: captcha.data,
                signature: req.session.signature ? req.session.signature : "Emmmmmmmmmmm……抱歉我没有签名",
                warning: "用户名不允许为空！"
            });
            return;
        }

        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let collection = await client.db("data").collection("user");
        await collection.updateOne(
            {email: req.session.email},
            {$set: {username: username, signature: signature}}
        )
        req.session.username = username;
        req.session.signature = signature;
        res.redirect('/')
        await mongoClient.close()

    })()
});

module.exports = router;
