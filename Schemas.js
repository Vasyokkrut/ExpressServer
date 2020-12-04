exports.PictureScheme = {
    fileName:String,
    name:String
}

exports.UserScheme = {
    name:String,
    password:String,
    posts:[
        {
            fileName:String,
            name:String
        }
    ]
}
