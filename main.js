require('dotenv').config()
if (!process.env.MONGOURL) throw new Error('MONGOURL env variable doesn\'t exist')
if (!process.env.SERVERPORT) throw new Error('SERVERPORT env variable doesn\'t exist')
if (!process.env.ACCESSSECRETKEY) throw new Error('ACCESSSECRETKEY env variable doesn\'t exist')
if (!process.env.REFRESHSECRETKEY) throw new Error('REFRESHSECRETKEY env variable doesn\'t exist')
if (!process.env.ACCESSTOKENLIFETIME) throw new Error('ACCESSTOKENLIFETIME env variable doesn\'t exist')
if (!process.env.REFRESHTOKENLIFETIME) throw new Error('REFRESHTOKENLIFETIME env variable doesn\'t exist')

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
console.log('Connecting to DB, starting server...')
mongoose.connect(MONGOURL, mongoSettings)
    .then(() => {
        console.log('DB connected')
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
