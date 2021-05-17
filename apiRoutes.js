const express = require('express')

const { postsRouter } = require('./postsRoutes.js')
const { musicRouter } = require('./musicRoutes.js')
const { accountRouter } = require('./accountRoutes.js')
const { friendsRouter } = require('./friendsRoutes.js')

const apiRouter = express.Router()

apiRouter.use('/posts', postsRouter)
apiRouter.use('/music', musicRouter)
apiRouter.use('/account', accountRouter)
apiRouter.use('/friends', friendsRouter)

exports.apiRoutes = apiRouter
