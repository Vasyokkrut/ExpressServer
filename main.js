const mongoose = require('mongoose')

const { mongoURL, mongoSettings } = require('./env.js')
const { app } = require('./appRoot.js')

// connecting to mongodb server
mongoose.connect(mongoURL, mongoSettings)
    .then(() => {
        console.log('DB connected')
        app.listen(5000, () => console.log('Server started'))
    })
    .catch(error => {
        console.log('Cannot connect to DB. Error:', error.message)
        process.exit(1)
    })


// properly disconnecting from database when server stopped
function exitFromServer() {
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
