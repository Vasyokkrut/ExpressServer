const JWT = require('jsonwebtoken')

const { JWTSecretKey } = require('./env.js')

// this middleware verifies JWT
// if token is valid it calls next() function
// otherwise is responds with status 403
// it also puts the data from token to req.user
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]
    
    if (!token) return res.sendStatus(401)

    JWT.verify(token, JWTSecretKey, (err, user) => {
        if(err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

exports.verifyJWT = verifyJWT
