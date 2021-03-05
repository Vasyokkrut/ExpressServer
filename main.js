const path = require('path')
const cors = require('cors')
const bcrypt = require('bcrypt')
const express = require('express')
const JWT = require('jsonwebtoken')
const mongoose = require('mongoose')
const fileUpload = require('express-fileupload')

const { User } = require('./models.js')
const { apiRoutes } = require('./apiRoutes.js')
const { JWTSecretKey, mongoURL, mongoSettings } = require('./env.js')

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

// connecting to mongodb server
mongoose.connect(mongoURL, mongoSettings)
    .catch(error => {throw error})
    .then(() => console.log('DB Connected'))

app.post('/register', (req, res) => {
    const userName = req.body.login
    const checkUserName = RegExp('^' + userName + '$', 'i')
    User.find({name:checkUserName}, (err, ans) => {
        if(err) return res.sendStatus(500)
        if (ans.length!==0) {
            return res.sendStatus(208)
        }
        const passwordHash = bcrypt.hashSync(req.body.password, 10)
        const newUser = {
            name:userName,
            password:passwordHash,
            posts:[{fileName:'example.jpg',name:'This is your first post'}]
        }
        const user = new User(newUser)
        user.save()
            .catch(() => res.sendStatus(500))
            .then(() => res.sendStatus(201))
    })
})

app.post('/login', (req, res) => {
    const login = req.body.login
    const password = req.body.password
    User.find({name:login}, (err, ans) => {
        if(err) return res.sendStatus(500)
        if(ans.length === 0) return res.status(400).json({status: 'wrong password or login'})
        let isPasswordCorrect = bcrypt.compareSync(password, ans[0].password)
        if(isPasswordCorrect) {
            JWT.sign({ login }, JWTSecretKey, { algorithm: 'HS512' }, (err, token) => {
                if(err) return res.sendStatus(500)
                res.status(200).json({status:'user found', JWTToken: token})
            })
        } else {
            res.status(400).json({status: 'wrong password or login'})
        }
    })
})

app.get('/downloadPicture/:pictureName', (req, res) => {
    const pictureName = req.params.pictureName
    res.download(`${__dirname}/images/${pictureName}`)
})

// '/' endpoint responds index.html file
// which is entrypoint to start page
app.get('/', (_, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

// '/publicPosts' endpoint responds index.html file
// which is entrypoint to public posts page
app.get('/publicPosts', (_, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

// '/userPosts/*' endpoint responds index.html file
// which is entrypoint to user posts page
app.get('/userPosts/*', (_, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

async function exitFromServer() {
    await mongoose.disconnect()
    console.log('stopped')
    process.exit(0)
}

process.on('SIGINT', exitFromServer).on('SIGTERM', exitFromServer)

app.listen(5000, () => {console.log('Server started')})
