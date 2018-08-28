import * as mysql from 'promise-mysql'
const Bluebird = require('bluebird')
const SqlString = require('sqlstring')

// Direct require dotenv, see https://www.npmjs.com/package/dotenv#usage
require('dotenv').config()

let dbname

// Set database name according to NODE_ENV
switch (process.env.NODE_ENV) {
  case 'test':
    dbname = 'test_db'
    break
  case 'development':
    dbname = 'development_db'
    break
  case 'production':
    dbname = 'production_db'
    break
  default:
    dbname = 'development_db'
}

// Create connection pool
let connection = mysql.createPool({
  connectionLimit: process.env.DB_CONNECTIONLIMIT,
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: dbname
})
// Convert connection to promises
export let db = Bluebird.promisifyAll(connection)

// Funtion to get connection on requets 
export function getConnection () {
  return db.getConnection().disposer((connection) => {
    // Automatically release conection to pool after use
    db.releaseConnection(connection)
  })
}

export let query = (sql, value) => {
  // Convert all sql imputs to strings || prevents SQL injection
  let sqlquery = SqlString.format(sql, value)
  // Log all sql queries 
  if (process.env.LOG_SQL_QUERY) {
    console.log(sqlquery.green)
  }
  // Return new promise
  return new Bluebird((resolve, reject) => {
    // Get a connection from pool
    Bluebird.using(getConnection(), (connection) => {
      // Execute the query with connection 
      return connection.query(sqlquery)
      .then((rows) => {
        // If empty result
        if (rows.length === 0) {
          // return empty object
          resolve({})
        }
        // If only one result
        if (rows.length === 1) {
          // return result object
          resolve(rows[0])
        } 
        // If more than one result
        else {
          let data = []
          if (rows.length) {
            for (var i = 0; i < rows.length; i++) { data.push(JSON.parse(JSON.stringify(rows[i]))) }
          }
          // Return result as array of objects
          resolve(data)
        }
      }).catch((error) => {
        // Log error
        if (process.env.LOG_SQL_ERROR) {
          console.log(error)
        } 
        // Reject with error code
        reject(error.code)
      })
    })
  })
}

