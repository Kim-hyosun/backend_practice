const { MongoClient } = require('mongodb');

const url = process.env.MONGOKEY;
const connectDB = new MongoClient(url).connect();

module.exports = connectDB;
