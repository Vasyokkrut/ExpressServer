const FS = require('fs')
const express = require('express')
const JWT = require('jsonwebtoken')

const { JWTSecretKey } = require('./env.js')
const { Picture, User } = require('./models.js')
const { authenticateToken } = require('./middlewares.js')

const apiRouter = express.Router()

apiRouter.put('/uploadPicture' , async (req, res) => {
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

apiRouter.put('/uploadPictureForUser', authenticateToken, async (req , res) => {
    const file = req.files.image
    const title = req.body.title
    const picture = {fileName:file.md5 + file.name, name:title}

    await User.findOneAndUpdate(
            {name: req.user.login},
            {$push: {posts: picture}},
            {new: true}
        )
        .then(ans => {
            let lastItem = ans.posts.length - 1
            res.status(200).json(ans.posts[lastItem])
        })
        .catch(err => res.sendStatus(500))

    // check if image doesn't exist and save it on local disk
    if(!FS.existsSync(`${__dirname}/images/${file.md5 + file.name}`)) {
        file.mv(
            `${__dirname}/images/${file.md5 + file.name}`,
            err => {if (err) res.sendStatus(500)}
        )
    }
})

apiRouter.get('/getPublicPosts', (_req, res) => {
    Picture.find({}, (err, ans) => {
        if(err) return res.sendStatus(500)
        res.status(200).json({images:ans})
    })
})

apiRouter.get('/getUserInfo/:user', (req, res) => {
    const userName = RegExp(`^${req.params.user}$`, 'i')

    User.findOne({name:userName}, (err, ans) => {
        if (err) return res.sendStatus(500)
        if (ans === null) return res.sendStatus(404)
        res.status(200).json({posts:ans.posts, userName: ans.name})
    })
})

apiRouter.get('/getImage/:id', (req, res) => {
    Picture.find({_id:req.params.id}, (err, ans) => {
        if(err) return console.log('errorInGetImage')
        res.sendFile(`${__dirname}/images/${ans[0].fileName}`)
    })
})

apiRouter.get('/getUserImage/:username/:id', (req, res) => {
    const userName = RegExp(`^${req.params.username}$`, 'i')

    User.find({name:userName}, (err, ans) => {
        if (err) return res.sendStatus(500)
        if (ans.length === 0) return res.sendStatus(400)
        
        let image = ans[0].posts.find(el => el._id.toString('hex') === req.params.id)
        if(image){
            res.sendFile(`${__dirname}/images/${image.fileName}`)
        } else {
            res.sendStatus(404)
        }
    })
})

apiRouter.delete('/deleteUserImage', authenticateToken, (req, res) => {
    User.findOneAndUpdate(
        {name: req.user.login},
        {$pull: {posts: {_id: req.body.delete}}},
        {new:true},
        (err, ans) => {
            if (err) return res.sendStatus(500)
            res.status(200).json({deleted:true, id:ans})
        }
    )
})

apiRouter.patch('/changeNickname', authenticateToken, (req, res) => {
    const newNickname = req.body.newNickname
    
    // check is new nickname not empty
    if (!newNickname) return res.sendStatus(406)

    User.findOne({name: newNickname}, (err, ans) => {
        // check if error happened
        if (err) return res.sendStatus(500)
        // check does user exist yet
        if (ans) return res.sendStatus(406)

        // searching user by it's current nickname and replacing it by new one
        User.findOneAndUpdate(
            {name: req.user.login},
            {$set: {name: newNickname}},
            {new:true},
            (err, ans) => {
                // check if error happened
                if (err) return res.sendStatus(500)
                // generating new json web token for user
                JWT.sign(
                    { login: newNickname },
                    JWTSecretKey,
                    { algorithm: 'HS512' },
                    (err, token) => {
                        if(err) return res.sendStatus(500)
                        return res.status(200).json({newJWTToken: token})
                    }
                )
            }
        )
    })
})

exports.apiRoutes = apiRouter
