const express = require('express')
const fileUpload = require('express-fileupload')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cors = require('cors')
const JWT = require('jsonwebtoken')
const path = require('path')

const { User } = require('./models')
const { apiRoutes } = require('./apiRoutes')
const { JWTSecretKey, mongoURL, mongoSettings } = require('./env')

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
    let userName = req.body.login
    let checkUserName = RegExp(`^${userName}$`, 'i')
    User.find({name:checkUserName}, (err, ans) => {
        if(err) return res.sendStatus(500)
        if (ans.length!==0) {
            return res.sendStatus(208)
        }
        let passwordHash = bcrypt.hashSync(req.body.password, 10)
        let newUser = {
            name:userName,
            password:passwordHash,
            posts:[{fileName:'example.jpg',name:'This is your first post'}]
        }
        let user = new User(newUser)
        user.save()
            .catch(() => res.sendStatus(500))
            .then(() => res.sendStatus(201))
    })
})

app.post('/login', (req, res) => {
    let login = req.body.login
    let password = req.body.password
    User.find({name:login}, (err, ans) => {
        if(err) return res.sendStatus(500)
        if(ans.length===0) return res.status(400).json({status:'wrong password or login'})
        let isPasswordCorrect = bcrypt.compareSync(password, ans[0].password)
        if(isPasswordCorrect) {
            JWT.sign({ login }, JWTSecretKey, { algorithm: 'HS512' }, (err, token) => {
                if(err) return res.sendStatus(500)
                res.status(200).json({status:'user found', JWTToken: token})
            })
        } else {
            res.status(400).json({status:'wrong password or login'})
        }
    })
})

app.get('/downloadPicture/:pictureName', (req, res) => {
    const pictureName=req.params.pictureName
    res.download(`${__dirname}/images/${pictureName}`)
})

// '/' endpoint responds index.html file
// which is entrypoint to start page
app.get('/', (_, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

// '/publicPosts' endpoint responds index.html file
// which is entrypoint to upload page
app.get('/publicPosts', (_, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

// '/userPosts/*' endpoint responds index.html file
// which is entrypoint to upload page
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
