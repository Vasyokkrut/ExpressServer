const mongoose = require('mongoose')

const UserSchema = {
    name: String,
    password: String,
    posts: [
        {
            pictureName: String,
            title: String
        }
    ]
}

const PublicPostSchema = {
    pictureName: String,
    title: String
}

// creating schemas for models
const mongoUserSchema = new mongoose.Schema(UserSchema)
const mongoPubicPostSchema = new mongoose.Schema(PublicPostSchema)

// creating models
const User = mongoose.model('user', mongoUserSchema)
const PublicPost = mongoose.model('publicpost', mongoPubicPostSchema)

exports.User = User
exports.PublicPost = PublicPost
