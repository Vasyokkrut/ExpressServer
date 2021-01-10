const mongoose = require('mongoose')

const UserScheme = {
    name:String,
    password:String,
    posts:[
        {
            fileName:String,
            name:String
        }
    ]
}

const PictureScheme = {
    fileName:String,
    name:String
}

// creating schemas for models
const mongoUserScheme = new mongoose.Schema(UserScheme, { versionKey: false })
const mongoPictureScheme = new mongoose.Schema(PictureScheme, { versionKey: false })

// creating models
const User = mongoose.model('User', mongoUserScheme)
const Picture = mongoose.model('Posts', mongoPictureScheme)

exports.User = User
exports.Picture = Picture
