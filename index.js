import app from './config/express'
require('colors')
let port

if (process.env.NODE_ENV === 'test') {
  // Set port for Tests
  port = process.env.TEST_PORT
} else {
  // Set port for development/production
  port = process.env.PORT
}

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Express server listening on port ${port}.\
    \nEnvironment: ${process.env.NODE_ENV}`.green)
})

export default server
