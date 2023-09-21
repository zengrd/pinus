var express = require('express');
var path = require('path');
var morgan = require('morgan');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var config = require('./config/adminConfig');
var users = require('./config/adminUser');
var WebServer = require('./PinusClient/WebServerRoute');
var app = express();


//打开网页时弹出登录对话框
app.use(function (req, res, next) {
    const auth = req.headers['authorization'];
    if (auth) {
        const tmp = auth.split(' ');
        const buf = new Buffer(tmp[1], 'base64');
        const plain_auth = buf.toString();
        const creds = plain_auth.split(':');
        const username = creds[0];
        const password = creds[1];

		for(let user of users){
			if ((username === user.username) && (password === user.password)) {
				//认证成功，允许访问
				config.username = username;
				config.password = password;
				config.level = user.level;
				config.env = user.env;
				return next();
			}
		}
    }

    //要让浏览器弹出登录对话框，必须将status设为401，Header中设置WWW-Authenticate
    res.set('WWW-Authenticate', 'Basic realm=""');
    res.status(401).end();
});

// 验证通过开启Web服务
WebServer();

var view = __dirname + '/views';

//app.use(compression());

app.use(morgan(':method :url :response-time ms'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: '*/*' }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.set('view engine', 'html');
app.set('views', view);
app.engine('.html', require('ejs').__express);

app.on('error', function(err) {
	console.error('app on error:' + err.stack);
});

app.get('/', function(req, resp) {
	resp.render('index', config);
});

app.get('/module/:mname', function(req, resp) {
	resp.render(req.params.mname);
});

app.listen(7001);
console.log('[AdminConsoleStart] visit http://' + config.host +':7001');