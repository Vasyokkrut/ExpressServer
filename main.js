const express = require('express')
const fileUpload = require('express-fileupload')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cors = require('cors')
const JWT = require('jsonwebtoken')
const path = require('path')

const { User } = require('./models')
const { apiRoutes } = require('./apiRoutes')
const { JWTSecretKey, mongoURL } = require('./env')

// creating main application object
// and applying middlewares
const app = express()
app.use(cors())
app.use(fileUpload())
app.use(express.text())
app.use(express.json())
app.use('/api', apiRoutes)
app.use(express.static(path.resolve(__dirname, 'build')))

// connecting to mongodb server
const mongoSettings = {useNewUrlParser: true, useUnifiedTopology: true}
mongoose.connect(mongoURL, mongoSettings)
    .catch(error => {throw error})
    .then(() => console.log('DB Connected'))

app.post('/register', (req, res) => {
    User.find({name:req.body.login}, async (err, ans) => {
        if(err) return res.sendStatus(500)
        if (ans.length!==0) {
            return res.sendStatus(208)
        }
        let passwordHash = bcrypt.hashSync(req.body.password, 10)
        let newUser = {
            name:req.body.login,
            password:passwordHash,
            posts:[{fileName:'example.jpg',name:'This is your first post'}]
        }
        let user = new User(newUser)
        await user.save().catch(el => console.log('error user saving'))
        res.sendStatus(201)
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
    pictureName=req.params.pictureName
    res.sendFile(
        `${__dirname}/images/${pictureName}`,
        {headers:{'Content-Disposition': `attachment; filename="${pictureName}"`}}
    )
})

// '/' endpoint responds index.html file
// which is entrypoint to start page
app.get('/', (_, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

// '/upload' endpoint responds index.html file
// which is entrypoint to upload page
app.get('/upload', (_, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

async function exitFromServer() {
    await mongoose.disconnect()
    console.log('stopped')
    process.exit(0)
}

process.on('SIGINT', exitFromServer).on('SIGTERM', exitFromServer)

app.listen(5000, () => {console.log('Server started')})
