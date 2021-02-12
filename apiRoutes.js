const express = require('express')
const FS = require('fs')
const JWT = require('jsonwebtoken')

const { JWTSecretKey } = require('./env')
const { Picture, User } = require('./models')

const apiRouter = express.Router()

apiRouter.post('/uploadPicture' , async (req, res) => {
    let file = req.files.image
    let title = req.body.title
    const picture = new Picture({fileName:file.md5 + file.name, name:title})
    picture.save().catch(() => console.log('error picture saving'))
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

apiRouter.post('/uploadPictureForUser' , (req , res) => {
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

apiRouter.get('/getImages', (_req, res) => {
    Picture.find({}, (err, ans) => {
        if(err) return res.sendStatus(500)
        res.status(200).json({images:ans})
    })
})

apiRouter.get('/getUserImages/:user', (req, res) => {
    User.findOne({name:req.params.user}, (err, ans) => {
        if (err) return res.sendStatus(500)
        if (ans === null) return res.sendStatus(404)
        res.status(200).json({images:ans.posts})
    })
})

apiRouter.get('/getImage/:id', (req, res) => {
    Picture.find({_id:req.params.id}, (err, ans) => {
        if(err) return console.log('errorInGetImage')
        res.sendFile(`${__dirname}/images/${ans[0].fileName}`)
    })
})

apiRouter.get('/getUserImage/:username/:id', (req, res) => {
    User.find({name:req.params.username}, (err, ans) => {
        if(err) {
            res.sendStatus(500)
            return
        }
        if(ans.length===0) {
            res.sendStatus(400)
            return
        }
        let image = ans[0].posts.find(el => el._id.toString('hex') === req.params.id)
        if(image){
            res.sendFile(`${__dirname}/images/${image.fileName}`)
        } else {
            res.sendStatus(404)
        }
    })
})

apiRouter.delete('/deleteUserImage', (req, res) => {
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

exports.apiRoutes = apiRouter
