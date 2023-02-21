const fs = require('fs/promises')
const url = require('url')
const post = require('../post.js')
const { v4: uuidv4 } = require('uuid')
const mysql=require('mysql2')
const utils=require('./utils')
var express = require('express');
var router = express.Router();
const date = require('date-and-time')

router.post('/get_profiles',getProfiles)
router.post('/get_profile',getProfile)
router.post('/singup',singup)
router.post('/setup_payment',setup_payment)

async function test (req,res){
    let result = { status: "KO", result: "Unkown type" }
    var test = await utils.queryDatabase("SELECT * FROM Transaccions;")
        await utils.wait(1500)
        if (test.length > 0) {
          let filtered={}
          test.forEach(element => {
            
            filtered[element.TimeSetup]=element;
          });
          result = { status: "OK", result: [filtered] }
          // result = { status: "OK", result: test }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
      console.log(utils.makeToken(255));
    res.end(JSON.stringify(result))
}

// Fetch all profiles
async function getProfiles(req,res){
  console.log("getprofiles");
    let result = { status: "KO", result: "Unkown type" }
    try {
      
      var data = await utils.queryDatabase("SELECT * FROM Usuaris;")
      await utils.wait(1500)
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
    let phone=Number.parseInt(receivedPOST.phone)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
  }
  try {
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${phone}';`)

    await utils.wait(1500)
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
  let result = { status: "KO", result: "Invalid param" }
  if(!receivedPOST.name||!receivedPOST.surname||!receivedPOST.phone||!receivedPOST.email){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  try {
    let phone=Number.parseInt(receivedPOST.phone)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
  }

  try {
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${receivedPOST.phone}';`)
    
    if (data.length > 0) {
      result = { status: "OK", result: data }
    } else {
      data = await utils.queryDatabase(`INSERT INTO Usuaris (phone,name,surname,email) VALUES('${phone}','${receivedPOST.name}','${receivedPOST.surname}','${receivedPOST.email}');`)
      data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${receivedPOST.phone}';`)
      result = { status: "OK", result: data }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    await utils.wait(1500)
    
  } catch (error) {
    result = { status: "KO", result: "Connection to database error" }
  }
  res.end(JSON.stringify(result))

}

// create a payment
async function setup_payment(req,res){

  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }
  let phone
  let amount

  if(!receivedPOST.amount||!receivedPOST.phone){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  try {
    phone=Number.parseInt(receivedPOST.phone)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
  }

  try {
    amount=Number.parseInt(receivedPOST.amount)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "Wrong amount" }))
  }

  try {
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${phone}';`)
    
    if (data.length > 0) {
      try {
        let now= date.format(new Date(),'YYYY/MM/DD HH:mm:ss');
        console.log(now);
        let token=utils.makeToken(255)
        while (true) {
          let same=await utils.queryDatabase(`SELECT * FROM Transaccions WHERE token='${token}'`)
          if(same.length==0){
            break
          }
          token=utils.makeToken(255)
        }
        await utils.queryDatabase(`INSERT INTO Transaccions (token,Desti,Quantitat,TimeSetup,Accepted) VALUES('${token}','${phone}','${amount}','${now}',0)`)
        result = { status: "OK", result: "Payment Set!" }
      } catch (error) {
        console.log("setupPayment#ERROR");
        console.log(error);
        result = { status: "KO", result: "Connection to database error" }
      }
    } 

    res.writeHead(200, { 'Content-Type': 'application/json' })
    await utils.wait(1500)
    
  } catch (error) {
    console.log(error);
    result = { status: "KO", result: "Connection to database error" }
  }
  res.end(JSON.stringify(result))

}



module.exports = { test,getProfiles,router }