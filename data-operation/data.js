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

//通过中间件,请求得到user_id和username
let Global_user_id = ""
let Global_username = ""
// 解析token,拿到user_id
exports.analysisToken = (userInfo) => {
    Global_user_id = userInfo.user_id
    Global_username = userInfo.username
}
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
        ignoreChars: '0oO1ilI'
    });
    yzcode = captcha.text.toLowerCase() //忽略大小写

    console.log(yzcode);

    res.type('svg');
    res.status(200).send(captcha.data);
}
// 登陆接口

exports.login = async (req, res, next) => {
    // 获取用户输入的用户名和密码和验证码,然后验证
    let { username, password, code } = req.body
    if (username == '' || password == '' || code == '') {
        res.status(500)
        sendMsg(res, "用户名,密码,验证码都不能为空", 0)
        return false
    }
    if (code != yzcode) {
        res.status(500)
        sendMsg(res, "验证码有误", 0)
        return false
    }

    await mysql.select(`SELECT shop_users.username,shop_users.avatar,shop_users.id FROM  shop_users  WHERE shop_users.username='${username}' AND shop_users.password='${password}'`).then(results => {

        let user_id = results[0].id
        let recharge_conf = "1"
        let { username, avatar } = results[0]
        let token
        // 生成token
        token = jwt.sign({
            data: { username, user_id }
        }, 'secret', { expiresIn: '24h' });
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

            sendMsg(res, "请求成功", 1, {
                list,
                ...results[0]
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
            time = moment().subtract(10, "days").format("YYYY-MM-DD");
            break;
        case 1:
            time = moment().subtract(15, "days").format("YYYY-MM-DD");
            console.log(time);
            break;
        case 2:
            time = moment().subtract(20, "days").format("YYYY-MM-DD");
            break;
        case 3:
            time = moment().subtract(30, "days").format("YYYY-MM-DD");
            break;
        case 4:
            time = moment().subtract(40, "days").format("YYYY-MM-DD");
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
            time,
            page,
            total_page,
            list
        })

    }).catch(error => {
        next(error)
    })

}

// 热门资源
exports.getHotMovies = (req, res, next) => {
    //参数type 0 总榜 2周榜 1日榜
    //日榜就是找当天的
    // 周榜就是找距离今天6天的
    // 总榜就是距离一个月的
    let { type } = req.body
    if (type == "") {
        type = 0
    }
    let typeTime = ''
    switch (parseInt(type)) {
        // 总榜
        case 0:
            typeTime = moment().subtract(30, "days").format("YYYY-MM-DD");
            break;
        // 日榜
        case 1:
            typeTime = moment().subtract(5, "days").format("YYYY-MM-DD");

            break;
        // 周榜
        case 2:
            typeTime = moment().subtract(6, "days").format("YYYY-MM-DD");
            break;

    }
    // 转化为时间戳
    let startTypeTime = moment(typeTime.toString()).startOf('day').unix()
    let endTypeTime = moment(typeTime.toString()).endOf('day').unix()

    // 查询信息
    mysql.select(`SELECT shop_audios.id,shop_audios.title,shop_audios.image_url as cover,shop_audios.epi_tt as counts,shop_audios_sub.id as sid,shop_audios_sub.epi_curr FROM shop_audios INNER JOIN shop_audios_sub ON shop_audios.id=shop_audios_sub.id AND shop_audios.add_time>'${startTypeTime}' AND shop_audios.add_time<'${endTypeTime}' LIMIT 20`).then(data => {
        sendMsg(res, "请求成功", 1, {
            data
        })
    }).catch(error => {
        next(error)
    })

}
// 分类查询影片的标签

