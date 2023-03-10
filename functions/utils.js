const fs = require('fs/promises')
const url = require('url')
const post = require('../post.js')
const { v4: uuidv4 } = require('uuid')
const mysql=require('mysql2')
var express = require('express');
var bcrypt = require("bcryptjs");

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
        host: process.env.MYSQLHOST || "containers-us-west-183.railway.app",
        port: process.env.MYSQLPORT || 6096,
        user: process.env.MYSQLUSER || "root",
        password: process.env.MYSQLPASSWORD || "FV5xnxVauvMceefDqfMD",
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

function toLocalTime(time) {
    var d = new Date(time);
    var offset = (new Date().getTimezoneOffset() / 60) * -1;
    var n = new Date(d.getTime() + offset);
    return n;
};

async function encriptPassword(passwd){
  let salt=await bcrypt.genSalt(10)
  let hash=await bcrypt.hash(passwd,salt)
  return hash
}

async function validateSession(token){
  try {
    var data = await queryDatabase(`SELECT * FROM Usuaris WHERE session_token='${token}';`)
    if (data.length > 0) {
      return true
    }
  } catch (error) {
    return false
  }
  return false
}

async function uniqueToken(){
  let tok=makeToken(30);
  try {
    var data = await queryDatabase(`SELECT * FROM Usuaris WHERE session_token='${tok}';`)
    if (data.length > 0) {
      return await uniqueToken
    }
  } catch (error) {
    console.log(error);
    return false
  }
  return tok
}

// maybe extension not necessary
async function uniqueImage(extension){
  let tok=makeToken(30);
  try {
    var data = await queryDatabase(`SELECT * FROM Usuaris WHERE frontId='${tok}.${extension}' OR backId='${tok}.${extension}';`)
    if (data.length > 0) {
      return await uniqueImage(extension)
    }
  } catch (error) {
    console.log(error);
    return false
  }
  return tok+"."+extension
}

module.exports = { queryDatabase,makeToken,wait,toLocalTime,encriptPassword,validateSession,uniqueToken,uniqueImage }