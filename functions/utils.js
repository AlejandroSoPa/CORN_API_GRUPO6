const fs = require('fs/promises')
const url = require('url')
const post = require('../post.js')
const { v4: uuidv4 } = require('uuid')
const mysql=require('mysql2')
var express = require('express');

function makeToken(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

// Perform a query to the database
function queryDatabase (query) {

    return new Promise((resolve, reject) => {
      var connection = mysql.createConnection({
        host: process.env.MYSQLHOST || "containers-us-west-114.railway.app",
        port: process.env.MYSQLPORT || 7464,
        user: process.env.MYSQLUSER || "root",
        password: process.env.MYSQLPASSWORD || "Qz21TSQiclO7oIdZmssF",
        database: process.env.MYSQLDATABASE || "railway"
      });
  
      connection.query(query, (error, results) => { 
        if (error) reject(error);
        resolve(results)
      });
       
      connection.end();
    })
  }

// Wait 'ms' milliseconds
function wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

module.exports = { queryDatabase,makeToken,wait }