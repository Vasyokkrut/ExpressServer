const mongoose = require('mongoose')

const UserSchema = {
    name: String,
    password: String,
    posts: [
        {
            title: String,
            pictureName: String
        }
    ],
    music: [
        {
            title: String,
            fileName: String
        }
    ]
}

const PublicPostSchema = {
    title: String,
    pictureName: String
}

// creating schemas for models
const mongoUserSchema = new mongoose.Schema(UserSchema)
const mongoPublicPostSchema = new mongoose.Schema(PublicPostSchema)

// creating models
const User = mongoose.model('user', mongoUserSchema)
const PublicPost = mongoose.model('publicpost', mongoPublicPostSchema)

exports.User = User
exports.PublicPost = PublicPost
