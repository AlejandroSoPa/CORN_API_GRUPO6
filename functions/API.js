const fs = require('fs/promises')
const url = require('url')
const post = require('../post.js')
const { v4: uuidv4 } = require('uuid')
const mysql=require('mysql2')
const utils=require('./utils')
var express = require('express');
var router = express.Router();
const date = require('date-and-time')

router.post('/singup',singup)
router.post('/get_profiles',getProfiles)
router.post('/get_profile',getProfile)
router.post('/setup_payment',setup_payment)
router.post('/start_payment',start_payment)
router.post('/finish_payment',finish_payment)

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

  if(phone==NaN) return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))

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

// Create or fetch user
async function singup(req,res){
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }
  if(!receivedPOST.name||!receivedPOST.surname||!receivedPOST.phone||!receivedPOST.email){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  let phone
  try {
    phone=Number.parseInt(receivedPOST.phone)
  } catch (error) {
    console.log("phone invalid");
    return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
  }

  if(phone==NaN) return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))

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
    console.log(error);
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

  if(phone==NaN) return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))

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
        let token=utils.makeToken(255)
        while (true) {
          let same=await utils.queryDatabase(`SELECT * FROM Transaccions WHERE token='${token}'`)
          if(same.length==0){
            break
          }
          token=utils.makeToken(255)
        }
        await utils.queryDatabase(`INSERT INTO Transaccions (token,Desti,Quantitat,TimeSetup,Accepted) VALUES('${token}','${phone}','${amount}','${now}',0)`)
        result = { status: "OK", result: token }
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

async function start_payment(req,res){
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }
  let phone
  
  if(!receivedPOST.phone||!receivedPOST.token){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  let token=receivedPOST.token
  
  try {
    phone=Number.parseInt(receivedPOST.phone)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
  }

  if(phone==NaN) return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))

  try {
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${phone}';`)
    
    if (data.length == 0) {
      return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
    }

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
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }
  let phone
  
  if(!receivedPOST.phone||!receivedPOST.token||!receivedPOST.accept||!receivedPOST.amount){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }

  let token=receivedPOST.token
  
  try {
    phone=Number.parseInt(receivedPOST.phone)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
  }

  if(phone==NaN) return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))

  try {
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${phone}';`)
    
    if (data.length == 0) {
      return res.end(JSON.stringify({ status: "KO", result: "Phone is invalid" }))
    }

    data=data[0]

    var transacction= await utils.queryDatabase(`SELECT * FROM Transaccions WHERE token='${token}';`)

    if(transacction.length==0){
      return res.end(JSON.stringify({ status: "KO", result: "Token is invalid" }))
    }

    transacction=transacction[0]

    if(transacction.Accepted==1){
      return res.end(JSON.stringify({ status: "KO", result: "This Transacction is already acepted" }))
    }

    if(transacction.quantitat!=receivedPOST.amount){

    }
    
    if(transacction.quantitat>data.wallet){
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

    await utils.queryDatabase(`UPDATE Transaccions SET Origen=${phone},Accepted=1,TimeAccept='${now}' WHERE token='${token}'`)
    await utils.queryDatabase(`UPDATE Usuaris SET wallet=${data.wallet - transacction.Quantitat} WHERE phone=${phone}`)
    await utils.queryDatabase(`UPDATE Usuaris SET wallet=${data2.wallet + transacction.Quantitat} WHERE phone=${data2.phone}`)

    result = { status: "OK", result: "TRANSACTION COMPLETED" }

  } catch (error) {
      console.log("startPayment#ERROR");
      console.log(error);
      result = { status: "KO", result: "Connection to database error" }
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  await utils.wait(1500)
  res.end(JSON.stringify(result))

}

module.exports = { test,getProfiles,router }