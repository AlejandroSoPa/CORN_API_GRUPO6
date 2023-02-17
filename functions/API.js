const fs = require('fs/promises')
const url = require('url')
const post = require('../post.js')
const { v4: uuidv4 } = require('uuid')
const mysql=require('mysql2')
var express = require('express');
var router = express.Router();

router.post('/get_profiles',getProfiles)
router.post('/get_profile',getProfile)
router.post('/singup',singup)

async function test (req,res){
    let result = { status: "KO", result: "Unkown type" }
    var test = await queryDatabase("SELECT * FROM Usuaris;")
        await wait(1500)
        if (test.length > 0) {
          let filtered={}
          test.forEach(element => {
            filtered[element.phone]=element;
          });
          result = { status: "OK", result: [filtered] }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(result))
}

// Fetch all profiles
async function getProfiles(req,res){
  console.log("getprofiles");
    let result = { status: "KO", result: "Unkown type" }
    try {
      
      var data = await queryDatabase("SELECT * FROM Usuaris;")
      await wait(1500)
      if (data.length > 0) {
        result = { status: "OK", result: data }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
    } catch (error) {
      result = { status: "KO", result: "Unkown type" }
    }
    res.end(JSON.stringify(result))
}

// Fetch especific profile
async function getProfile(req,res){
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }
  if(!receivedPOST.phone){return res.end(JSON.stringify(result))}
  try {
    var data = await queryDatabase(`SELECT * FROM Usuaris WHERE phone='${receivedPOST.phone}';`)

    await wait(1500)
    if (data.length > 0) {
      result = { status: "OK", result: data }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    
  } catch (error) {
    result = { status: "KO", result: "Connection to database error" }
  }
  res.end(JSON.stringify(result))
}

// Create or fetch user
async function singup(req,res){
  let receivedPOST = await post.getPostObject(req)
  if(!receivedPOST.name||!receivedPOST.surname||!receivedPOST.phone||!receivedPOST.email){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  try {
    let phone=Number.parseInt(receivedPOST.phone)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
  }

  try {
    var data = await queryDatabase(`SELECT * FROM Usuaris WHERE phone='${receivedPOST.phone}';`)
    
    await wait(1500)
    if (data.length > 0) {
      result = { status: "OK", result: data }
    } else {
      data = await queryDatabase(`INSERT INTO Usuaris (phone,name,surname,email) VALUES('${receivedPOST.phone}','${receivedPOST.name}','${receivedPOST.surname}','${receivedPOST.email}');`)
      data = await queryDatabase(`SELECT * FROM Usuaris WHERE phone='${receivedPOST.phone}';`)
      result = { status: "OK", result: data }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })

  } catch (error) {
    result = { status: "KO", result: "Connection to database error" }
  }
  res.end(JSON.stringify(result))

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

module.exports = { test,getProfiles,router }