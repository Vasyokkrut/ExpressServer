// this is very secret key for JWT auth and nobody should know it
// the JWTSecretKey password key string is just an example
// you should change it in production to a large random string
exports.JWTSecretKey = 'JWTSecretKey'

// MongoDB url
exports.mongoURL = 'mongodb://localhost:27017/VasyokkrutProjectDB'

// this is mongoose config object
exports.mongoSettings = {useNewUrlParser: true, useUnifiedTopology: true}
