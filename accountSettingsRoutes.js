const bcrypt = require('bcrypt')
const express = require('express')
const JWT = require('jsonwebtoken')

const { User } = require('./models.js')
const { JWTSecretKey } = require('./env.js')
const { authenticateToken } = require('./middlewares.js')

const accountSettingsRouter = express.Router()

accountSettingsRouter.patch('/changeNickname', authenticateToken, (req, res) => {
    const newNickname = req.body.newNickname
    const currentUserName = req.user.login
    const allowedSymbols = /^[A-Za-z0-9]+$/

    // new nickname could contain only letters and numbers
    if (!allowedSymbols.test(newNickname)) return res.sendStatus(406)

    // check is new nickname contains any kind of spaces or endlines
    if (/\s/.test(newNickname)) return res.sendStatus(406)

    const checkUserName = RegExp('^' + newNickname + '$', 'i')

    User.findOne({name: checkUserName}, (err, doc) => {

        if (err) return res.sendStatus(500)

        // check if user found, but this is not the same user
        if (doc) {
            const isTheSameUser = RegExp('^' + doc.name + '$', 'i').test(currentUserName)
            if (!isTheSameUser) return res.status(200).json({userExists: true})
        }

        // searching user by it's current nickname and replacing it by new one
        User.findOneAndUpdate(
            {name: currentUserName},
            {$set: {name: newNickname}},
            {new: true},
            err => {

                if (err) return res.sendStatus(500)

                // generating new json web token for user
                JWT.sign(
                    { login: newNickname },
                    JWTSecretKey,
                    { algorithm: 'HS512' },
                    (err, token) => {
                        if(err) return res.sendStatus(500)
                        res.status(200).json({newJWTToken: token})
                    }
                )

            }
        )

    })

})

accountSettingsRouter.patch('/changePassword', authenticateToken, (req, res) => {

    const newPassword = req.body.newPassword
    const userName = req.user.login
    const allowedSymbols = /^[A-Za-z0-9]+$/

    // new password could contain only letters and numbers
    if (!allowedSymbols.test(newPassword)) return res.sendStatus(406)

    // check is new password contains any kind of spaces or endlines
    if (/\s/.test(newPassword)) return res.sendStatus(406)

    const passwordHash = bcrypt.hashSync(req.body.newPassword, 10)

    User.findOneAndUpdate(
        {name: userName},
        {$set: {password: passwordHash}},
        {new: true},
        err => {

            if (err) return res.sendStatus(500)

            res.sendStatus(200)

        }
    )
})

accountSettingsRouter.delete('/deleteAccount', authenticateToken, (req, res) => {
    User.findOneAndDelete({name: req.user.login}, err => {
        if (err) return res.sendStatus(500)

        res.sendStatus(200)
    })
})

exports.accountSettingsRouter = accountSettingsRouter
