/*!
 * Pinus -- consoleModule runScript
 * add gmCommand，author：zengrd
 * MIT Licensed
 */

import { IModule, MonitorCallback, MasterCallback } from '../consoleService';
import { MonitorAgent } from '../monitor/monitorAgent';
import { MasterAgent } from '../master/masterAgent';
import { AdminUserInfo } from '../util/constants';


interface ICommand {
    name: string; // 指令名字
    argsType: string[]; // 参数类型 
    desc: string; // 指令描述
    flag: string; // 指令标签，如礼包、玩家、公告等等
    func: Function; // 指令位置
    level: number; // 指令权限，需要高于这个权限的用户才能访问使用该指令
}

export class GmModule implements IModule {
    app: any;
    commands: {[key: string]: ICommand};;

    static moduleId = 'gmCommand';

    constructor(opts: {app: any, commands: {[key: string]: ICommand}}) {
        this.app = opts.app;
        this.commands = opts.commands || {};
    }

    monitorHandler(agent: MonitorAgent, msg: any, cb: MonitorCallback) {
    }

    clientHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        // 验证客户端，获取客户端等级
        let clientLevel: number;
        let clientId = msg.clientId;
        if (!clientId) {
            cb('Unknow clientId');
            return 'Unknow clientId'
        }
        let _client = agent.getClientById(clientId);
        if(_client && _client.info && (_client.info as AdminUserInfo).level){
            clientLevel =  (_client.info as AdminUserInfo).level
        }
        else{
            cb('Client info error');
            return 'Client info error';
        }
        
        if(msg.command === 'list'){
            list(agent, msg, this.commands, clientLevel, cb);
            return;
        }
        let command = this.commands[msg.command];
        if (!command || command.func || typeof command.func !== 'function') {
            cb('unknown command:' + msg.command);
            return;
        }
        run(this.app, agent, msg, command, clientLevel, cb);
    }
}

/**
 * List commmand
 */
let list = function(agent: MasterAgent, msg: any, commands: {[key: string]: ICommand}, clientLevel: number, cb: MasterCallback) {
    let myCommands: ICommand[];
    // 账号权限大于等于模块权限才能访问该模块 
    for(let key in  commands){
        if(commands[key].level && clientLevel >= commands[key].level){
            myCommands.push(commands[key])
        }
    }
    cb(null, {
        commands: myCommands
    });
};


/**
 * Run the gm command
 */
let run = function(app: any, agent: MasterAgent, msg: any, command: ICommand, clientLevel: number, cb: MasterCallback) {
    // 先确定是否有权限运行
    let commandLevel = command.level || 1;
    if(clientLevel < commandLevel){
        cb('run gm command permission deny!');
        return;
    }
    let convertedArgs: any[];
    let argsType = command.argsType;
    let args = msg.args;
    let i = 0;
    for(let type of argsType){
        if(!!args[i]){
            break;
        }
        switch(type){
            case 'number':
                convertedArgs.push(Number(args[i]));
                break;
            case 'string':
                convertedArgs.push(String(args[i]));
                break;
            case 'Array':
                convertedArgs.push(JSON.parse(args[i]));
                break;
            default:
                // 处理未知类型
                break;
        }
        i = i+1;
    }

    command.func(app, agent, ...convertedArgs, cb);
};