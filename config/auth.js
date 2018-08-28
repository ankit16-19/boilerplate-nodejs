import * as jwt from 'jwt-simple'
import { db, query } from './db'
import { Strategy, ExtractJwt } from 'passport-jwt'
const bcrypt = require('bcrypt')
const moment = require('moment')
const Promise = require('bluebird')
const passport = require('passport')
const uuid = require('uuid/v4')
const { validationResult } = require('express-validator/check')

// Generate custom strategy for passport
function getStrategy () {
  // Options for strategy
  let options = {
    secretOrKey: process.env.JWT_SECRET,
    // TODO: get api key name from .env
    jwtFromRequest: ExtractJwt.fromHeader('x-api-key'),
    passReqToCallback: true
  }
  // new strategy
  return new Strategy(options, (req, payload, done) => {
    db.query('SHOW * FROM users WHERE email=' + payload.email, (row, err) => {
      if (err) {
        return done(err, false)
      }
      if (row) {
        return done(null, row)
      } else {
        return done(null, false)
      }
    })
  })
}

export let auth = {
  // Initializes the passport session for the user.
  initialize: () => {
    // use 'jwt' as strategy name
    passport.use('jwt', getStrategy())
    return passport.initialize()
  },

  // Autenticate Request using 'jwt' strategy
  authenticate: callback => passport.authenticate(
    'jwt',
    {sesson: false, failWithError: true},
    callback
  ),

  // Generate token with user data
  genToken: user => {
    // Set token expiry to 7 days
    let expires = moment().utc().add({ days: 7 }).unix()
    // Encode token with user data and expiry using JWT_SECRET
    let token = jwt.encode({
      exp: expires,
      user: user
    }, process.env.JWT_SECRET)
    // Return data
    return {
      token: token,
      expires: moment.unix(expires).format(),
      user: user
    }
  },

  // Decode token with JWT_SECRET
  decode_token: token => jwt.decode(token, process.env.JWT_SECRET),

  // Handles login requests.
  // TODO: Needs investigation
  // login: (req, res) => {
  //   let email = req.body.email
  //   let userPassword = req.body.password
  //   let sql = `SELECT * FROM users WHERE email= ?`
  //   let a = query(sql, [email])
  //   let b = a.then(rows => {
  //     if (!rows) {
  //       throw new Error('Email not registered!')
  //     }
  //     if (rows.email_verified === 0) {
  //       throw new Error('Email not verified!')
  //     }
  //     return bcrypt.compare(userPassword, rows.password)
  //   })
  //   Promise.all([a, b]).then(([rows, result]) => {
  //     if (!result) {
  //       throw new Error('Incorrect credentials!')
  //     }
  //     res.status(200).json({
  //       message: 'Login successful',
  //       token: auth.genToken(rows).token,
  //       user: rows
  //     })
  //   }).catch(err => {
  //     res.status(401).json({message: 'Login failed!', error: err.message})
  //   })
  // },

  // Handles signup requests.
  sign_up: (req, res) => {

    let email = req.body.email
    let unhashedPassword = req.body.password
    let object = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: email,
      // User_type if multiple type of users
      user_type_id: req.body.user_type,
      // Random verification token
      verification_token: uuid()
    }
    // TODO: check if validation is required
    // const errors = validationResult(req)
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({message: 'Error!', error: errors.mapped()})
    // }
    let checkIfEmailUsed = rows => {
      // if user exist reject with error : email already used
      if (rows.length > 0) {
        throw new Error('Email already used!')
      }
      // Return rows
      return rows
    }
    let encryptPassword = rows => {
      return bcrypt.hash(unhashedPassword, parseInt(process.env.SALT_ROUNDS))
    }
    let addUser = hash => {
      let sql = `INSERT INTO users SET ?`
      object.password = hash
      return query(sql, object)
    }
    let sendResponse = row => {
      res.status(200).json({
        message: 'Signup successful!',
        verificationToken: object.verification_token
      })
    }
    let handleError = err => {
      res.status(400).json({message: 'Signup failed!', error: err.message})
    }
    let sql = `SELECT * FROM users WHERE email= ?`
    query(sql, email)
    .then(checkIfEmailUsed)
    .then(encryptPassword)
    .then(addUser)
    .then(sendResponse)
    .catch(handleError)
  },

  // TODO: Needs investigation

  // verify_email: (req, res) => {
  //   let token = req.params.verificationtoken
  //   let sql1 = `UPDATE users u SET u.email_verified = 1
  //             WHERE u.verification_token='${token}'`
  //   let sql2 = `SELECT u.email_verified FROM users u
  //               WHERE u.verification_token='${token}'`
  //   query(sql2).then(row2 => {
  //     if (row2.email_verified === 1) {
  //       res.status(400).json({message: 'Already verified!'})
  //     } else if (row2.email_verified === undefined) {
  //       throw new Error('Invalid verification URL!')
  //     } else {
  //       query(sql1).then(row1 => {
  //         res.status(200).json({message: 'Email verified!'})
  //       })
  //     }
  //   }).catch(err => {
  //     res.status(400).json({error: err.message})
  //   })
  // }
}
