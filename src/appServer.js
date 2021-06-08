const path = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')

const { apiRouter } = require('./routers/apiRouter.js')

// creating main application object
// and applying middlewares
const app = express()
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => setTimeout(next, 100))
}
app.disable('x-powered-by')
app.use(cookieParser())
app.use(express.json())
app.use('/api', apiRouter)
app.use(express.static(path.resolve(__dirname, '..', 'build')))

// the following endpoints respond index.html file
// which is main file of the application
const indexFile = path.resolve(__dirname, '..', 'build', 'index.html')
app.get('/', (_, res) => {
    res.sendFile(indexFile)
})

app.get('/myMusic', (_, res) => {
    res.sendFile(indexFile)
})

app.get('/userPosts/*', (_, res) => {
    res.sendFile(indexFile)
})

app.get('/accountSettings', (_, res) => {
    res.sendFile(indexFile)
})

app.get('/friends', (_, res) => {
    res.sendFile(indexFile)
})

exports.app = app
