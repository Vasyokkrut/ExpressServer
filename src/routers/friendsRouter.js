const express = require('express')

const { User } = require('../models.js')
const { verifyJWT } = require('../middlewares.js')

const friendsRouter = express.Router()

friendsRouter.get('/searchFriends', verifyJWT, (req, res) => {
    const userId = req.user._id
    const username = req.query.username
    const allowedSymbols = /^[A-Za-z0-9]+$/

    if (!username) return res.sendStatus(406)
    if (!allowedSymbols.test(username)) return res.sendStatus(406)

    const regexUsername = RegExp(username, 'i')

    User.find({name: regexUsername}, (err, docs) => {
        if (err) return res.sendStatus(500)
        if (!docs.length) return res.sendStatus(404)

        User.findById(userId, (err, doc) => {
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
    const userId = req.user._id

    User.findById(userId)
        .populate('friends', 'name')
        .exec((err, doc) => {
            if (err) return res.sendStatus(500)
            if (!doc) return res.sendStatus(404)
            
            res.json(doc.friends)
        })
})

friendsRouter.get('/getIncomingRequests', verifyJWT, (req, res) => {
    const userId = req.user._id

    User.findById(userId)
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
    const userId = req.user._id

    User.findById(userId)
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
    const requesterId = req.user._id
    const recipientId = req.body.recipient?._id

    if (requesterId === recipientId) return res.sendStatus(400)

    User.findById(recipientId, (err, doc) => {
        if (err) return res.sendStatus(500)
        if (!doc) return res.sendStatus(404)

        if (doc.incomingFriendRequests.includes(requesterId)) return res.sendStatus(208)
        if (doc.friends.includes(requesterId)) return res.sendStatus(208)

        User.findById(requesterId, (err, doc) => {
            if (err) return res.sendStatus(500)
            if (!doc) return res.sendStatus(404)

            if (doc.incomingFriendRequests.includes(recipientId)) return res.sendStatus(208)
            if (doc.friends.includes(recipientId)) return res.sendStatus(208)

            User.findByIdAndUpdate(
                recipientId,
                {$push: {incomingFriendRequests: requesterId}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)
    
                    User.findByIdAndUpdate(
                        requesterId,
                        {$push: {outgoingFriendRequests: recipientId}},
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
    const requesterId = req.body.requester?._id
    const recipientId = req.user._id
    if (!requesterId) return res.sendStatus(400)

    User.findById(recipientId, (err, recipient) => {
        if (err) return res.sendStatus(500)
        if (!recipient) return res.sendStatus(404)

        if (!recipient.incomingFriendRequests.includes(requesterId)) return res.sendStatus(400)

        User.findById(requesterId, (err, requester) => {
            if (err) return res.sendStatus(500)
            if (!requester) return res.sendStatus(404)

            if (recipient.friends.includes(requesterId)) return res.sendStatus(208)

            User.findByIdAndUpdate(
                recipientId,
                {$push: {friends: requesterId}, $pull: {incomingFriendRequests: requesterId}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)
    
                    User.findByIdAndUpdate(
                        requesterId,
                        {$push: {friends:recipientId}, $pull: {outgoingFriendRequests:recipientId}},
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
    const userId = req.user._id
    const requesterId = req.body.requester._id

    User.findByIdAndUpdate(
        userId,
        {$pull: {incomingFriendRequests: requesterId}},
        (err, doc) => {
            if (err) return res.sendStatus(500)

            User.findByIdAndUpdate(
                requesterId,
                {$pull: {outgoingFriendRequests: userId}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)

                    res.sendStatus(200)
                }
            )
        }
    )
})

friendsRouter.delete('/deleteOutgoingRequest', verifyJWT, (req, res) => {
    const userId = req.user._id
    const recipientId = req.body._id

    User.findByIdAndUpdate(
        userId,
        {$pull: {outgoingFriendRequests: recipientId}},
        (err, doc) => {
            if (err) return res.sendStatus(500)

            User.findByIdAndUpdate(
                recipientId,
                {$pull: {incomingFriendRequests: userId}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)

                    res.sendStatus(200)
                }
            )
        }
    )
})

friendsRouter.delete('/deleteFriend', verifyJWT, (req, res) => {
    const userId = req.user._id
    const friendId = req.body._id

    User.findByIdAndUpdate(
        userId,
        {$pull: {friends: friendId}},
        (err, doc) => {
            if (err) return res.sendStatus(500)

            User.findByIdAndUpdate(
                friendId,
                {$pull: {friends: userId}},
                (err, doc) => {
                    if (err) return res.sendStatus(500)

                    res.sendStatus(200)
                }
            )
        }
    )
})

exports.friendsRouter = friendsRouter
