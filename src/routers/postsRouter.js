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

    if (!picture) return res.sendStatus(406)
    if (!text || typeof text !== 'string') return res.sendStatus(406)
    if (!title || typeof title !== 'string') return res.sendStatus(406)

    try {
        const { width, height } = imageSize(picture.data) // this function can throw an exception

        if (width < 300 || height < 200) return res.sendStatus(406)

        const newPost = {
            text: text,
            title: title,
            pictureName: picture.md5 + path.extname(picture.name),
            pictureSize: { width, height }
        }

        User.findByIdAndUpdate(
            req.user._id,
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
    const userName = req.params.user
    const allowedSymbols = /^[A-Za-z0-9]+$/

    if (!allowedSymbols.test(userName)) return res.sendStatus(404)

    const regexUserName = RegExp('^' + req.params.user + '$', 'i')

    User.findOne({name: regexUserName}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        res.json({userPosts: doc.posts, userName: doc.name})
    })
})

postsRouter.get('/getPostPicture/:pictureName', (req, res) => {
    const pictureName = req.params.pictureName
    const allowedSymbols = /^[A-Za-z0-9]+\.[A-Za-z0-9]+$/

    if (!allowedSymbols.test(pictureName)) return res.sendStatus(400)

    res.sendFile(path.resolve(__dirname, '..', '..', 'pictures', pictureName))
})

postsRouter.get('/downloadPicture/:pictureName', (req, res) => {
    const pictureName = req.params.pictureName
    const allowedSymbols = /^[A-Za-z0-9]+\.[A-Za-z0-9]+$/

    if (!allowedSymbols.test(pictureName)) return res.sendStatus(400)

    res.download(path.resolve(__dirname, '..', '..', 'pictures', pictureName))
})

postsRouter.delete('/deletePost', verifyJWT, (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {$pull: {posts: {_id: req.body.delete}}},
        {new: true},
        (err, doc) => {
            if (err) return res.sendStatus(500)
            res.sendStatus(200)
        }
    )
})

exports.postsRouter = postsRouter
