const ms = require('ms')
const bcrypt = require('bcrypt')
const express = require('express')
const JWT = require('jsonwebtoken')

const { User } = require('../models.js')
const { verifyJWT } = require('../middlewares.js')

const accessSecretKey = process.env.ACCESSSECRETKEY
const accessTokenLifetime = process.env.ACCESSTOKENLIFETIME
const accessCookieLifetime = ms(accessTokenLifetime)
const refreshSecretKey = process.env.REFRESHSECRETKEY
const refreshTokenLifetime = process.env.REFRESHTOKENLIFETIME
const refreshCookieLifetime = ms(refreshTokenLifetime)
const accountSettingsRouter = express.Router()

accountSettingsRouter.patch('/changeUserName', verifyJWT, (req, res) => {
    const password = req.body.password
    const newUserName = req.body.newUserName
    const currentUserName = req.user.name
    const allowedSymbols = /^[A-Za-z0-9]+$/

    // current password and new username cannot be empty
    if (!password) return res.sendStatus(406)
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
            if (!isTheSameUser) return res.json({userExists: true})
        }

        // searching user by it's current username
        User.findOne({name: currentUserName}, (err, doc) => {
            if (err) return res.sendStatus(500)
            if (!doc) return res.sendStatus(404)

            // confirm password
            bcrypt.compare(password, doc.password, (err, same) => {
                if (err) return res.sendStatus(500)
                if (!same) return res.sendStatus(400)

                // if password has been confirmed, update username
                User.findOneAndUpdate(
                    {name: currentUserName},
                    {$set: {name: newUserName}},
                    {new: true},
                    (err, doc) => {
                        if (err) return res.sendStatus(500)
        
                        // generating new access jwt for user
                        JWT.sign(
                            { name: newUserName, _id: doc._id },
                            accessSecretKey,
                            { algorithm: 'HS256', expiresIn: accessTokenLifetime },
                            (err, newAccessToken) => {
                                if (err) return res.sendStatus(500)
                                
                                // generating new refresh jwt for user
                                JWT.sign(
                                    { name: newUserName, _id: doc._id, password: doc.password },
                                    refreshSecretKey,
                                    { algorithm: 'HS512', expiresIn: refreshTokenLifetime },
                                    (err, newRefreshToken) => {
                                        if (err) return res.sendStatus(500)
        
                                        // set new tokens to cookies
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
    })
})

accountSettingsRouter.patch('/changePassword', verifyJWT, (req, res) => {
    const oldPassword = req.body.oldPassword
    const newPassword = req.body.newPassword
    const userName = req.user.name
    const allowedSymbols = /^[A-Za-z0-9]+$/

    // old password and new password cannot be empty
    if (!oldPassword) return res.sendStatus(406)
    if (!newPassword) return res.sendStatus(406)

    // new password could contain only letters and numbers
    if (!allowedSymbols.test(newPassword)) return res.sendStatus(406)

    // find user in DB to compare passwords
    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)

        // comparing old password entered by user on website
        // with current password in DB
        bcrypt.compare(oldPassword, doc.password, (err, same) => {
            if (err) return res.sendStatus(500)
            if (!same) return res.sendStatus(400)

            // if current password confirmed, hash new password
            bcrypt.hash(newPassword, 10, (err, passwordHash) => {
                if (err) return res.sendStatus(500)

                // find user and update password hash
                User.findOneAndUpdate(
                    {name: userName},
                    {$set: {password: passwordHash}},
                    {new: true},
                    (err, doc) => {
                        if (err) return res.sendStatus(500)

                        // since only password changed,
                        // we shouldn't reissue access token for user, only refresh token
                        JWT.sign(
                            { name: doc.name, _id: doc._id, password: passwordHash },
                            refreshSecretKey,
                            { algorithm: 'HS512', expiresIn: refreshTokenLifetime },
                            (err, newRefreshToken) => {
                                if (err) return res.sendStatus(500)

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
            })
        })
    })
})

accountSettingsRouter.delete('/deleteAccount', verifyJWT, (req, res) => {
    const userName = req.user.name
    const password = req.body.password

    // password cannot be empty
    if (!password) return res.sendStatus(406)

    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)

        bcrypt.compare(password, doc.password, (err, same) => {
            if (err) return res.sendStatus(500)
            if (!same) return res.sendStatus(400)

            User.findOneAndDelete({name: userName}, err => {
                if (err) return res.sendStatus(500)
        
                res.clearCookie('accessToken', { path: '/api' })
                res.clearCookie('refreshToken', { path: '/api/account/getNewAccessToken' })
                res.sendStatus(200)
            })
        })
    })
})

exports.accountSettingsRouter = accountSettingsRouter
