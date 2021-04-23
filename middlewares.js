const JWT = require('jsonwebtoken')

const accessSecretKey = process.env.ACCESSSECRETKEY

// this middleware verifies JWT
// if token is valid it calls next() function
// otherwise is responds with status 403
// it also puts the data from token to req.user
function verifyJWT(req, res, next) {
    const authCookie = req.cookies.accessToken
    const token = authCookie && authCookie.split(' ')[1]
    
    if (!token) return res.sendStatus(401)

    JWT.verify(token, accessSecretKey, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

exports.verifyJWT = verifyJWT
