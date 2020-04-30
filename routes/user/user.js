const express = require('express');
const newMongodbClient = require('../util/mongofactory')
const router = express.Router();

// 如果没有登录，直接重定向回首页
router.all('/user', function (req, res, next) {
    if (req.session.login) {
        next()
    } else {
        res.redirect("/");
    }
})

// 主页路由
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

module.exports = router;
