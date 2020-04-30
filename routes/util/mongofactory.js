const mongoClient = require('mongodb').MongoClient;

module.exports = function newMongodbClient() {
    return new mongoClient("mongodb://localhost:27017", {useUnifiedTopology: true})
}