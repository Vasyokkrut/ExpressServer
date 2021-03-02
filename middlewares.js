const JWT = require('jsonwebtoken')

const { JWTSecretKey } = require('./env.js')

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]
    
    if (!token) return res.sendStatus(401)

    JWT.verify(token, JWTSecretKey, (err, user) => {
        if(err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

exports.authenticateToken = authenticateToken
