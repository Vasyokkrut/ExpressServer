const express = require('express')
const fileUpload = require('express-fileupload')
const FS = require('fs')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cors = require('cors')
const JWT = require('jsonwebtoken')
const path = require('path')
const Schemas = require('./Schemas')

// creating schemas for models
const PictureScheme = new mongoose.Schema(Schemas.PictureScheme, { versionKey: false })
const UserScheme = new mongoose.Schema(Schemas.UserScheme, { versionKey: false })

// creating models
const User = mongoose.model('User', UserScheme)
const Picture = mongoose.model('Posts', PictureScheme)

// important string constants
const JWTSecretKey = 'this is very secret key for JWT auth and nobody should know it'
const mongoURL = 'mongodb://localhost:27017/VasyokkrutProjectDB'

// creating main application object
// and applying middlewares
const app = express()
app.use(cors())
app.use(fileUpload())
app.use(express.text())
app.use(express.json())
app.use(express.static(path.resolve(__dirname, 'build')))

// connecting to mongodb server
mongoose.connect(mongoURL, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log('DB Connected'))
    .catch(error => {console.log(error);throw error})

app.post('/register', async (req, res) => {
    await User.find({name:req.body.login}, async (err, ans) => {
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

app.post('/login', async (req, res) => {
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

app.post('/api/uploadPicture' , async (req , res) => {
    let file = req.files.image
    let title = req.body.title
    const picture = new Picture({fileName:file.md5 + file.name, name:title})
    picture.save().catch(el => console.log('error picture saving'))
    if(FS.existsSync(`${__dirname}/images/${file.md5 + file.name}`)) {
        res.status(200).json({post:picture, Status:'successful'})
    }
    if(!FS.existsSync(`${__dirname}/images/${file.md5 + file.name}`)) {
        file.mv(
            `${__dirname}/images/${file.md5 + file.name}`,
            err => {if(err){console.log(err)}}
        )
        res.status(201).json({post:picture, Status:'successful'})
    }
})

app.post('/api/uploadPictureForUser' , async (req , res) => {
    let JWTtoken = req.headers.authorization
    let file = req.files.image
    let title = req.body.title
    const picture = {fileName:file.md5 + file.name, name:title}
    JWT.verify(JWTtoken, JWTSecretKey, async (err, user) => {
        if(err) return res.sendStatus(401)
        await User.findOneAndUpdate(
                {name:user.login},
                {$push:{posts:picture}},
                {useFindAndModify:false, new:true}
            )
            .then(ans => {
                let lastItem=ans.posts.length-1
                res.status(200).json(ans.posts[lastItem])
            })
            .catch(err => console.log(err))
        if(!FS.existsSync(`${__dirname}/images/${file.md5 + file.name}`)) {
            file.mv(
                `${__dirname}/images/${file.md5 + file.name}`,
                err => {if(err){console.log(err)}}
            )
        }
    })
})

app.get('/api/getImages', async (req, res) => {
    Picture.find({}, (err, ans) => {
        if(err) return res.sendStatus(500)
        res.status(200).json({images:ans})
    })
})

app.get('/api/getUserImages', async (req, res) => {
    let JWTtoken = req.headers.authorization
    JWT.verify(JWTtoken, JWTSecretKey, (err, user) => {
        if(err) return res.sendStatus(401)
        User.findOne({name:user.login}, (err, ans) => {
            if(err) return res.sendStatus(500)
            res.status(200).json({images:ans.posts})
        })
    })
})

app.get('/api/getImage/:id', async (req, res) => {
    Picture.find({_id:req.params.id}, (err, ans) => {
        if(err) return console.log('errorInGetImage')
        res.sendFile(`${__dirname}/images/${ans[0].fileName}`)
    })
})

app.get('/api/getUserImage/:username/:id', async (req, res) => {
    User.find({name:req.params.username}, (err, ans) => {
        if(err) return console.log('errorInGetUserImage')
        if(ans.length===0) return res.sendStatus(400)
        let image = ans[0].posts.find(el => el._id.toString('hex') === req.params.id)
        res.sendFile(`${__dirname}/images/${image.fileName}`)
    })
})

app.delete('/api/deleteImage', async (req, res) => {
    await Picture.deleteOne({_id:req.body.delete}, (err, ans) => {
        if(err) return console.log('error happaned during deleting')
        res.status(200).json({deleted:true, id:ans})
    })
})

app.delete('/api/deleteUserImage', async (req, res) => {
    let JWTtoken = req.headers.authorization
    JWT.verify(JWTtoken, JWTSecretKey, (err, user) => {
        if(err) return res.sendStatus(401)
        User.findOneAndUpdate({name:user.login},
            {$pull:{posts:{_id:req.body.delete}}},
            {useFindAndModify:false, new:true},
            (err, ans) => {
                if (err) return res.sendStatus(500)
                res.status(200).json({deleted:true, id:ans})
            }
        )
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
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

// '/upload' endpoint responds index.html file
// which is entrypoint to upload page
app.get('/upload', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
})

async function exitFromServer() {
    await mongoose.disconnect()
    console.log('stopped')
    process.exit(0)
}

process.on('SIGINT', exitFromServer).on('SIGTERM', exitFromServer)

app.listen(5000, () => {console.log('Server started')})
