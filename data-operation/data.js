const mysql = require('../database/mysql')

const redis = require("../database/redis")
// 生成验证码
const svgCaptcha = require('svg-captcha');

// 生成token
const jwt = require('jsonwebtoken');

// 时间处理模块
const moment = require('moment');

// 0 错误
// 1 成功
// 缓存数据的方式:1:全局变量,2,redis

// 注册
exports.register = (req, res, next) => {
    let { username, password } = req.body
    if (username == '' || password == '') {
        sendMsg(res, "用户名或者密码不能为空", 0)
        res.status(500)
        return false
    }
    redis.get("userInfo").then(results => {
        if (results !== null && username == JSON.parse(results).username) {
            sendMsg(res, "用户已存在", 0)
        } else {
            mysql.select(`INSERT INTO shop_users (username,password) VALUES ('${username}','${password}')`).then(results => {
                sendMsg(res, "注册成功", 1)
                let userMsg = {
                    username,
                    password
                }
                redis.set("userInfo", JSON.stringify(userMsg))
            }).catch(error => {
                next(error)
            })
        }

    })

}

// 获取验证码接口
// 全局变量缓存
let yzcode = ''
exports.getCode = (req, res, next) => {
    var captcha = svgCaptcha.create({
        size: 4,
        noise: 2,
        ignoreChars: '0o1i'
    });
    yzcode = captcha.text
    console.log(yzcode);

    res.type('svg');
    res.status(200).send(captcha.data);

}

// 登陆接口
let token
exports.login = async (req, res, next) => {
    // 获取用户输入的用户名和密码和验证码,然后验证
    let { username, password, code } = req.body
    if (username == '' || password == '' || code == '') {
        res.status(500)
        sendMsg(res, "用户名,密码,验证码都不能为空", 0)
        return false
    }
    // if (code != yzcode) {
    // res.status(500)
    //     sendMsg(res, "验证码有误", 0)
    //     return false
    // }
    // 生成token
    token = jwt.sign({
        data: req.body
    }, 'secret', { expiresIn: '1h' });
    await mysql.select(`SELECT shop_users.username,shop_users.avatar,shop_users.id FROM  shop_users  WHERE shop_users.username='${username}' AND shop_users.password='${password}'`).then(results => {

        let user_id = results[0].id
        let recharge_conf = "1"
        let { username, avatar } = results[0]

        sendMsg(res, "登陆成功", 1, {
            user_id,
            username,
            avatar,
            token,
            recharge_conf
        })

    }).catch(error => {
        next(error)
    })

}

// 首页获取分类标签
exports.getTag = (req, res, next) => {
    redis.get("tag").then(results => {
        if (results !== null) {
            let data = JSON.parse(results)

            sendMsg(res, "请求成功", 1, data)
        } else {
            mysql.select(`SELECT id,title FROM audio_labels`).then(results => {

                sendMsg(res, "请求成功", 1, results)
                redis.set('tag', JSON.stringify(results))
            }).catch(error => {
                next(error)
            })
        }
    })
}

// 首页获取
exports.getIndexByLabel = (req, res, next) => {
    let list = []
    let { label } = req.body
    if (label == '') {
        res.status(500)
        sendMsg(res, "label参数不能为空", 500)
        return false
    }
    mysql.select(`SELECT shop_audios.id,shop_audios.title,shop_audios.image_url as cover,shop_audios.ended,shop_audios.epi_tt FROM shop_audios WHERE shop_audios.label='${label}' LIMIT 30`)
        .then(results => {
            list = results
            return mysql.select(`SELECT audio_labels.id as label_id,audio_labels.title as label FROM audio_labels WHERE audio_labels.id='${label}'`)
        }).then(results => {
            let { label_id, label } = results[0]
            sendMsg(res, "请求成功", 1, {
                list,
                label_id,
                label
            })
        }).catch(error => {
            next(error)
        })
}

// 最新片源
exports.getNewMovies = (req, res, next) => {
    // 获取day参数
    // 0,1,2,3,4
    let { day, limit, page } = req.body
    let time = ''
    if (day == '') {
        res.status(500)
        sendMsg(res, "day参数不能为空", 500)
        return false
    }
    if (page == '') {
        page = 1
    }
    if (limit == '') {
        limit = 15
    }
    // 做时间转换
    switch (parseInt(day)) {
        case 0:
            time = moment().format("YYYY-MM-DD");
            break;
        case 1:
            time = moment().subtract(1, "days").format("YYYY-MM-DD");
            console.log(time);
            break;
        case 2:
            time = moment().subtract(2, "days").format("YYYY-MM-DD");
            break;
        case 3:
            time = moment().subtract(3, "days").format("YYYY-MM-DD");
            break;
        case 4:
            time = moment().subtract(4, "days").format("YYYY-MM-DD");
            break;
    }
    //  时间转换为时间戳
    // 获取某天的0点和59,然后按时间范围查询数据
    let startTime = moment(time.toString()).startOf('day').unix()
    console.log(startTime);
    let endTime = moment(time.toString()).endOf('day').unix()
    console.log(endTime);
    // 分页
    // 总页数
    let total_page = ""
    // 总条数
    // 从哪里开始
    let start = (page - 1) * limit
    // 根据时间返回获取数据
    // 先查出总是
    mysql.select(`SELECT COUNT(*) AS count FROM shop_audios WHERE shop_audios.add_time>'${startTime}' AND shop_audios.add_time<'${endTime}'`).then(results => {
        let { count } = results[0]
        total_page = Math.ceil(count / limit)
        return mysql.select(`SELECT shop_audios.id,shop_audios.title,shop_audios.epi_tt,shop_audios.ended,shop_audios.image_url as cover  FROM shop_audios WHERE shop_audios.add_time>'${startTime}' AND shop_audios.add_time<'${endTime}' limit ${start},${limit}`)
    }).then(results => {
        let list = results

        sendMsg(res, "请求成功", 0, {
            day,
            page,
            total_page,
            list
        })

    }).catch(error => {
        next(error)
    })

}


// 把回复封装成一个函数
function sendMsg(res, msg, code, data) {
    res.send({
        msg,
        code,
        data,
    })
}