exports.getLabelSearch = async (req, res, next) => {
    let cat = []
    let label = []
    let year = [
        {
            id: 0,
            title: "全部"
        },
        {
            id: 1,
            title: "2020"
        },
        {
            id: 2,
            title: "2019"
        },
        {
            id: 3,
            title: "2018"
        },
        {
            id: 4,
            title: "2017"
        },
        {
            id: 5,
            title: "2011-2016"
        },
        {
            id: 6,
            title: "2000-2010"
        },
        {
            id: 7,
            title: "90年代"
        },
        {
            id: 8,
            title: "80年代"
        },
        {
            id: 9,
            title: "更早"
        },
    ]
    //先查出cat分类
    mysql.select(`SELECT audio_sort.id,audio_sort.name,audio_sort.pid FROM audio_sort WHERE audio_sort.is_delete=0 AND audio_sort.pid=0`).then(results => {
        cat = results
        //  项目都是用这个方式，就来这个方式吧
        return mysql.select(`SELECT audio_labels.id,audio_labels.title FROM audio_labels`)
    }).then(results => {
        label = results
        sendMsg(res, "请求成功", 1, {
            cat,
            year,
            label

        })
    }).catch(error => {
        next(error)
    })

    // 可以这样异步请求
    // await mysql.select(`SELECT audio_labels.id,audio_labels.title FROM audio_labels`).then(label => {
    //     // label查出
    //     console.log(label);


    // })
}
// 演员联想接口
exports.getActor = (req, res, next) => {
    let { keyword } = req.body
    console.log(keyword);

    //   keyword
    if (keyword == undefined) {
        res.status(500)
        sendMsg(res, "请求参数有误", 0)
        return false
    }
    let actorSql
    if (keyword == "") {
        actorSql = `SELECT audio_girls.id, audio_girls.title as name FROM audio_girls LIMIT 20`
    } else {
        actorSql = `SELECT audio_girls.id, audio_girls.title as name FROM audio_girls WHERE audio_girls.title LIKE '%${keyword}%'`
    }
    console.log(actorSql);

    mysql.select(actorSql).then(list => {
        sendMsg(res, "请求成功", 1, {
            list
        })

    }).catch(error => {
        next(error)
    })
}
// 按条件搜索影片
exports.getIndexMovieByLabel = (req, res, next) => {
    //  keyword.搜索的关键词
    // page当前页
    // label：标签名
    // cat ：频道名
    // year：年份名
    let { keyword, page, label, cat, year } = req.body

    let total_page = ""
    let start = Math.ceil(page - 1) * 6
    let count = ""
    let list = []
    // 先查出总数
    let countSql = `SELECT COUNT(*) as count FROM shop_audios WHERE 1=1`
    if (label != '' && label != '全部') {
        countSql += ` AND  shop_audios.label='${label}'`
    }
    if (keyword != '' && keyword != '全部') {
        countSql += ` AND '${keyword}' in (shop_audios.girl_name)`
    }
    if (cat != '' && cat != '全部') {
        countSql += ` AND shop_audios.cat='${cat}'`
    }
    if (year != '' && year != "全部") {
        countSql += ` AND shop_audios.year='${year}'`
    }
    mysql.select(countSql).then(results => {
        count = results[0].count
        total_page = Math.ceil(count / 6)
        //接下来开始查询内容
        let searchSql = `SELECT shop_audios.title,shop_audios.id,shop_audios.ended,shop_audios.epi_tt,shop_audios.image_url as cover FROM shop_audios WHERE 1=1`
        if (label != '' && label != '全部') {
            searchSql += ` AND  shop_audios.label='${label}'`
        }
        if (keyword != '' && keyword != '全部') {
            searchSql += ` AND '${keyword}' in (shop_audios.girl_name)`
        }
        if (cat != '' && cat != '全部') {
            searchSql += ` AND shop_audios.cat='${cat}'`
        }
        if (year != '' && year != "全部") {
            searchSql += ` AND shop_audios.year='${year}'`
        }
        searchSql += `LIMIT ${start},6`
        return mysql.select(searchSql)
    }).then(results => {
        list = results
        return mysql.select(`SELECT audio_labels.id as label_id,audio_labels.title as label_name FROM  audio_labels WHERE audio_labels.id='${label}'`)
    }).then(results => {
        let { label_id, label_name } = results[0]
        sendMsg(res, "请求成功", 1, {
            total_page,
            page,
            list,
            label_id,
            label_name

        })
    })


}
// 根据关键搜索(综合)
exports.searchMovie = (req, res, next) => {
    //    keyword
    // 如果keword为空搜索全部,不为空按模糊搜索
    let { keyword, page } = req.body
    let total_page = ""
    let start = Math.ceil(page - 1) * 6
    let count = ""
    let movieCountSql = `SELECT COUNT(*) as count FROM shop_audios WHERE 1=1`
    if (keyword != "") {
        movieCountSql += ` AND shop_audios.title LIKE '%${keyword}%'`
    }
    mysql.select(movieCountSql).then(results => {
        count = results[0].count
        total_page = Math.ceil(count / 6)
        let searchMovieCountSql = `SELECT shop_audios.id,shop_audios.title,shop_audios.image_url as cover,shop_audios.cat,shop_audios.girl_name,shop_audios.area,shop_audios.video_source,shop_audios.year,audios.actors,audios.subcat as sub_cat,audios.cat as cat_name  FROM shop_audios INNER JOIN audios ON  shop_audios.title=audios.title`
        if (keyword != "") {
            searchMovieCountSql += ` AND shop_audios.title LIKE '%${keyword}%'`
        }
        searchMovieCountSql += ` LIMIT ${start},6`
        return mysql.select(searchMovieCountSql)
    }).then(list => {
        sendMsg(res, "请求成功", 1, {
            total_page,
            page,
            list,
        })
    }).catch(error => {
        next(error)
    })
}
// 影片详情模块(有待优化)
//全局变量,下单的时候要用到这些信息
let movie_data = {}
let curr_data = {}
let curr_pic = {}
exports.getMovieDetail = async (req, res, next) => {


    //    获取跳转过来的id
    let { id, sid } = req.body

    let getSid = ""


    if (id == '') {
        res.status(500)
        sendMsg(res, "id不能为空", 500)
        return false
    }
    // 查出前影片信息
    await mysql.select(`SELECT shop_audios.id,shop_audios.title,shop_audios.label,shop_audios.image_url,shop_audios.girl_name,shop_audios.cat,shop_audios.description,shop_audios.year,shop_audios.video_source,audio_labels.title as label,audio_sort.name as cat_name,audio_girls.title as actors FROM shop_audios  JOIN audio_labels   JOIN audio_sort INNER JOIN audio_girls  WHERE shop_audios.id='${id}' AND audio_labels.id=shop_audios.label AND audio_sort.id=shop_audios.cat AND audio_girls.id IN (shop_audios.girl_name)`).then(results => {
        movie_data = results[0]

    })
    // 查出第一集或者第几集的信息
    // 默认第一集
    // id=shop_audios_sub.audio_id sid=shop_audios_sub.id
    let epiCurrSql = `SELECT shop_audios_sub.id as sid,shop_audios_sub.audio_url,shop_audios_sub.price,shop_audios_sub.discount_exptime,shop_audios_sub.discount,shop_audios_sub.show_time,shop_audios_sub.filename,shop_audios_sub.video_size  FROM shop_audios_sub  WHERE shop_audios_sub.audio_id='${id}' ORDER BY shop_audios_sub.epi_curr ASC  limit 1`
    if (sid != "") {
        // 不等于空就根据集数来获取
        epiCurrSql = `SELECT shop_audios_sub.id as sid,shop_audios_sub.audio_url,shop_audios_sub.price,shop_audios_sub.discount_exptime,shop_audios_sub.discount,shop_audios_sub.show_time,shop_audios_sub.filename,shop_audios_sub.video_size  FROM shop_audios_sub WHERE shop_audios_sub.audio_id='${id}' AND shop_audios_sub.id='${sid}'`
    }
    // 查出集数
    await mysql.select(epiCurrSql).then(results => {
        curr_data = results[0]

        getSid = results[0].sid
        console.log(curr_data);




    })
    // 集数的封面图等 
    await mysql.select(`SELECT shop_cover.thumbnail_count,shop_cover.thumbnail,shop_cover.long_screen FROM shop_cover WHERE shop_cover.audio_id='${getSid}'`).then(results => {
        curr_pic = results[0]
        sendMsg(res, "请求成功", 1, {
            ...movie_data,
            ...curr_data,
            ...curr_pic
        })
    }).catch(error => {
        next(error)
    })


}
// 获取水印类型
exports.getUserRuleTile = (req, res, next) => {
    redis.get("rule").then(results => {
        if (results != null) {
            sendMsg(res, "请求成功", 1, JSON.parse(results))
        } else {
            mysql.select(`SELECT audio_user_rule.id,audio_user_rule.title FROM audio_user_rule WHERE audio_user_rule.user_id='${Global_user_id}'`).then(results => {
                sendMsg(res, "请求成功", 1, results)
                redis.set("rule", JSON.stringify(results))
            }).catch(error => {
                next(error)
            })
        }
    })

}
// 获取项目发布类型
exports.getUserWeb = (req, res, next) => {
    redis.get("Web").then(results => {
        if (results != null) {
            sendMsg(res, "请求成功", 1, JSON.parse(results))
        } else {
            mysql.select(`SELECT audio_user_web.id,audio_user_web.title FROM audio_user_web WHERE audio_user_web.user_id='${Global_user_id}'`).then(results => {
                sendMsg(res, "请求成功", 1, results)
                redis.set("Web", JSON.stringify(results))
            }).catch(error => {
                next(error)
            })
        }
    })

}
// 获取集数
exports.getEpisode = (req, res, next) => {
    //   根据id查出集数
    let { id } = req.body
    if (id == '') {
        res.status(500)
        sendMsg(res, "id不能为空", 500)
        return false
    }
    mysql.select(`SELECT shop_audios_sub.id as sid,shop_audios_sub.epi_curr,shop_audios_sub.discount,shop_audios_sub.discount_exptime FROM shop_audios_sub WHERE shop_audios_sub.audio_id='${id}' ORDER BY shop_audios_sub.epi_curr`).then(results => {
        let list = [];
        let count = results.length
        for (var i = 0; i < results.length; i = i + 10) {
            list.push(results.slice(i, i + 10));
        }
        sendMsg(res, "请求成功", 1, {
            list,
            count
        })
    }).catch(error => {
        next(error)
    })

}
// 加入购物车
exports.addCar = (req, res, next) => {
    // sid(集数id),ruleid(水印类型id),webid(项目类型id)
    let { sid, ruleid, webid } = req.body
    if (sid == '' || ruleid == '' || webid == '') {
        res.status(500)
        sendMsg(res, "参数不能为空", 500)
        return false
    }
    let nowTime = moment().format("YYYY-MM-DD HH:mm:ss")
    mysql.select(`INSERT INTO audio_cart (audio_id,rule_id,web_id,user_id,add_time) VALUES ('${sid}','${ruleid}','${webid}','${Global_user_id}','${moment(nowTime).unix()}') `).then(results => {
        sendMsg(res, "成功加入购物车", 1)
    }).catch(error => {
        next(error)
    })
}
// 下单
exports.addOrder = (req, res, next) => {
    //  参数:    
    let { sid, ruleid, webid } = req.body
    if (sid == '' || ruleid == '' || webid == '') {
        res.status(500)
        sendMsg(res, "参数不能为空", 500)
        return false
    }
    let orderTime = moment().format("YYYY-MM-DD HH:mm:ss")
    // 先根据sid查出集数的信息

    // 先查出所需字段,再插入
    mysql.select(`INSERT INTO audio_order_log (audio_id,ruleid,webid,user_id,add_time,orderNo,filename,audio_url,price,discount_price,video_size) VALUES ('${sid}','${ruleid}','${webid}','${Global_user_id}','${moment(orderTime).unix()}','${orderID()}','${curr_data.filename}','${curr_data.audio_url}','${curr_data.price}','${curr_data.discount}','${curr_data.video_size}') `).then(results => {
        sendMsg(res, "下单成功", 1)
    }).catch(error => {
        next(error)
    })
}

