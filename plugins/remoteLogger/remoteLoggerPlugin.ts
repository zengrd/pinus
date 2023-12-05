import { Application, getLog4jsLogger, IPlugin, IComponent, RESERVED, setRemoteLoggerFunc, getLogger, setPinusLogLevel, proxyLogger } from 'pinus';

export function remoteLoggerPlugin(){
    return new RemoteLoggerPlugin();
  }

// 插件类
class RemoteLoggerPlugin implements IPlugin {
    name = 'remoteLoggerPlugin';
    components = [RemoteLoggerComponent];
}

class RemoteLoggerComponent implements IComponent{
    public name = 'remoteLogger';
    public app: Application;
    constructor(app: Application, opts?: any){
        this.app = app
    }

    afterStartAll(){
        if(this.app.get(RESERVED.REMOTE_LOGGER) === 'worker'){
            setRemoteLoggerFunc(getRemoteLogger.bind(null, this.app));
            reloadLogger();
        }
        setPinusLogLevel(0);
    }
}


export interface Logger {
  
    readonly category: string;
  
    log(level: string, ...args: any[]): void;
  
    trace(message: any, ...args: any[]): void;
  
    debug(message: any, ...args: any[]): void;
  
    info(message: any, ...args: any[]): void;
  
    warn(message: any, ...args: any[]): void;
  
    error(message: any, ...args: any[]): void;
  
    fatal(message: any, ...args: any[]): void;
  
    mark(message: any, ...args: any[]): void;
  }


class RemoteLogger implements Logger{
    category: string;
    prefix: string;
    app: Application;
    targetServerId: string;

    constructor(app: Application, name: string, prefix: string, targetServerId: string){
        this.category = name;
        this.prefix = prefix;
        this.app = app;
        
        // 在远程log 服务器声明一下logger
        this.targetServerId = targetServerId;
        this.app.rpc?.log.logRemoter.genLogger.to(this.targetServerId, true)(this.category);
    }

    log(level: string, ...args: any[]): void {
        this.app.rpc?.log.logRemoter.log.to(this.targetServerId, true)(this.category, level, ...args);
    }

    trace(message: any, ...args: any[]): void {
        this.app.rpc?.log.logRemoter.trace.to(this.targetServerId, true)(this.category, message, ...args);
    }
  
    debug(message: any, ...args: any[]): void {
        this.app.rpc?.log.logRemoter.debug.to(this.targetServerId, true)(this.category, message, ...args);
    }
  
    info(message: any, ...args: any[]): void {
        this.app.rpc?.log.logRemoter.info.to(this.targetServerId, true)(this.category, message, ...args);
    }
  
    warn(message: any, ...args: any[]): void {
        this.app.rpc?.log.logRemoter.warn.to(this.targetServerId, true)(this.category,  message, ...args);
    }
  
    error(message: any, ...args: any[]): void {
        this.app.rpc?.log.logRemoter.error.to(this.targetServerId, true)(this.category, message, ...args);
    }
  
    fatal(message: any, ...args: any[]): void {
        this.app.rpc?.log.logRemoter.fatal.to(this.targetServerId, true)(this.category, message, ...args);
    }
  
    mark(message: any, ...args: any[]): void {
        this.app.rpc?.log.logRemoter.mark.to(this.targetServerId, true)(this.category, message, ...args);
    }
}

function getRemoteLogger(app: Application, category?: string, prefix?: string){
    let targetServerId = getLogServerId(app);
    if(targetServerId){
        let remoteLogger = new RemoteLogger(app, category, prefix, targetServerId);
        return remoteLogger;
    }
    else{
        // 远程log服务器失效，需要进行判断
        console.error('请注意，远程log服务器失效');
        return getLog4jsLogger(category);
    }

}

function getLogServerId(app: Application){
    let servers = app.getServersByType('log');
    if(servers && servers.length){
        let index = parseInt(app.serverId.split('-').pop()) % servers.length
        if(!isNaN(index)){
            return servers[index].id
        }
        else{
            return servers[0].id
        }
    }
}

function reloadLogger(){
    for(let category in proxyLogger){
        for(let prefix in proxyLogger[category]){
            getLogger(category, ...prefix.split('] ['));
        }
    }
}