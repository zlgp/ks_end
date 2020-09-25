// 获取环境变量.配置数据库的线上和线下环境
const env = process.env.NODE_ENV



let MYSQL_COFN
let REDIS_COFN

if (env =='dev') {
    //mysql数据库配置
    // MYSQL_COFN = {
    //     host: 'localhost',
    //     user: 'root',
    //     password: 'root',
    //     database: 'ks_end'
    // },
    MYSQL_COFN = {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'ks'
    },
        REDIS_COFN = {
            port: 6379,
            host: "127.0.0.1"
        }
}
if (env == 'production') {
    //mysql数据库配置
    MYSQL_COFN = {
        host: '47.91.183.111',
        user: 'root',
        password: 'ySVdUdY4ILqZ0&OF',
        database: 'shop'
    },
        REDIS_COFN = {
            port: 6379,
            host: "127.0.0.1",
            password: "adVpVB0Cy3jRIxIj"
        }
}


module.exports = {
    MYSQL_COFN,
    REDIS_COFN
}