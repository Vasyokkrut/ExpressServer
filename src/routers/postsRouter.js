const FS = require('fs')
const path = require('path')
const express = require('express')
const imageSize = require('image-size')
const fileUpload = require('express-fileupload')

const { User } = require('../models.js')
const { verifyJWT } = require('../middlewares.js')

const postsRouter = express.Router()

postsRouter.put('/uploadPost', [fileUpload(), verifyJWT], (req , res) => {
    const text = req.body.text
    const title = req.body.title
    const picture = req.files.picture

    try {
        const { width, height } = imageSize(picture.data)

        if (width < 300 || height < 200) return res.sendStatus(406)

        const newPost = {
            text: text,
            title: title,
            pictureName: picture.md5 + path.extname(picture.name),
            pictureSize: { width, height }
        }

        User.findOneAndUpdate(
            {name: req.user.name},
            {$push: {posts: newPost}},
            {new: true},
            (err, doc) => {
                if (err) return res.sendStatus(500)
    
                // check if picture doesn't exist and saving it on local disk
                const picturePath = path.resolve(__dirname, '..', '..', 'pictures', newPost.pictureName)
                if(!FS.existsSync(picturePath)) {
                    picture.mv(
                        picturePath,
                        err => {
                            if (err) res.sendStatus(500)
    
                            // response to user with new post
                            const lastItem = doc.posts.length - 1
                            res.json(doc.posts[lastItem])
                        }
                    )
                } else {
                    // response to user with new post
                    const lastItem = doc.posts.length - 1
                    res.json(doc.posts[lastItem])
                
                }
            }
        )
    } catch {
        res.sendStatus(406)
    }
})

postsRouter.get('/getUserInfo/:user', (req, res) => {
    const userName = RegExp('^' + req.params.user + '$', 'i')

    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        res.json({userPosts: doc.posts, userName: doc.name})
    })
})

postsRouter.get('/getPostPicture/:username/:id', (req, res) => {
    const userName = RegExp('^' + req.params.username + '$', 'i')

    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(400)
        
        const picture = doc.posts.find(el => el._id.toString() === req.params.id)
        if (picture){
            res.sendFile(path.resolve(__dirname, '..', '..', 'pictures', picture.pictureName))
        } else {
            res.sendStatus(404)
        }
    })
})

postsRouter.get('/downloadPicture/:pictureName', (req, res) => {
    const pictureName = req.params.pictureName
    res.download(path.resolve(__dirname, '..', '..', 'pictures', pictureName))
})

postsRouter.delete('/deletePost', verifyJWT, (req, res) => {
    User.findOneAndUpdate(
        {name: req.user.name},
        {$pull: {posts: {_id: req.body.delete}}},
        {new: true},
        (err, doc) => {
            if (err) return res.sendStatus(500)
            res.sendStatus(200)
        }
    )
})

exports.postsRouter = postsRouter
