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


app.use(router)

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

app.listen(3000, () => {
    console.log("running");

})