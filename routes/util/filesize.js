/**
 * @param {number} sizeIn 文件大小
 * @returns {string} 格式化后的文件大小显示
 */
module.exports = function fileSizeFormat(sizeIn) {
    if (!sizeIn) {
        return "0 Bytes";
    }
    let unitArr = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let index = Math.floor(Math.log(sizeIn) / Math.log(1024));
    let size = sizeIn / Math.pow(1024, index);
    size = size.toFixed(2);
    return `${size} ${unitArr[index]}`;
}