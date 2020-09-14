const express = require('express')

const app = express()

const path = require('path')

const router = require('./routes/router')

var bodyParser = require('body-parser')

var cors = require('cors')
// 生成swagger文档
const swaggerJSDoc = require('swagger-jsdoc');
// 生成swagger文档
const swaggerUi = require('swagger-ui-express');

// 校验token
const jwt = require('express-jwt');


const data_token = require(path.join(__dirname, "./data-operation/data"))




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

app.use(jwt({
    secret: "secret",
    algorithms: ['HS256'],
    credentialsRequired: true,
}).unless({
    //⽩白名单,除了了这⾥里里写的地址，其他的URL都需要验证
    path: ["/register", "/login", "/code"]
}));


// 统一校验token中间件
app.use("/", (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send({ code: -1, msg: 'token验证失败' });
    }
})


// 统一获取token,解析token中间件
app.use("/", (req, res, next) => {
    // if (req.originalUrl == "/code"|| req.originalUrl == "/register" || req.originalUrl == "/login") {
    //     // 记得让继续执行,不加,不会继续执行
    //     next()
    // } else {
    //     data_token.analysisToken(req.user.data)
    //     // 记得让继续执行,不加,不会继续执行
    //     next()
    // }

    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        data_token.analysisToken(req.user.data)
        // 记得让继续执行,不加,不会继续执行
        next()
    }else{
        next() 
    }

})




app.use(router)

app.listen(3000, () => {
    console.log("running");

})