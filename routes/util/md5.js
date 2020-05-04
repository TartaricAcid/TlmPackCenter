const crypto = require('crypto')
const fs = require('fs')

/**
 * @param {string} filePath 文件路径
 */
module.exports = (filePath) => {
    return new Promise(function (resolve, reject) {
        let stream = fs.createReadStream(filePath);
        let md5 = crypto.createHash('md5')
        stream.on('data', function (d) {
            md5.update(d)
        })
        stream.on('end', function () {
            resolve(md5.digest('hex'))
        })
    })
}