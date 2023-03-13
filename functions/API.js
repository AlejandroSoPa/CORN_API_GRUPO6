const post = require('../post.js')
const { v4: uuidv4 } = require('uuid')
const utils=require('./utils')
var express = require('express');
var router = express.Router();
const date = require('date-and-time')
var bcrypt = require("bcryptjs");
const fs=require("fs/promises")

var recivedJson=null
// NON PROTECTED BLOCK:
router.post('/get_profiles',getProfiles)
router.post('/get_filtered_profiles',getFilteredProfiles)
router.post('/get_profile',getProfile)
router.post('/validate',validateUser)
router.post('/login',login)
router.post('/logout',logout)
router.post('/singup',singup)
router.post('/transaccions',transactionDetailsByUser)
// VALIDATE SESSION TOKEN
// router.use('',validateSession)
// PROTECTED BLOCK:
router.post('/setup_payment',validateSession,setup_payment)
router.post('/start_payment',validateSession,start_payment)
router.post('/finish_payment',validateSession,finish_payment)
router.post('/send_id',validateSession,sendId)

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

async function logout(req,res){
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }
  if(!receivedPOST.session){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }
  try {
    await utils.queryDatabase(`UPDATE Usuaris SET session_token=null WHERE session_token='${receivedPOST.session}' `)
    return res.end(JSON.stringify({ status: "OK", result: "logout" }))
  } catch (error) {
    console.log(error);
    return res.end(JSON.stringify({ status: "KO", result: "Database error" }))
  }
}

