if (process.env.NODE_ENV !== 'production') require('dotenv').config()

if (process.env.NODE_ENV) {
    switch (process.env.NODE_ENV) {
        case 'production':
            console.log('server is starting in production mode')
            break
        case 'development':
            console.log('server is starting in development mode')
            break
        case 'test':
            console.log('server is starting in testing mode')
            break
        default:
            console.log('server is starting with unknown NODE_ENV variable')
    }
} else {
    console.log('NODE_ENV is unset, dont forget to set it in production')
}

if (!process.env.MONGOURL) throw new Error('MONGOURL env variable is unset')
if (!process.env.SERVERPORT) throw new Error('SERVERPORT env variable is unset')
if (!process.env.ACCESSSECRETKEY) throw new Error('ACCESSSECRETKEY env variable is unset')
if (!process.env.REFRESHSECRETKEY) throw new Error('REFRESHSECRETKEY env variable is unset')
if (!process.env.ACCESSTOKENLIFETIME) throw new Error('ACCESSTOKENLIFETIME env variable is unset')
if (!process.env.REFRESHTOKENLIFETIME) throw new Error('REFRESHTOKENLIFETIME env variable is unset')

const mongoose = require('mongoose')

const { app } = require('./appRoot.js')

const SERVERPORT = +process.env.SERVERPORT
const MONGOURL = process.env.MONGOURL
const mongoSettings = {
    useNewUrlParser: true,
    useFindAndModify:false,
    useUnifiedTopology: true
}

// connecting to mongodb server
console.log('Connecting to DB...')
mongoose.connect(MONGOURL, mongoSettings)
    .then(() => {
        console.log('DB connected, starting server...')
        app.listen(SERVERPORT, () => console.log('Server started'))
    })
    .catch(error => {
        console.log('Cannot connect to DB. Error:', error.message)
        process.exit(1)
    })


// properly disconnecting from database when server stopped
function exitFromServer() {
    console.log('Disconnecting from DB, stopping server...')
    mongoose.disconnect()
        .then(() => {
            console.log('Server stopped successfully')
            process.exit(0)
        })
        .catch(error => {
            console.log('Error when disconnecting from DB. Error:', error.message)
            process.exit(1)
        })
}

process.on('SIGINT', exitFromServer).on('SIGTERM', exitFromServer)
