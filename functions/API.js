const fs = require('fs/promises')
const url = require('url')
const post = require('../post.js')
const { v4: uuidv4 } = require('uuid')
const mysql=require('mysql2')
const utils=require('./utils')
var express = require('express');
var router = express.Router();
const date = require('date-and-time')
var bcrypt = require("bcryptjs");

var recivedJson=null
// NON PROTECTED BLOCK:
router.post('/get_profiles',getProfiles)
router.post('/get_profile',getProfile)
router.post('/login',login)
router.post('/singup',singup)
// VALIDATE SESSION TOKEN
router.use('',validateSession)
// PROTECTED BLOCK:
router.post('/setup_payment',setup_payment)
router.post('/start_payment',start_payment)
router.post('/finish_payment',finish_payment)

// NON PROTECTED BLOCK:

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
      // console.log(utils.makeToken(255));
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
  let phone
  try {
     phone=Number.parseInt(receivedPOST.phone)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
  }

  if(Number.isNaN(phone)) return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))

  try {
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone=${phone};`)

    await utils.wait(1500)
    if (data.length > 0) {
      result = { status: "OK", result: data }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    
  } catch (error) {
    console.log(error);
    result = { status: "KO", result: "Connection to database error" }
  }
  res.end(JSON.stringify(result))
}

// Create user
async function singup(req,res){
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }
  if(!receivedPOST.name||!receivedPOST.surname||!receivedPOST.phone||!receivedPOST.email||!receivedPOST.password){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  let phone
  try {
    phone=Number.parseInt(receivedPOST.phone)
  } catch (error) {
    console.log("phone invalid");
    return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
  }

  if(Number.isNaN(phone)) return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))

  try {
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${receivedPOST.phone}' OR email='${receivedPOST.email}';`)
    
    if (data.length > 0) {
      result = { status: "KO", result: "User already exists" }
    } else {
      
      var passwd=await utils.encriptPassword(receivedPOST.password)
      if(!passwd) return res.end(JSON.stringify({ status: "KO", result: "ERROR parse password" }))
      await utils.queryDatabase(`INSERT INTO Usuaris (phone,name,surname,email,password) VALUES('${phone}','${receivedPOST.name}','${receivedPOST.surname}','${receivedPOST.email}','${passwd}');`)
      data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${receivedPOST.phone}';`)
      result = { status: "OK", result: data }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    await utils.wait(1500)
    
  } catch (error) {
    console.log(error);
    result = { status: "KO", result: "Connection to database error" }
  }
  res.end(JSON.stringify(result))

}

// log user
async function login(req,res){
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }

  if(!receivedPOST.password||!receivedPOST.email){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  try {
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE email='${receivedPOST.email}';`)
    
    if (data.length > 0) {
      data=data[0]
      // console.log(data);
      if(!data.password) return res.end(JSON.stringify({ status: "KO", result: "Password empty on database" }))
      var pass=await bcrypt.compare(receivedPOST.password,data.password)
      if(pass==true){
        let session=utils.makeToken(30)
        while(true){
          let temp=await utils.queryDatabase(`SELECT * FROM Usuaris WHERE session_token='${receivedPOST.session}';`)
          if(temp.length==0){
            break
          }
          else{session=utils.makeToken(30)}
        }
        await utils.queryDatabase(`UPDATE Usuaris SET session_token = '${session}' WHERE phone='${phone}';`)
        result={ status: "OK", result: session }
      }
      else{
        result={ status: "KO", result: "Password incorrect" }
      }
    }
    else{
      result={ status: "KO", result: "User dont exists" }
    }
    
  } catch (error) {
      console.log("login#ERROR");
      console.log(error);
      result = { status: "KO", result: "Connection to database error" }
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  await utils.wait(1500)
  res.end(JSON.stringify(result))
}

// VALIDATION FUNCTION
async function validateSession(req,res,next){
  console.log("validation in progress");
  let received = await post.getPostObject(req)
  let result = { status: "KO", result: "no session token" }
  if(!received.session) return res.end(JSON.stringify(result))
  let pass=await utils.validateSession(received.session)
  if(!pass) return res.end(JSON.stringify(result))
  recivedJson=received
  next()
}

// PROTECTED BLOCK: 

// create a payment
async function setup_payment(req,res){

  let receivedPOST = recivedJson
  let result = { status: "KO", result: "Invalid param" }
  let phone
  let amount
  if(!receivedPOST.amount){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }
  
  var datatemp = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE session_token='${receivedPOST.session}';`)
  phone=datatemp[0].phone
  try {
    amount=Number.parseInt(receivedPOST.amount)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "Wrong amount" }))
  }

  if(Number.isNaN(amount)) return res.end(JSON.stringify({ status: "KO", result: "Wrong amount" }))
  try {
   
      try {
        let now= date.format(new Date(),'YYYY/MM/DD HH:mm:ss');
        let token=utils.makeToken(250)
        while (true) {
          let same=await utils.queryDatabase(`SELECT * FROM Transaccions WHERE token='${token}'`)
          if(!same.length>0){
            break
          }
          token=utils.makeToken(250)
        }
        await utils.queryDatabase(`INSERT INTO Transaccions (token,Desti,Quantitat,TimeSetup,Accepted) VALUES('${token}','${phone}','${amount}','${now}',0)`)
        result = { status: "OK", result: token }
      } catch (error) {
        console.log("setupPayment#ERROR");
        console.log(error);
        result = { status: "KO", result: "Connection to database error" }
      }
     

    res.writeHead(200, { 'Content-Type': 'application/json' })
    await utils.wait(1500)
    
  } catch (error) {
    console.log(error);
    result = { status: "KO", result: "Connection to database error" }
  }
  res.end(JSON.stringify(result))

}