// Fetch all profiles
async function getProfiles(req,res){
    let result = { status: "KO", result: "Unkown type" }
    try {
      
      var data = await utils.queryDatabase("SELECT id,name,surname,phone,session_token,wallet,email,status FROM Usuaris;")
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

// fetch filtered profiles
async function getFilteredProfiles(req,res){
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }
  let query="SELECT id,name,surname,phone,session_token,wallet,email,status FROM Usuaris "
  let ands=0;

  // if(!receivedPOST.phone){return res.end(JSON.stringify(result))}
  if(receivedPOST.min2||receivedPOST.max2){
    query="SELECT u.*,COUNT(t.Quantitat) AS trans FROM Usuaris u INNER JOIN Transaccions t ON t.Desti=u.id OR t.Origen=u.id "
  }

  if(receivedPOST.min1||receivedPOST.max1||receivedPOST.status){
  query+="WHERE "
  }

  if(receivedPOST.min1 ){
    query+=`wallet>=${receivedPOST.min1} `
    ands++
  }
  if(receivedPOST.max1 ){
    if(ands>0){query+="AND "}
    query+=`wallet<=${receivedPOST.max1} `
    ands++
  }
 
  if(receivedPOST.status ){
    if(ands>0){query+="AND "}
    query+=`status=${receivedPOST.status} `
  }
  if(receivedPOST.min2||receivedPOST.max2){
    query+="GROUP BY u.id "
  }
  let having=0
  if(receivedPOST.min2 ){
    query+=`HAVING COUNT(t.Quantitat)>=${receivedPOST.min2} `
    ands++
    having++
  }
  if(receivedPOST.max2 ){
    if(having>0){
      query+=`AND COUNT(t.Quantitat)>=${receivedPOST.min2} `
    }
    else{

      query+=`HAVING COUNT(t.Quantitat)<=${receivedPOST.max2} `
    }
    ands++
    having++
  }
  query+=";"
    try {
      
      var data = await utils.queryDatabase(query)
      await utils.wait(1500)
      if (data.length > 0) {
        result = { status: "OK", result: data }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
    } catch (error) {
      console.log(error);
      result = { status: "KO", result: "Unkown type" }
    }
    res.end(JSON.stringify(result))
}

// Fetch especific profile
async function getProfile(req,res){
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }

  if(receivedPOST.session){
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE session_token='${receivedPOST.session}';`)

    if(data[0].front){
      var base64 = await fs.readFile(`../private/${data[0].front}`, { encoding: 'base64'})
      data[0].front=base64

    }
    // TODO HERE
    if(data[0].back){
      var base64 = await fs.readFile(`../private/${data[0].back}`, { encoding: 'base64'})
      data[0].back=base64

    } 

    await utils.wait(1500)
    if (data.length > 0) {
      result = { status: "OK", result: data[0] }
      return res.send(result)
    }
    else{
      return res.send(result)
    }
  }

  if(!receivedPOST.id ){return res.end(JSON.stringify(result))}
  let id
  try {
     id=Number.parseInt(receivedPOST.id)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "id is invalid" }))
  }

  if(Number.isNaN(id)) return res.end(JSON.stringify({ status: "KO", result: "id is invalid" }))

  try {
    var data = await utils.queryDatabase(`SELECT id,name,surname,phone,session_token,wallet,email,status FROM Usuaris WHERE id=${id};`)

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

// validate DNI
async function validateUser(req,res){
  let receivedPOST = await post.getPostObject(req)
  // change DESKTOP to work with id instead the phone
  if(!receivedPOST.id||!receivedPOST.status){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }
  let id
  try {
     id=Number.parseInt(receivedPOST.id)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "id is invalid" }))
  }

  if(Number.isNaN(id)) return res.end(JSON.stringify({ status: "KO", result: "id is invalid" }))

  let exists=await utils.queryDatabase(`SELECT * FROM Usuaris WHERE id=${id}`)

  if(exists.length==0){return res.end(JSON.stringify({ status: "KO", result: "User dont exists" }))}

  let status
  try {
     status=Number.parseInt(receivedPOST.status)
  } catch (error) {
    return res.end(JSON.stringify({ status: "KO", result: "status is invalid" }))
  }

  if(Number.isNaN(status)) return res.end(JSON.stringify({ status: "KO", result: "status is invalid" }))

  if(status!=1 && status!=2 && status!=3 && status!=4){
    return res.end(JSON.stringify({ status: "KO", result: "status is invalid" }))
  }

  await utils.queryDatabase(`UPDATE Usuaris SET status = '${status}' WHERE id='${id}';`)
  return res.end(JSON.stringify({ status: "OK", result: "Status updated!" }))

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
    var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone=${receivedPOST.phone} OR email='${receivedPOST.email}';`)
    
    if (data.length > 0) {
      result = { status: "KO", result: "User already exists" }
    } else {
      
      var passwd=await utils.encriptPassword(receivedPOST.password)
      if(!passwd) return res.end(JSON.stringify({ status: "KO", result: "ERROR parse password" }))
      let session=await utils.uniqueToken()
      if(!session) return res.end(JSON.stringify({ status: "KO", result: "ERROR make token" }))
      await utils.queryDatabase(`INSERT INTO Usuaris (phone,name,surname,email,password,session_token) VALUES('${phone}','${receivedPOST.name}','${receivedPOST.surname}','${receivedPOST.email}','${passwd}','${session}');`)
      data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE phone='${receivedPOST.phone}';`)
      result = { status: "OK", result: session,data:data[0] }
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

  if(receivedPOST.session){
    let pass=await utils.validateSession(receivedPOST.session)
    let temp1=await utils.queryDatabase(`SELECT * FROM Usuaris Where session_token = '${receivedPOST.session}';`)
    if(pass==true) return res.end(JSON.stringify({ status: "OK", result: "TOKEN OK!",data:temp1[0] }))
  }

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
        let session=await utils.uniqueToken()
        if(!session) return res.end(JSON.stringify({ status: "KO", result: "ERROR make token" }))
        await utils.queryDatabase(`UPDATE Usuaris SET session_token = '${session}' WHERE email='${receivedPOST.email}';`)
        let temp=await utils.queryDatabase(`SELECT * FROM Usuaris Where session_token = '${session}' AND email='${receivedPOST.email}';`)
        result={ status: "OK", result: session,data:temp[0] }
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

async function transactionDetailsByUser(req,res){
  let receivedPOST = await post.getPostObject(req)
  let result = { status: "KO", result: "Invalid param" }
  // change phone to id in desktop
  if(!receivedPOST.id && !receivedPOST.session){return res.end(JSON.stringify(result))}
  let id
  if(!receivedPOST.session){
    try {
       id=Number.parseInt(receivedPOST.id)
    } catch (error) {
      return res.end(JSON.stringify({ status: "KO", result: "id is invalid" }))
    }

  } else{
    let user=await utils.queryDatabase(`SELECT * FROM Usuaris WHERE session_token='${receivedPOST.session}';`)
    if(user.length==0){
      return res.end(JSON.stringify({ status: "KO", result: "token is invalid" }))
    }
    id=user[0].id
  }

  if(Number.isNaN(id)) return res.end(JSON.stringify({ status: "KO", result: "id is invalid" }))

  try {
    var user=await utils.queryDatabase(`SELECT * FROM Usuaris where id='${id}'`)
    if (user.length > 0) {
      user=user[0];
    }
    else{return res.end(JSON.stringify({ status: "KO", result: "user invalid" }))}
    var data = await utils.queryDatabase(`SELECT * FROM Transaccions WHERE Origen=${user.id} OR Desti=${user.id};`)
    let endResults=[];
    if (data.length > 0) {
      await Promise.all(data.map(async element => {
        if(element.Origen && element.Desti){

          if(element.Origen==user.id){
            var user2=await utils.queryDatabase(`SELECT * FROM Usuaris where id='${element.Desti}'`)
            user2=user2[0]
            endResults.push({
              text:"Has transferit: "+element.Quantitat+" al telefon: "+user2.phone+" del usuari: "+user2.name,
              dataJson:element,
              wallet:user.wallet
            })
          }
          else{
            var user2=await utils.queryDatabase(`SELECT * FROM Usuaris where id='${element.Origen}'`)
            user2=user2[0]
            endResults.push({
              text:"Has rebut: "+element.Quantitat+" del telefon: "+user2.phone+" del usuari: "+user2.name,
              dataJson:element,
              wallet:user.wallet
            })
          }
        }
          
        }))
      
      result = { status: "OK", result: endResults }
    }
    await utils.wait(1500)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    
  } catch (error) {
    console.log(error);
    result = { status: "KO", result: "Connection to database error" }
  }
  res.end(JSON.stringify(result))
}

// VALIDATION FUNCTION
async function validateSession(req,res,next){
  console.log("validation in progress");
  let received = await post.getPostObject(req)
  let result = { status: "KO", result: "no session token" }
  if(!received.session) return res.end(JSON.stringify(result))
  let pass=await utils.validateSession(received.session)
  if(!pass || !received) return res.end(JSON.stringify(result))
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
  phone=datatemp[0].id
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
  phone=datatemp[0].id

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

    var data2 = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE id='${desti}';`)
    
    if (data2.length == 0) {
      return res.end(JSON.stringify({ status: "KO", result: "Transaction Phone is invalid" }))
    }
    data2=data2[0]

    if(data.phone==data2.phone){
      return res.end(JSON.stringify({ status: "KO", result: "Cant pay that, youre the owner!" }))
    }

    let now= date.format(new Date(),'YYYY/MM/DD HH:mm:ss');
    await utils.queryDatabase(`SET AUTOCOMMIT=0`)
    await utils.queryDatabase(`START TRANSACTION;`)
    await utils.queryDatabase(`UPDATE Transaccions SET Origen=${data.id},Accepted=1,TimeAccept='${now}' WHERE token='${token}'`)
    await utils.queryDatabase(`UPDATE Usuaris SET wallet=${Number.parseInt(data.wallet) - Number.parseInt(transacction.Quantitat)} WHERE id=${data.id}`)
    await utils.queryDatabase(`UPDATE Usuaris SET wallet=${Number.parseInt(data2.wallet) + Number.parseInt(transacction.Quantitat)} WHERE id=${data2.id}`)
    await utils.queryDatabase(`COMMIT;`)
    // await utils.queryDatabase(`END TRANSACTION;`)
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

async function sendId(req,res){
  let result = { status: "KO", result: "Invalid param" }
  
  if(!recivedJson.front && !recivedJson.back){
    return res.end(JSON.stringify({ status: "KO", result: "Bad request" }))
  }
  var data = await utils.queryDatabase(`SELECT * FROM Usuaris WHERE session_token='${recivedJson.session}';`)
  data=data[0]

 

// Guardar les dades binaries en un arxiu (a la carpeta ‘private’ amb el nom original)
  const path = "../private"
  await fs.mkdir(path, { recursive: true }) // Crea el directori si no existeix
  

  
  try {
    if(recivedJson.front){
      const file1 = Buffer.from(recivedJson.front, 'base64');
      let name=utils.makeToken(20)
      await fs.writeFile(`${path}/${name}`, file1)
      console.log(file1);
      if(!data.back){
        await utils.queryDatabase(`UPDATE Usuaris SET front='${name}' WHERE id=${data.id};`)
      }else{
        await utils.queryDatabase(`UPDATE Usuaris SET front='${name}',status=2 WHERE id=${data.id};`)
      }
      
    }
    if(recivedJson.back){
    const file2 = Buffer.from(recivedJson.back, 'base64');
    let name=utils.makeToken(20)
      await fs.writeFile(`${path}/${name}`, file2)
      console.log(file2);
    console.log(file2);
    if(!data.front){
      await utils.queryDatabase(`UPDATE Usuaris SET back='${name}' WHERE id=${data.id};`)
    }else{
      await utils.queryDatabase(`UPDATE Usuaris SET back='${name}',status=2 WHERE id=${data.id};`)
    }
    
    }
    

    return res.end(JSON.stringify({status:"OK",result:"files uploaded"}))
  } catch (error) {
    return res.end(JSON.stringify(result))
  }

}


module.exports = { router,test }