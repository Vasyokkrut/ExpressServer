const mongoose = require('mongoose')

const UserSchema = {
    name: String,
    password: String,
    posts: [
        {
            text: String,
            title: String,
            pictureName: String,
            pictureSize: {
                width: Number,
                height: Number
            }
        }
    ],
    music: [
        {
            title: String,
            fileName: String
        }
    ],
    friends: [mongoose.Schema.Types.ObjectId],
    incomingFriendRequests: [mongoose.Schema.Types.ObjectId],
    outgoingFriendRequests: [mongoose.Schema.Types.ObjectId]
}

// creating schema for model
const mongoUserSchema = new mongoose.Schema(UserSchema)

// creating model
const User = mongoose.model('user', mongoUserSchema)

exports.User = User
