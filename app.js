const express = require('express')

const app = express()

const path = require('path')

const router = require('./routes/router')

var bodyParser = require('body-parser')
// 打印日志
const morgan = require('morgan')
// 设置日志大小等
const rfs = require("rotating-file-stream");

var cors = require('cors')
// 生成swagger文档
const swaggerJSDoc = require('swagger-jsdoc');
// 生成swagger文档
const swaggerUi = require('swagger-ui-express');

// 校验token
const expressjwt = require('express-jwt');
//解析token
let jwt = require('jsonwebtoken');

const data_token = require(path.join(__dirname, "./data-operation/data"))
//session中间件
var cookieSession = require('cookie-session')



// swagger 文档配置
const options = {
    definition: {
        // swagger 采用的 openapi 版本 不用改
        openapi: '3.0.0',
        // swagger 页面基本信息 自由发挥
        info: {
            title: '小说',
            version: '1.0.0',
            description: 'A novel API'
        }
    },
    // 重点，指定 swagger-jsdoc 去哪个路由下收集 swagger 注释
    apis: [path.join(__dirname, './routes/*.js')]
}
// 配置到文档
var swaggerSpec = swaggerJSDoc(options)
// 指定接口访问文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())
app.use(cors())

app.use(expressjwt({
    secret: "secret",
    algorithms: ['HS256'],
    credentialsRequired: true,
}).unless({
    //⽩白名单,除了了这⾥里里写的地址，其他的URL都需要验证
    path: ["/register", "/login", "/code"]
}));

// 打印日志模块
var accessLogStream = rfs.createStream('access.log', {
    size: "10M",
    interval: '1d', // rotate daily
    path: path.join(__dirname, 'log')
})

app.use(morgan(':remote-addr :remote-user [:date[clf]] :method :url HTTP/:http-version :status :res[content-length] ":referrer" ":user-agent" - :response-time ms', { stream: accessLogStream }))


// 统一校验token中间件
app.use("/", (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send({ code: -1, msg: 'token验证失败' });
    }
})
// 用session存验证码
app.use(cookieSession({
    secret: '12345',
    name: 'name',
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: true,
}))


// 统一获取token,解析token中间件
app.use("/", (req, res, next) => {
    let token = req.headers.authorization
    if (token != undefined) {
        // 验证拿到token
        var decoded = jwt.verify(token.split(' ')[1], 'secret');
        data_token.analysisToken(decoded.data)
        // 记得让继续执行,不加,不会继续执行
        next()
    } else {
        next()
    }

})




app.use(router)

app.listen(3000, () => {
    console.log("running");

})