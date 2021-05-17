const express = require('express')

const { postsRouter } = require('./postsRouter.js')
const { musicRouter } = require('./musicRouter.js')
const { accountRouter } = require('./accountRouter.js')
const { friendsRouter } = require('./friendsRouter.js')

const apiRouter = express.Router()

apiRouter.use('/posts', postsRouter)
apiRouter.use('/music', musicRouter)
apiRouter.use('/account', accountRouter)
apiRouter.use('/friends', friendsRouter)

exports.apiRouter = apiRouter
