async function test (req,res){
    let result = { status: "KO", result: "Unkown type" }
    var test = await queryDatabase("SELECT * FROM Usuaris;")
        await wait(1500)
        if (test.length > 0) {
          result = { status: "OK", result: test }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(result))
}

// Fetch all profiles
async function getProfiles(req,res){
    let result = { status: "KO", result: "Unkown type" }
    var test = await queryDatabase("SELECT * FROM Usuaris;")
        await wait(1500)
        if (test.length > 0) {
          result = { status: "OK", result: test }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(result))
}

// Perform a query to the database
function queryDatabase (query) {

    return new Promise((resolve, reject) => {
      var connection = mysql.createConnection({
        host: process.env.MYSQLHOST || "containers-us-west-16.railway.app",
        port: process.env.MYSQLPORT || 6850,
        user: process.env.MYSQLUSER || "root",
        password: process.env.MYSQLPASSWORD || "WTQPaZyER1KEdRXHNG6S",
        database: process.env.MYSQLDATABASE || "railway"
      });
  
      connection.query(query, (error, results) => { 
        if (error) reject(error);
        resolve(results)
      });
       
      connection.end();
    })
  }

export default { test,getProfiles }