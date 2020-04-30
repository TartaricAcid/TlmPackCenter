/**
 *
 * @param {NodeJS.ReadableStream} readable
 * @returns {Promise<string>}
 */
module.exports = function readableToString(readable) {
    readable.setEncoding('utf-8');
    return new Promise((resolve, reject) => {
        let data = '';
        readable.on('data', function (chunk) {
            data += chunk;
        });
        readable.on('end', function () {
            resolve(data);
        });
        readable.on('error', function (err) {
            reject(err);
        });
    });
}