// 个人信息
exports.getUserInfo = (req, res, next) => {
    let msg
    let message_num
    // 根据id和username查出信息
    mysql.select(`SELECT shop_users.username, shop_users.avatar,shop_users.price as coin FROM shop_users WHERE shop_users.id='${Global_user_id}' AND shop_users.username='${Global_username}' `).then(results => {
        msg = results[0]
        return mysql.select(`SELECT count(*) as message_num FROM audio_order_log WHERE audio_order_log.user_id='${Global_user_id}'`)
    }).then(results => {
        message_num = results[0]
        return mysql.select(`SELECT count(*) as car_num FROM audio_cart WHERE audio_cart.user_id='${Global_user_id}'`)

    }).then(results => {
        sendMsg(res, "请求成功", 1, {
            ...msg,
            ...message_num,
            ...results[0]
        })
    })


}

// 获取加入购物车的影片
exports.getCarList = (req, res, next) => {
    //  根据userid获取信息
    mysql.select(`SELECT audio_cart.id,audio_cart.audio_id,audio_cart.rule_id,audio_cart.web_id,audio_cart.status,audio_user_rule.title as rule_title,audio_user_web.title as web_title,shop_audios_sub.epi_curr,shop_audios_sub.price,shop_audios_sub.show_time,shop_audios_sub.title,shop_cover.epi_cover FROM audio_cart JOIN audio_user_rule JOIN audio_user_web  JOIN shop_audios_sub  JOIN shop_audios INNER JOIN shop_cover WHERE audio_cart.user_id='${Global_user_id}' AND audio_cart.rule_id=audio_user_rule.id AND  audio_cart.web_id=audio_user_web.id AND audio_cart.audio_id=shop_audios_sub.audio_id AND shop_audios.id=shop_audios_sub.audio_id AND shop_cover.audio_id=shop_audios_sub.id`).then(results => {
        sendMsg(res, "请求成功", 1, results)
    })
        .catch(error => {
            next(error)
        })
}

