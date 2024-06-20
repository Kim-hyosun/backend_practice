const { MongoClient } = require('mongodb');

const url = process.env.MONGOKEY;
const connectDB = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).connect();

module.exports = connectDB;
