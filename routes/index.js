const express = require('express');
const router = express.Router();

// 主页路由
router.get('/', function (req, res, next) {
    res.render('index', {login: req.session.login, username: req.session.username});
});

module.exports = router;
