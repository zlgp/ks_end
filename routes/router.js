const express = require('express')

const path = require('path')
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
router.get('/code', (req, res, next) => {
    data.getCode(req, res, next)
})
// 登陆接口
router.post('/login', (req, res, next) => {
    data.login(req, res, next)
})

// 首页获取分类标签接口
router.post('/getTag', (req, res, next) => {
    data.getTag(req, res, next)
})
// 首页-获取影片
router.post('/getIndexByLabel', (req, res, next) => {
    data.getIndexByLabel(req, res, next)
})

// 最新片源
router.post('/getNewMovies', (req, res, next) => {
    data.getNewMovies(req, res, next)
})

// 热门资源
router.post('/getHotMovies', (req, res, next) => {
    data.getHotMovies(req, res, next)
})
//  分类查询影片的标签
router.post('/getLabelSearch', (req, res, next) => {
    data.getLabelSearch(req, res, next)
})

//  演员联想
router.post('/getActor', (req, res, next) => {
    data.getActor(req, res, next)
})
// 按条件搜索影片
router.post('/getIndexMovieByLabel', (req, res, next) => {
    data.getIndexMovieByLabel(req, res, next)
})
// 搜索页面,根据关键词搜索
router.post('/searchMovie', (req, res, next) => {
    data.searchMovie(req, res, next)
})
// 影片详情
router.post('/getMovieDetail', (req, res, next) => {
    data.getMovieDetail(req, res, next)
})
// 获取水印类型
router.post('/getUserRuleTile', (req, res, next) => {
    data.getUserRuleTile(req, res, next)
})
// 获取项目类型
router.post('/getUserWeb', (req, res, next) => {
    data.getUserWeb(req, res, next)
})
// 加入购物车
router.post('/addCar', (req, res, next) => {
    data.addCar(req, res, next)
})
// 下单
router.post('/addOrder', (req, res, next) => {
    data.addOrder(req, res, next)
})
// 个人信息
router.post('/getUserInfo', (req, res, next) => {
    data.getUserInfo(req, res, next)
})
// 获取集数
router.post('/getEpisode', (req, res, next) => {
    data.getEpisode(req, res, next)
})
// 获取购物车的影片
router.post('/getCarList', (req, res, next) => {
    data.getCarList(req, res, next)
})
// 获取消息列表
router.post('/getMsgList', (req, res, next) => {
    data.getMsgList(req, res, next)
})


// 统一处理错误的中间件
router.use("/", (err, req, res, next) => {
    console.log(err);
    res.status(500)
    res.send({
        code: 500,
        msg: "server error"
    })
})




module.exports = router