const ms = require('ms')
const bcrypt = require('bcrypt')
const express = require('express')
const JWT = require('jsonwebtoken')

const { User } = require('./models.js')
const { verifyJWT } = require('./middlewares.js')

const accessSecretKey = process.env.ACCESSSECRETKEY
const accessTokenLifetime = process.env.ACCESSTOKENLIFETIME
const accessCookieLifetime = ms(accessTokenLifetime)
const refreshSecretKey = process.env.REFRESHSECRETKEY
const refreshTokenLifetime = process.env.REFRESHTOKENLIFETIME
const refreshCookieLifetime = ms(refreshTokenLifetime)
const accountSettingsRouter = express.Router()

accountSettingsRouter.patch('/changeUserName', verifyJWT, (req, res) => {
    const newUserName = req.body.newUserName
    const currentUserName = req.user.userName
    const allowedSymbols = /^[A-Za-z0-9]+$/

    // new username cannot be empty
    if (!newUserName) return res.sendStatus(406)

    // new username could contain only letters and numbers
    if (!allowedSymbols.test(newUserName)) return res.sendStatus(406)

    // check is new username contains any kind of spaces or endlines
    if (/\s/.test(newUserName)) return res.sendStatus(406)

    const regexUserName = RegExp('^' + newUserName + '$', 'i')

    User.findOne({name: regexUserName}, (err, doc) => {

        if (err) return res.sendStatus(500)

        // check if user found, but this is not the same user
        if (doc) {
            const isTheSameUser = RegExp('^' + doc.name + '$', 'i').test(currentUserName)
            if (!isTheSameUser) return res.status(200).json({userExists: true})
        }

        // searching user by it's current username and replacing it by new one
        User.findOneAndUpdate(
            {name: currentUserName},
            {$set: {name: newUserName}},
            {new: true},
            err => {

                if (err) return res.sendStatus(500)

                // generating new json web token for user
                JWT.sign(
                    { userName: newUserName },
                    accessSecretKey,
                    { algorithm: 'HS256', expiresIn: accessTokenLifetime },
                    (err, newAccessToken) => {
                        if (err) return res.sendStatus(500)
                        
                        JWT.sign(
                            { userName: newUserName },
                            refreshSecretKey,
                            { algorithm: 'HS512', expiresIn: refreshTokenLifetime },
                            (err, newRefreshToken) => {
                                if (err) return res.sendStatus(500)

                                res.cookie(
                                    'accessToken',
                                    'Bearer ' + newAccessToken,
                                    {
                                        path: '/api',
                                        secure: true,
                                        httpOnly: true,
                                        sameSite: 'strict',
                                        maxAge: accessCookieLifetime
                                    }
                                )
                                res.cookie(
                                    'refreshToken',
                                    'Bearer ' + newRefreshToken,
                                    {
                                        secure: true,
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
            }
        )
    })
})

accountSettingsRouter.patch('/changePassword', verifyJWT, (req, res) => {
    const newPassword = req.body.newPassword
    const userName = req.user.userName
    const allowedSymbols = /^[A-Za-z0-9]+$/

    // new password cannot be empty
    if (!newPassword) return res.sendStatus(406)

    // new password could contain only letters and numbers
    if (!allowedSymbols.test(newPassword)) return res.sendStatus(406)

    // check is new password contains any kind of spaces or endlines
    if (/\s/.test(newPassword)) return res.sendStatus(406)

    
    bcrypt.hash(req.body.newPassword, 10, (err, result) => {
        if (err) return res.sendStatus(500)

        User.findOneAndUpdate(
            {name: userName},
            {$set: {password: result}},
            {new: true},
            err => {
                if (err) return res.sendStatus(500)

                res.sendStatus(200)
            }
        )
    })
})

accountSettingsRouter.delete('/deleteAccount', verifyJWT, (req, res) => {
    User.findOneAndDelete({name: req.user.userName}, err => {
        if (err) return res.sendStatus(500)

        res.sendStatus(200)
    })
})

exports.accountSettingsRouter = accountSettingsRouter
