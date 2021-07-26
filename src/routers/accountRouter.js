const ms = require('ms')
const bcrypt = require('bcrypt')
const express = require('express')
const JWT = require('jsonwebtoken')

const { User } = require('../models.js')
const { accountSettingsRouter } = require('./accountSettingsRouter.js')

const accessSecretKey = process.env.ACCESSSECRETKEY
const accessTokenLifetime = process.env.ACCESSTOKENLIFETIME
const accessCookieLifetime = ms(accessTokenLifetime)
const refreshSecretKey = process.env.REFRESHSECRETKEY
const refreshTokenLifetime = process.env.REFRESHTOKENLIFETIME
const refreshCookieLifetime = ms(refreshTokenLifetime)
const isProduction = process.env.NODE_ENV === 'production'

const accountRouter = express.Router()
accountRouter.use('/settings', accountSettingsRouter)

accountRouter.post('/register', (req, res) => {
    const userName = req.body.userName
    const password = req.body.password
    
    const allowedSymbols = /^[A-Za-z0-9]+$/
    if (!userName) return res.sendStatus(406)
    if (!password) return res.sendStatus(406)
    if (!allowedSymbols.test(userName)) return res.sendStatus(406)
    if (!allowedSymbols.test(password)) return res.sendStatus(406)

    const regexUserName = RegExp('^' + userName + '$', 'i')

    User.findOne(
        {name: regexUserName},
        (err, doc) => {
            if (err) return res.sendStatus(500)
            if (doc) return res.sendStatus(208)

            bcrypt.hash(password, 10, (err, passwordHash) => {
                if (err) return res.sendStatus(500)

                const newUser = {
                    name: userName,
                    password: passwordHash,
                    music: [],
                    posts: [{
                        text: 'Hello world!',
                        title: 'This is my first post!',
                        pictureName: 'example.jpg'
                    }],
                    friends: [],
                    incomingFriendRequests: [],
                    outgoingFriendRequests: []
                }
                User.create(newUser, err => {
                    if (err) return res.sendStatus(500)
                    
                    res.sendStatus(201)
                })
            })
        }
    )
})

accountRouter.post('/login', (req, res) => {
    const userName = req.body.userName
    const password = req.body.password

    if (!userName) return res.sendStatus(404)
    if (!password) return res.sendStatus(404)
  
    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        bcrypt.compare(password, doc.password, (err, same) => {
            if (err) return res.sendStatus(500)
            if (!same) return res.sendStatus(400)

            JWT.sign(
                { name: doc.name, _id: doc._id },
                accessSecretKey,
                { algorithm: 'HS256', expiresIn: accessTokenLifetime },
                (err, accessToken) => {
                    if (err) return res.sendStatus(500)

                    JWT.sign(
                        { name: doc.name, _id: doc._id, password: doc.password },
                        refreshSecretKey,
                        { algorithm: 'HS512', expiresIn: refreshTokenLifetime },
                        (err, refreshToken) => {
                            if (err) return res.sendStatus(500)
                            
                            res.cookie(
                                'accessToken',
                                'Bearer ' + accessToken,
                                {
                                    path: '/api',
                                    secure: isProduction,
                                    httpOnly: true,
                                    sameSite: 'strict',
                                    maxAge: accessCookieLifetime
                                }
                            )
                            res.cookie(
                                'refreshToken',
                                'Bearer ' + refreshToken,
                                {
                                    secure: isProduction,
                                    httpOnly: true,
                                    sameSite: 'strict',
                                    maxAge: refreshCookieLifetime,
                                    path: '/api/account/getNewAccessToken'
                                }
                            )
                            res.sendStatus(200)
                        }
                    )
                }
            )
        })
    })
})

accountRouter.get('/getNewAccessToken', (req, res) => {
    const authCookie = req.cookies.refreshToken
    const refreshToken = authCookie && authCookie.split(' ')[1]

    if (!refreshToken) return res.sendStatus(401)

    JWT.verify(refreshToken, refreshSecretKey, (err, user) => {
        if (err) return res.sendStatus(403)

        User.findById(user._id, (err, doc) => {
            if (err) return res.sendStatus(500)
            if (user.password !== doc.password) return res.sendStatus(403)

            JWT.sign(
                { name: doc.name, _id: user._id },
                accessSecretKey,
                { algorithm: 'HS256', expiresIn: accessTokenLifetime },
                (err, newAccessToken) => {
                    if (err) return res.sendStatus(500)

                    res.cookie(
                        'accessToken',
                        'Bearer ' + newAccessToken,
                        {
                            path: '/api',
                            secure: isProduction,
                            httpOnly: true,
                            sameSite: 'strict',
                            maxAge: accessCookieLifetime
                        }
                    )
                    res.sendStatus(200)
                }
            )
        })
    })
})

accountRouter.get('/logout', (req, res) => {
    res.clearCookie('accessToken', { path: '/api' })
    res.clearCookie('refreshToken', { path: '/api/account/getNewAccessToken' })
    res.sendStatus(200)
})

exports.accountRouter = accountRouter
