const express = require('express');
const dateFormat = require('../util/date')
const newMongodbClient = require('../util/mongofactory')

const router = express.Router();

// 数据库
const dbName = 'data';

// 如果没有登录，直接重定向回首页
router.all('/newpack', function (req, res, next) {
    if (req.session.login) {
        next()
    } else {
        res.redirect("/");
    }
})

// 主页路由
router.get('/newpack', function (req, res, next) {
    res.render('newpack', {login: req.session.login, username: req.session.username});
});

router.post('/newpack', function (req, res, next) {
    let title = req.body.title
    let desc = req.body.desc
    if (!title) {
        res.render('newpack', {
            login: req.session.login,
            username: req.session.username,
            warning: "资源包名称不允许为空"
        });
        return;
    }
    if (!desc) {
        res.render('newpack', {
            login: req.session.login,
            username: req.session.username,
            warning: "资源包简介不允许为空"
        });
        return;
    }
    next()
}, function (req, res, next) {
    (async function () {
        // 数据存储
        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let db = client.db(dbName);
        let userCol = db.collection('user');
        let projectCol = db.collection('projects');

        let projectId = req.body.title.toLowerCase().replace(/[\s_]/g, "-")
        let projectDocs = await userCol.findOne({id: projectId});
        if (projectDocs) {
            res.render('newpack', {
                login: req.session.login,
                username: req.session.username,
                warning: "该名称项目已经存在"
            });
        } else {
            let projectData = {
                title: req.body.title,
                desc: req.body.desc,
                license: req.body.license || "All Right Reserved",
                date: dateFormat(new Date())
            }
            await projectCol.insertOne({
                id: projectId,
                data: projectData,
                email: req.session.email
            })

            let userDocs = await userCol.findOne({email: req.session.email});
            userDocs.projects.push(projectId);
            let update = {$set: {"projects": userDocs.projects}};
            await userCol.updateOne({email: req.session.email}, update);
            res.redirect(`/project/${projectId}`);
        }
        await mongoClient.close()
    })();
})

module.exports = router;
