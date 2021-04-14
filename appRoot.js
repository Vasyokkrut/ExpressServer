const path = require('path')
const cors = require('cors')
const bcrypt = require('bcrypt')
const express = require('express')
const JWT = require('jsonwebtoken')
const fileUpload = require('express-fileupload')

const { User } = require('./models.js')
const { apiRoutes } = require('./apiRoutes.js')

const JWTSecretKey = process.env.JWTSECRETKEY
// creating main application object
// and applying middlewares
const app = express()
app.disable('x-powered-by')
app.use(cors())
app.use(fileUpload())
app.use(express.text())
app.use(express.json())
app.use('/api', apiRoutes)
app.use(express.static(path.resolve(__dirname, 'build')))

app.post('/register', (req, res) => {
    const userName = req.body.login
    const regexUserName = RegExp('^' + userName + '$')

    User.findOne(
        {name: {$regex: regexUserName, $options: 'i'}},
        (err, doc) => {
            if (err) return res.sendStatus(500)
            if (doc) return res.sendStatus(208)

            bcrypt.hash(req.body.password, 10, (err, passwordHash) => {
                if (err) return res.sendStatus(500)

                const newUser = {
                    name: userName,
                    password: passwordHash,
                    music: [],
                    posts: [{pictureName: 'example.jpg', title: 'This is my first post!'}]
                }
                User.create(newUser, err => {
                    if (err) return res.sendStatus(500)
                    
                    res.sendStatus(201)
                })
            })
        }
    )
})

app.post('/login', (req, res) => {
    const userName = req.body.userName
    const password = req.body.password
    
    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        bcrypt.compare(password, doc.password, (err, same) => {
            if (err) return res.sendStatus(500)

            if (same) {
                JWT.sign(
                    { userName },
                    JWTSecretKey,
                    { algorithm: 'HS512' },
                    (err, token) => {
                        if (err) return res.sendStatus(500)
                        res.status(200).json({userJWT: token})
                    }
                )
            } else {
                res.sendStatus(400)
            }
        })
    })
})

app.get('/downloadPicture/:pictureName', (req, res) => {
    const pictureName = req.params.pictureName
    res.download(path.resolve(__dirname, 'pictures', pictureName))
})

// the following endpoints respond index.html file
// which is main file of the application
const indexFile = path.resolve(__dirname, 'build', 'index.html')
app.get('/', (_, res) => {
    res.sendFile(indexFile)
})

app.get('/publicPosts', (_, res) => {
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

exports.app = app
