const express = require('express');
const dateFormat = require('../util/date')
const fileSizeFormat = require('../util/filesize')
const multer = require('multer')

// 数据库
const dbName = 'data';
const newMongodbClient = require('../util/mongofactory')
const upload = multer({
    dest: './temp', fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/zip') {
            cb(null, true)
        } else {
            cb(null, false)
        }
    }
})

const router = express.Router();

// 主页路由
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
                entries: docs.file,
                upload_url: `${req.originalUrl}/upload`
            });
        }
        await mongoClient.close()
    })();
});

// 主页路由
router.post('/project/:id/upload', upload.single('file'), function (req, res, next) {
    let id = req.params.id;
    (async function () {
        let mongoClient = newMongodbClient();
        let client = await mongoClient.connect();
        let collection = client.db(dbName).collection('projects');
        let docs = await collection.findOne({id: id});

        // 判断是否已经登陆，而且还是自己的项目
        if (req.session.login && docs && req.session.email === docs.email) {
            docs.file = docs.file || [];
            docs.file.push({
                upload_date: new Date(),
                file_size: req.file.size,
                file_download: 0,
                file_path: req.file.path
            })
            let update = {$set: {"file": docs.file}};
            await collection.updateOne({id: id}, update);
        }

        res.redirect(`/project/${docs.id}`);
        await mongoClient.close()
    })();
});

module.exports = router;