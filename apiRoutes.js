const FS = require('fs')
const path = require('path')
const express = require('express')

const { verifyJWT } = require('./middlewares.js')
const { musicRouter } = require('./musicRoutes.js')
const { PublicPost, User } = require('./models.js')
const { accountRouter } = require('./accountRoutes.js')

const apiRouter = express.Router()
apiRouter.use('/music', musicRouter)
apiRouter.use('/account', accountRouter)

apiRouter.put('/uploadPublicPost' , (req, res) => {
    const text = req.body.text
    const title = req.body.title
    const picture = req.files.picture
    const newPost = {
        text: text,
        title: title,
        pictureName: picture.md5 + picture.name
    }

    PublicPost.create(newPost, (err, post) => {
        if (err) return res.sendStatus(500)

        if(!FS.existsSync(path.resolve(__dirname, 'pictures', newPost.pictureName))) {
            picture.mv(
                path.resolve(__dirname, 'pictures', newPost.pictureName),
                err => {
                    if (err) return res.sendStatus(500)
                    res.status(201).json({ post })
                }
            )
        } else {
            res.status(200).json({ post })
        }
    })
})

apiRouter.put('/uploadPostForUser', verifyJWT, (req , res) => {
    const text = req.body.text
    const title = req.body.title
    const picture = req.files.picture
    const newPost = {
        text: text,
        title: title,
        pictureName: picture.md5 + picture.name
    }
    
    User.findOneAndUpdate(
        {name: req.user.userName},
        {$push: {posts: newPost}},
        {new: true}
    )
        .then(doc => { // this doc is the user we saved post for

            // check if picture doesn't exist and saving it on local disk
            const picturePath = path.resolve(__dirname, 'pictures', newPost.pictureName)
            if(!FS.existsSync(picturePath)) {
                picture.mv(
                    picturePath,
                    err => {
                        if (err) res.sendStatus(500)

                        // response to user with new post
                        const lastItem = doc.posts.length - 1
                        res.status(200).json(doc.posts[lastItem])
                    }
                )
            } else {
                // response to user with new post
                const lastItem = doc.posts.length - 1
                res.status(200).json(doc.posts[lastItem])
            
            }
        })
        .catch(() => res.sendStatus(500))
})

apiRouter.get('/getPublicPosts', (_req, res) => {
    PublicPost.find({}, (err, docs) => {
        if (err) return res.sendStatus(500)
        res.status(200).json({posts: docs})
    })
})

apiRouter.get('/getUserInfo/:user', (req, res) => {
    const userName = RegExp('^' + req.params.user + '$', 'i')

    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        res.status(200).json({userPosts: doc.posts, userName: doc.name})
    })
})

apiRouter.get('/getPublicPicture/:id', (req, res) => {
    PublicPost.findOne({_id: req.params.id}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        res.sendFile(path.resolve(__dirname, 'pictures', doc.pictureName))
    })
})

apiRouter.get('/getUserPicture/:username/:id', (req, res) => {
    const userName = RegExp('^' + req.params.username + '$', 'i')

    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(400)
        
        const picture = doc.posts.find(el => el._id.toString('hex') === req.params.id)
        if (picture){
            res.sendFile(path.resolve(__dirname, 'pictures', picture.pictureName))
        } else {
            res.sendStatus(404)
        }
    })
})

apiRouter.delete('/deleteUserPost', verifyJWT, (req, res) => {
    User.findOneAndUpdate(
        {name: req.user.userName},
        {$pull: {posts: {_id: req.body.delete}}},
        {new: true},
        (err, doc) => {
            if (err) return res.sendStatus(500)
            res.sendStatus(200)
        }
    )
})

apiRouter.get('/downloadPicture/:pictureName', (req, res) => {
    const pictureName = req.params.pictureName
    res.download(path.resolve(__dirname, 'pictures', pictureName))
})

exports.apiRoutes = apiRouter