async function start_payment(req,res){
  let receivedPOST = recivedJson
  let result = { status: "KO", result: "Invalid param" }
  let phone
  
  if(!receivedPOST.token){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  var datatemp = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE session_token='${receivedPOST.session}';`)
  phone=datatemp[0].phone

  let token=receivedPOST.token
  
  try {

    var transacction= await utils.queryDatabase(`SELECT * FROM Transaccions WHERE token='${token}';`)

    if(transacction.length==0){
      return res.end(JSON.stringify({ status: "KO", result: "Token is invalid" }))
    }

    result={ status: "OK", result: transacction[0] }

  } catch (error) {
      console.log("startPayment#ERROR");
      console.log(error);
      result = { status: "KO", result: "Connection to database error" }
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  await utils.wait(1500)
  res.end(JSON.stringify(result))
}

async function finish_payment(req,res){
  let receivedPOST = recivedJson
  let result = { status: "KO", result: "Invalid param" }
  
  if(!receivedPOST.phone||!receivedPOST.token||!receivedPOST.accept||!receivedPOST.amount){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE session_token='${receivedPOST.session}';`)
  let token=receivedPOST.token

  try {

    data=data[0]

    var transacction= await utils.queryDatabase(`SELECT * FROM Transaccions WHERE token='${token}';`)

    if(transacction.length==0){
      return res.end(JSON.stringify({ status: "KO", result: "Token is invalid" }))
    }

    transacction=transacction[0]

    if(transacction.Accepted==1){
      return res.end(JSON.stringify({ status: "KO", result: "This Transacction is already acepted" }))
    }

    console.log(transacction);
    if(Number.parseInt(transacction.Quantitat) != Number.parseInt(receivedPOST.amount)){
      return res.end(JSON.stringify({ status: "KO", result: "Transacction error on quantity" }))
    }
    
    if(transacction.Quantitat>data.wallet){
      return res.end(JSON.stringify({ status: "KO", result: "Cant pay that" }))
    }

    let desti
    try {
      desti=Number.parseInt(transacction.Desti)
    } catch (error) {
      return res.end(JSON.stringify({ status: "KO", result: "Transaction Phone is invalid" }))
    }

    var data2 = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${desti}';`)
    
    if (data2.length == 0) {
      return res.end(JSON.stringify({ status: "KO", result: "Transaction Phone is invalid" }))
    }
    data2=data2[0]

    if(data.phone==data2.phone){
      return res.end(JSON.stringify({ status: "KO", result: "Cant pay that, youre the owner!" }))
    }

    let now= date.format(new Date(),'YYYY/MM/DD HH:mm:ss');
    await utils.queryDatabase(`SET AUTOCOMMIT=0`)
    await utils.queryDatabase(`BEGIN TRANSACTION;`)
    await utils.queryDatabase(`UPDATE Transaccions SET Origen=${data.phone},Accepted=1,TimeAccept='${now}' WHERE token='${token}'`)
    await utils.queryDatabase(`UPDATE Usuaris SET wallet=${Number.parseInt(data.wallet) - Number.parseInt(transacction.Quantitat)} WHERE phone=${phone}`)
    await utils.queryDatabase(`UPDATE Usuaris SET wallet=${Number.parseInt(data2.wallet) + Number.parseInt(transacction.Quantitat)} WHERE phone=${data2.phone}`)
    await utils.queryDatabase(`COMMIT;`)
    await utils.queryDatabase(`END TRANSACTION;`)
    await utils.queryDatabase(`SET AUTOCOMMIT=1`)

    result = { status: "OK", result: "TRANSACTION COMPLETED" }

  } catch (error) {
    try {
      
      await utils.queryDatabase(`ROLLBACK TRANSACTION;`)
      await utils.queryDatabase(`SET AUTOCOMMIT=1`)
    } catch (error) {
      console.log("Connection error");
    }
      console.log("startPayment#ERROR");
      console.log(error);
      result = { status: "KO", result: "Connection to database error" }
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  await utils.wait(1500)
  res.end(JSON.stringify(result))

}



module.exports = { test,getProfiles,router }