// 获取消息
exports.getMsgList = async (req, res, next) => {
    let { limit, page } = req.body
    if (page == '') {
        page = 1
    }
    if (limit == '') {
        limit = 15
    }
    let total_page = ""
    // 总条数
    // 从哪里开始
    let start = (page - 1) * limit

    // 先查出总数
    await mysql.select(`SELECT COUNT(*) as count FROM audio_order_log WHERE user_id='${Global_user_id}'`).then(results => {
        let { count } = results[0]
        total_page = Math.ceil(count / limit)


    })
    await mysql.select(`SELECT audio_order_log.id,audio_order_log.audio_id,audio_order_log.orderNo,audio_order_log.price,audio_order_log.discount_price,audio_order_log.status,audio_order_log.remote_status,audio_order_log.show_status,audio_order_log.add_time,audio_order_log.update_time,shop_audios_sub.epi_curr,shop_audios.title,shop_cover.epi_cover as cover FROM audio_order_log  JOIN shop_audios_sub  JOIN shop_audios INNER JOIN shop_cover  WHERE user_id='${Global_user_id}' AND audio_order_log.audio_id=shop_audios_sub.audio_id AND shop_audios.id=shop_audios_sub.id AND shop_cover.audio_id=shop_audios_sub.audio_id LIMIT ${start},${limit}`).then(results => {
        sendMsg(res, "请求成功", 1, {
            list: results,
            total_page,
            page
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
// 生成21个不重复的订单号
function orderID() {
    let id = moment().format("YYYYMMDDHHmmss").toString()
    for (let index = 0; index < 7; index++) {
        id += index.toString()
    }
    return id

}

