const express = require('express')
const fs = require('fs/promises')
const url = require('url')
const post = require('./post.js')
const { v4: uuidv4 } = require('uuid')
const mysql=require('mysql2')
const api=require('./functions/API.js')

// Start HTTP server
const app = express()

// Set port number
const port = process.env.PORT || 3000

// Publish static files from 'public' folder
app.use(express.static('public'))

// Activate HTTP server
const httpServer = app.listen(port, appListen)
function appListen () {
  console.log(`Listening for HTTP queries on: cornapigrupo6-production.up.railway.app:${port}`)
}
process.on("SIGINT", () => {
  console.log("Closing http server");
  httpServer.close()
})

app.get('/test', api.test) // TEST ENDPOINT WITH GET

app.use('/API', api.router)

app.use((req,res)=>{
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({status:"KO",result:"ERROR 404"}))
});