const express = require('express')
const path = require('path')
const crypto = require('crypto')
const url = require('url')
const request = require('request')
const odb = require('odb')
const dropboxConfig = require('./../dropbox.config.js')

let app = express()

const env = process.env.NODE_ENV || 'dev'
const isProduction = env === 'production'

const generateCSRFToken = () => crypto.randomBytes(18).toString('base64').replace(/\//g, '-').replace(/\+/g, '_')

const generateRedirectURI = (req) => {
 return url.format({
    protocol: req.protocol,
    host: req.headers.host,
    pathname: `${app.path()}/exchange`
  })
}


app.get('/', (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"); 
  let csrfToken = generateCSRFToken()
  console.log(csrfToken)
  res.cookie('csrf', csrfToken)
  let { username } = req.query
  console.log(req.query)
  res.cookie('username', username)
  res.redirect(url.format({
    protocol: 'https',
    hostname: 'www.dropbox.com',
    pathname: '/oauth2/authorize',
    query: {
      client_id: dropboxConfig.app_key,
      response_type: 'code',
      state: csrfToken,
      redirect_uri: generateRedirectURI(req)
    }
  }))
})

app.get('/exchange', (req, res) => {
  if(req.query.error) {
    return res.send(`Oops! ${req.query.error}: ${req.query.error_description}`)
  }

  // check csrf token
  if(req.query.state !== req.cookies.csrf) {
    return res.status(401).send('CSRF token mismatch, possible cross-site request (forgery attempt)')
  }

  // exchage access code for bearer token
  request.post('https://api.dropbox.com/oauth2/token', {
    form: {
      code: req.query.code,
      grant_type: 'authorization_code',
      redirect_uri: generateRedirectURI(req),
      client_id: dropboxConfig.app_key,
      client_secret: dropboxConfig.app_secret
    }
  }, (err, response, body) => {
    // console.log('my body', JSON.parse(body).access_token, req.query.code, generateRedirectURI(req))
    let { error, access_token } = JSON.parse(body)
    if(error) {
      return res.send(`Opps! ${data.error}`)
    }

    // get bearer token
    // let token = data.access_token

    let username = req.cookies.username

    request.post('https://api.dropboxapi.com/2/users/get_current_account', {
      headers: { Authorization: `Bearer ${access_token}` }
    }, (error, response, body) => {
      let data = JSON.parse(body)
      odb.updateUser('username', username, 'dropboxToken', access_token, (error) => {
        if(error) {
          console.log('there was an error', error)
        } else {
          res.redirect(url.format({
            protocol: req.protocol,
            host: req.headers.host,
            pathname: '/',
            query: {
              name: data.name.display_name,
              email: data.email,
            }
          }))
        }
      })
    })
  })
})

export default app