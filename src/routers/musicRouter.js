const FS = require('fs')
const path = require('path')
const express = require('express')
const fileUpload = require('express-fileupload')

const { User } = require('../models.js')
const { verifyJWT } = require('../middlewares.js')

const musicRouter = express.Router()

musicRouter.put('/uploadAudioTrack', [fileUpload(), verifyJWT], (req, res) => {
    const title = req.body.title
    const track = req.files.track
    const newTrack = {fileName: track.md5 + path.extname(track.name), title: title}

    User.findOneAndUpdate(
        {name: req.user.name},
        {$push: {music: {$each: [newTrack], $position: 0}}},
        {new: true}
    )
        .then(doc => {
            const trackPath = path.resolve(__dirname, '..', '..', 'music', newTrack.fileName)
            if(!FS.existsSync(trackPath)) {
                track.mv(
                    trackPath,
                    err => {
                        if (err) return res.sendStatus(500)

                        // response to user with new track
                        res.json(doc.music[0])
                    }
                )
            } else {
                // response to user with new track
                res.json(doc.music[0])
            }
        })
        .catch(() => res.sendStatus(500))
})

musicRouter.delete('/deleteAudioTrack', verifyJWT, (req, res) => {
    User.findOneAndUpdate(
        {name: req.user.name},
        {$pull: {music: {_id: req.body.trackID}}},
        {new: true},
        (err, doc) => {
            if (err) return res.sendStatus(500)
            res.sendStatus(200)
        }
    )
})

musicRouter.get('/getMusic/:username', (req, res) => {
    const userName = req.params.username

    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        res.json({userMusic: doc.music})
    })
})

musicRouter.get('/getAudioTrack/:username/:trackid', (req, res) => {
    const trackID = req.params.trackid
    const userName = req.params.username

    User.findOne({name: userName}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        const track = doc.music.find(el => el._id.toString() === trackID)

        if (!track) return res.sendStatus(404)

        if(FS.existsSync(path.resolve(__dirname, '..', '..', 'music', track.fileName))) {
            res.sendFile(path.resolve(__dirname, '..', '..', 'music', track.fileName))
        } else {
            res.sendStatus(404)
        }
    })
})

exports.musicRouter = musicRouter
