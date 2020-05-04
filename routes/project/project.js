const express = require('express');
const dateFormat = require('../util/date')
const fileSizeFormat = require('../util/filesize')
const multer = require('multer')
const md5 = require('../util/md5')
const fs = require('fs')

const dbName = 'data';
const newMongodbClient = require('../util/mongofactory')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdir(`./temp/${req.params.id}`, function (err) {
            cb(null, `./temp/${req.params.id}`)
        })
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
})
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/zip') {
            cb(null, true)
        } else {
            cb(null, false)
        }
    }
})

const router = express.Router();

router.get('/project/:id', function (req, res, next) {
    let id = req.params.id;

    (async function () {
        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let collection = client.db(dbName).collection('projects');
        let docs = await collection.findOne({id: id});
        if (docs) {
            docs.data.author = await client.db(dbName).collection('user').findOne({email: docs.email})
            docs.data.author.register_date = dateFormat(docs.data.author.register_date);
            if (docs.file) {
                for (let entry of docs.file) {
                    entry.upload_date = dateFormat(entry.upload_date, "yyyy-MM-dd hh:mm:ss")
                    entry.file_size = fileSizeFormat(entry.file_size)
                }
            }
            res.render('project', {
                login: req.session.login,
                is_author: req.session.email === docs.email,
                username: req.session.username,
                project: docs.data,
                entries: docs.file.reverse(),
                upload_url: `${req.originalUrl}`,
                setting_url: `${req.originalUrl}/setting`,
                delete_url: `${req.originalUrl}/delete`,
            });
        }
        await mongoClient.close()
    })();
});

router.post('/project/:id', upload.single('file'), function (req, res, next) {
    let id = req.params.id;
    (async function () {
        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let collection = client.db(dbName).collection('projects');
        let docs = await collection.findOne({id: id});

        // 判断是否已经登陆，而且还是自己的项目
        if (req.session.login && docs && req.session.email === docs.email) {
            docs.file = docs.file || [];
            let fileMd5 = await md5(req.file.path);
            for (let file of docs.file) {
                if (fileMd5 === file.md5) {
                    docs.data.author = await client.db(dbName).collection('user').findOne({email: docs.email})
                    docs.data.author.register_date = dateFormat(docs.data.author.register_date);
                    if (docs.file) {
                        for (let entry of docs.file) {
                            entry.upload_date = dateFormat(entry.upload_date, "yyyy-MM-dd hh:mm:ss")
                            entry.file_size = fileSizeFormat(entry.file_size)
                        }
                    }
                    res.render('project', {
                        login: req.session.login,
                        is_author: req.session.email === docs.email,
                        username: req.session.username,
                        project: docs.data,
                        entries: docs.file.reverse(),
                        upload_url: `${req.originalUrl}`,
                        setting_url: `${req.originalUrl}/setting`,
                        delete_url: `${req.originalUrl}/delete`,
                        warning: "检测到该文件已经存在，请勿重复上传"
                    });
                    await mongoClient.close()
                    return;
                }
            }
            docs.file.push({
                upload_date: new Date(),
                file_size: req.file.size,
                file_download: 0,
                file_path: req.file.path,
                md5: fileMd5
            })
            let update = {$set: {"file": docs.file}};
            await collection.updateOne({id: id}, update);
        }

        res.redirect(`/project/${docs.id}`);
        await mongoClient.close()
    })();
});

router.post('/project/:id/setting', function (req, res, next) {
    (async function () {
        let id = req.params.id;
        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let project = client.db(dbName).collection('projects');
        let user = client.db(dbName).collection('user');
        let docs = await project.findOne({id: id});

        // 判断是否已经登陆，而且还是自己的项目
        if (req.session.login && docs && req.session.email === docs.email) {
            let title = req.body.title;
            let desc = req.body.desc;
            let license = req.body.license;
            let projectId = title.toLowerCase().replace(/[\s_]/g, "-")
            if (!projectId) {
                res.redirect(`/project/${docs.id}`);
                await mongoClient.close();
                return;
            }

            docs.data.title = title;
            docs.data.desc = desc || docs.data.desc;
            docs.data.license = license;
            await project.updateOne({id: id}, {$set: {id: projectId, data: docs.data}})

            let userInfo = await user.findOne({email: req.session.email})
            if (userInfo) {
                let projects = userInfo.projects;
                for (let i = 0; i < projects.length; i++) {
                    if (projects[i] === id) {
                        projects.splice(i, 1, projectId)
                        break
                    }
                }
                await user.updateOne({email: req.session.email}, {$set: {projects: projects}})
            }

            res.redirect(`/project/${projectId}`);
            await mongoClient.close();
            return;
        }

        res.redirect(`/project/${docs.id}`);
        await mongoClient.close()
    })();
});

router.post('/project/:id/delete', function (req, res, next) {
    (async function () {
        let id = req.params.id;

        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let project = client.db(dbName).collection('projects');
        let user = client.db(dbName).collection('user');
        let docs = await project.findOne({id: id});

        if (req.session.login && docs && req.session.email === docs.email) {
            let userInfo = await user.findOne({email: req.session.email})
            if (userInfo) {
                let projects = userInfo.projects;
                for (let i = 0; i < projects.length; i++) {
                    if (projects[i] === id) {
                        projects.splice(i, 1)
                        break
                    }
                }
                await user.updateOne({email: req.session.email}, {$set: {projects: projects}})
            }
            await project.deleteOne({id: id})
        }

        res.redirect(`/user`);
        await mongoClient.close()
    })();
});

router.post('/project/:id/delete/:index', function (req, res, next) {
    (async function () {
        let id = req.params.id;
        let index = Number.parseInt(req.params.index);

        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let project = client.db(dbName).collection('projects');
        let docs = await project.findOne({id: id});

        if (req.session.login && docs && req.session.email === docs.email
            && docs.file && (docs.file.length > index)) {
            docs.file.splice(-index, 1)
            await project.updateOne({id: id}, {$set: {file: docs.file}})
        }

        res.redirect(`/project/${docs.id}`);
        await mongoClient.close()
    })();
});

module.exports = router;