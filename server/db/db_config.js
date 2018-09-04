const mysql = require('mysql')

const config = {
    host: "study.c0dk4hjayriz.us-east-1.rds.amazonaws.com",
    user: "r2d2",
    password: "hackreactor",
    database: "Study",
    port: '3306'
}

const db = mysql.createPool(config);
module.exports = db;
