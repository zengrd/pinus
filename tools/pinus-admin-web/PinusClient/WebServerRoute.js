const MqttCon = require('mqtt-connection');
const config = require('./../config/adminConfig');
const websocket = require('websocket-stream');
const protcol = require('./protocol');
const WebSocketServer = require('ws').Server;
const adminClient = require('./Client');

var client = null;
function WebServer()
{
    const wss = new WebSocketServer({port: config.webPort});
    wss.on('connection', function (ws) {
        const stream = websocket(ws);
        const socket = MqttCon(stream);

        socket.on('connect', function(pkg) {
            socket.connack({
                returnCode: 0
            });
        });

        socket.on('publish', function(pkg)
        {
            const topic = pkg.topic;
            var msg = pkg.payload.toString();
            msg = JSON.parse(msg);
            msg = protcol.parse(msg);
            if (topic === 'register')
            {
                msg['master'] = JSON.parse(JSON.stringify(config.master));
                initClient(msg);
                connectToMaster(msg.id, msg, function(host, port){
                    socket.publish({
                        topic: 'register',
                        payload: JSON.stringify({
                            code: protcol.PRO_OK,
                            host: host,
                            port: port
                        })
                    });
                });
            }
            else
            {
                if (client === null)
                {
                    socket.removeAllListeners();
                    socket.disconnect();
                    socket.destroy();
                    return;
                }
                (function (msg, topic, socket)
                {
                    const moduleId = msg.moduleId;
                    const body = msg.body;
                    // 走command通道，不走excute
                    if(msg.command){
                        client.command(msg.command, moduleId, body, (err,data) =>
                        {
    
                            const payload = protcol.composeResponse(msg, err, data);
                            if (payload)
                            {
                                // 回传回网站的客户端
                                socket.publish({
                                    topic: topic,
                                    payload: payload
                                });
                            }
                        })
                    }
                    else{
                        client.request(moduleId, body, (err,data) =>
                        {
                            const payload = protcol.composeResponse(msg, err, data);
                            if (payload)
                            {
                                socket.publish({
                                    topic: topic,
                                    payload: payload
                                });
                            }   
                        })
                    }

                })(msg, topic, socket);
            }
        });

        socket.on('pingreq', function() {
            socket.pingresp();
        });
    })
}

function connectToMaster(id, opts, cb) {
    let server = opts.master.shift();
    if(server){
        
        client.connect(id, server.host, server.port,function(err)
        {
            if(err) {
                console.error(err);
                connectToMaster(id, opts, cb);
            }
            else{
                cb(server.host, server.port);
                return;
            }
        });

    }
    else{
        client = null;
    }
}

function initClient(opts){
    client = new adminClient({username: opts.username, password: opts.password, md5: opts.md5});
    client.on('disconnect', function()
    {
        //client = null;
    });

    client.on('error', function()
    {
        //client = null;
    });

    client.on('close', function()
    {
        //client = null;
    });
}

module.exports = WebServer;