const express = require('express')

const { User } = require('./models.js')
const { verifyJWT } = require('./middlewares.js')

const friendsRouter = express.Router()

friendsRouter.get('/searchFriends', verifyJWT, (req, res) => {
    const user = req.user
    const username = req.query.username
    const allowedSymbols = /^[A-Za-z0-9]+$/

    if (!username) return res.sendStatus(406)
    if (!allowedSymbols.test(username)) return res.sendStatus(406)

    const regexUsername = RegExp(username, 'i')

    User.find({name: regexUsername}, (err, docs) => {
        if (err) return res.sendStatus(500)
        if (!docs.length) return res.sendStatus(404)

        User.findOne({name: user.userName}, (err, doc) => {
            if (err) return res.sendStatus(500)
            if (!doc) return res.sendStatus(404)

            let users = docs.map(user => {
                const userItem = {name: user.name, _id: user._id}
                if (doc.friends.includes(user._id)) userItem.isFriend = true
                if (doc.incomingFriendRequests.includes(user._id)) {
                    userItem.isInIncomingRequests = true
                }
                if (doc.outgoingFriendRequests.includes(user._id)) {
                    userItem.isInOutgoingRequests = true
                }
                return userItem
            })

            users = users.filter(user => user.name !== doc.name)

            res.json(users)
        })
    })
})

friendsRouter.get('/getFriends', verifyJWT, (req, res) => {
    const user = req.user

    User.findOne({name: user.userName})
        .populate('friends', 'name')
        .exec((err, doc) => {
            if (err) return res.sendStatus(500)
            if (!doc) return res.sendStatus(404)
            
            res.json(doc.friends)
        })
})

friendsRouter.get('/getIncomingRequests', verifyJWT, (req, res) => {
    const userName = req.user.userName

    User.findOne({name: userName})
        .populate('incomingFriendRequests', 'name')
        .exec((err, doc) => {
            if (err) return res.sendStatus(500)
            if (!doc) return res.sendStatus(404)

            const incomingRequests = doc.incomingFriendRequests.map(user => {
                return {name: user.name, _id: user._id}
            })
            res.json(incomingRequests)
        })
})

friendsRouter.get('/getOutgoingRequests', verifyJWT, (req, res) => {
    const userName = req.user.userName

    User.findOne({name: userName})
        .populate('outgoingFriendRequests', 'name')
        .exec((err, doc) => {
            if (err) return res.sendStatus(500)
            if (!doc) return res.sendStatus(404)

            const outgoingRequests = doc.outgoingFriendRequests.map(user => {
                return {name: user.name, _id: user._id}
            })
            res.json(outgoingRequests)
        })
})

friendsRouter.post('/sendRequest', verifyJWT, (req, res) => {
    const requester = req.user
    const recipient = req.body.recipient
    
    if (requester === recipient) return res.sendStatus(400)

    User.findOne({name: recipient.name}, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        if (doc.incomingFriendRequests.includes(requester._id)) return res.sendStatus(208)
        if (doc.friends.includes(requester._id)) return res.sendStatus(208)

        User.findOne({name: requester.userName}, (err, doc) => {
            if (err) return res.sendStatus(500)
            if (!doc) return res.sendStatus(404)

            if (doc.incomingFriendRequests.includes(recipient._id)) return res.sendStatus(208)
            if (doc.friends.includes(recipient._id)) return res.sendStatus(208)

            User.findOneAndUpdate(
                {name: recipient.name},
                {$push: {incomingFriendRequests: requester._id}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)
    
                    User.findOneAndUpdate(
                        {name: requester.userName},
                        {$push: {outgoingFriendRequests: recipient._id}},
                        (err, doc) => {
                            if (err) return res.sendStatus(500)
    
                            res.sendStatus(200)
                        }
                    )
                }
            )
        })
    })
})

friendsRouter.post('/acceptRequest', verifyJWT, (req, res) => {
    const requester = req.body.requester
    const recipient = req.user

    if (!requester) return res.sendStatus(400)
    
    User.findOne({name: recipient.userName}, (err, recipient) => {
        if (err) return res.sendStatus(500)
        if (!recipient) return res.sendStatus(404)

        if (!recipient.incomingFriendRequests.includes(requester._id)) return res.sendStatus(400)

        User.findOne({name: requester.name}, (err, requester) => {
            if (err) return res.sendStatus(500)
            if (!requester) return res.sendStatus(404)

            if (recipient.friends.includes(requester._id)) return res.sendStatus(208)

            User.findOneAndUpdate(
                {name: recipient.name},
                {$push: {friends: requester._id}, $pull: {incomingFriendRequests: requester._id}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)
    
                    User.findOneAndUpdate(
                        {name: requester.name},
                        {$push: {friends: recipient._id}, $pull: {outgoingFriendRequests: recipient._id}},
                        (err, doc) => {
                            if (err) return res.sendStatus(500)

                            res.sendStatus(200)
                        }
                    )
                }
            )
        })
    })
})

friendsRouter.post('/declineIncomingRequest', verifyJWT, (req, res) => {
    const user = req.user
    const requester = req.body.requester

    User.findOneAndUpdate(
        {name: user.userName},
        {$pull: {incomingFriendRequests: requester._id}},
        (err, doc) => {
            if (err) return res.sendStatus(500)

            User.findOneAndUpdate(
                {name: requester.name},
                {$pull: {outgoingFriendRequests: user._id}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)

                    res.sendStatus(200)
                }
            )
        }
    )
})

friendsRouter.delete('/deleteOutgoingRequest', verifyJWT, (req, res) => {
    const user = req.user
    const recipient = req.body

    User.findOneAndUpdate(
        {name: user.userName},
        {$pull: {outgoingFriendRequests: recipient._id}},
        (err, doc) => {
            if (err) return res.sendStatus(500)

            User.findOneAndUpdate(
                {name: recipient.name},
                {$pull: {incomingFriendRequests: user._id}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)

                    res.sendStatus(200)
                }
            )
        }
    )
})

friendsRouter.delete('/deleteFriend', verifyJWT, (req, res) => {
    const user = req.user
    const friend = req.body

    User.findOneAndUpdate(
        {name: user.userName},
        {$pull: {friends: friend._id}},
        (err, doc) => {
            if (err) return res.sendStatus(500)

            User.findOneAndUpdate(
                {name: friend.name},
                {$pull: {friends: user._id}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)

                    res.sendStatus(200)
                }
            )
        }
    )
})

exports.friendsRouter = friendsRouter
