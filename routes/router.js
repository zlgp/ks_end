const express = require('express')


const router = express.Router()

const mysql = require('../database/mysql')
/**
 * @swagger
 * /index:
 *   post:
 *     tags:
 *       - 首页
 *     summary: GET 
 *     description: 用于测试基础 GET 请求的接口
 *     parameters:
 *       - name: name
 *         description: 用户名
 *         in: query
 *         required: true 
 *     responses:
 *       200:
 *         description: 【成功】 返回 world
 */
router.get('/index', (req, res, next) => {
    res.send("index")
})

// 统一处理错误的中间件
router.use("/", (err, req, res, next) => {
    res.send("server error")
})


module.exports = router