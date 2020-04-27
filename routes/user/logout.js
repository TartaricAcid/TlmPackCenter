const express = require('express');
const router = express.Router();

// 访问此页面，直接删除会话，并重定向
router.all('/logout', function (req, res, next) {
    if (req.session.login) {
        req.session.destroy(function (err) {
            res.redirect("/")
        })
    } else {
        res.redirect("/")
    }
})

module.exports = router;