const express = require('express')


const router = express.Router()

const data = require("../data-operation/data")



/**
 * @swagger
 * /register:
 *   post:
 *     tags:
 *       - 注册
 *     summary: post 
 *     description: 用于用户注册
 *     parameters:
 *       - name: 用户名
 *         password: 密码
 *         in: body
 *         required: true 
 *     responses:
 *       200:
 *         description: 【成功】 
 */
// 注册接口
router.post('/register', (req, res, next) => {
    data.register(req, res, next)
})

// 生成验证码接口
router.post('/code', (req, res, next) => {
    data.getCode(req, res, next)
})
// 登陆接口
router.post('/login', (req, res, next) => {
    data.login(req, res, next)
})

// 首页获取分类标签接口
router.post('/index/get/tag', (req, res, next) => {
    data.getTag(req, res, next)
})
// 首页-获取影片
router.post('/index/getIndexByLabel', (req, res, next) => {
    data.getIndexByLabel(req, res, next)
})

// 最新片源
router.post('/getNewMovies', (req, res, next) => {
    data.getNewMovies(req, res, next)
})




// 统一处理错误的中间件
router.use("/", (err, req, res, next) => {
    console.log(err);
    res.send("server error")
})


module.exports = router