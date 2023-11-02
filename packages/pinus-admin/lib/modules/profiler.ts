import { getLogger } from 'pinus-logger';
import * as utils from '../util/utils';

import * as path from 'path';
let logger = getLogger('pinus-admin', path.basename(__filename));


import * as fs from 'fs';
import { IModule, MonitorCallback, MasterCallback } from '../consoleService';
import { MonitorAgent } from '../monitor/monitorAgent';
import { MasterAgent } from '../master/masterAgent';
let profiler = require('v8-profiler-next');



export class ProfilerModule implements IModule {
    static  moduleId = 'profiler';
    root: string;
    level?: number;

    constructor(opts: {path: string}) {
        this.root = opts.path;
        this.level = 99;
    }

    monitorHandler(agent: MonitorAgent, msg: any, cb: MonitorCallback) {
        let type = msg.type, action = msg.action, serverId = msg.serverId, result = null;
        
        let title = `${serverId}-${type}`
        if (type === 'cpuprofile') {
            profiler.setGenerateType(1);
            if (action === 'start') {
                profiler.startProfiling(title, true);
                cb(null, {result: `开始进行${type}...`});
            } else {
                const profile = profiler.stopProfiling(title);
                profile.export( (error: any, result: any) => {
                    if(error){
                        cb(new Error("cpuprofile过程出错"));
                        return;
                    }
                    writeFile(this, title, type, result, profile, cb);
                  });
            }
        }
        else if(type === 'heapprofile'){
            profiler.setGenerateType(2);
            if (action === 'start') {
                profiler.startSamplingHeapProfiling();
                cb(null, {result: `开始进行${type}...`});
            } else {
                const profile = profiler.stopSamplingHeapProfiling();
                writeFile(this, title, type, JSON.stringify(profile), profile, cb);
            }
        } 
        else if(type === 'heapsnapshot'){
            profiler.setGenerateType(2);
            const snapshot = profiler.takeSnapshot()
            snapshot.export((error: any, result: any) => {
                if(error){
                    cb(new Error("heapsnapshot过程出错"));
                    return;
                }
                writeFile(this, title, type, result, snapshot, cb);
            });
        }   
        else{
            cb(new Error("错误的profiler类别！"));
        }
    }

    clientHandler(agent: MasterAgent, msg: any, cb: MasterCallback) {
        if (msg.action === 'list') {
            list(this, agent, msg, cb);
            return;
        }

        if(msg.action === 'get'){
            get(this, agent, msg, cb);
            return;
        }

        if(msg.action === 'delete'){
            del(this, agent, msg, cb);
            return;
        }
        
        agent.request(msg.serverId, ProfilerModule.moduleId, msg, function(err, res) {
            if (err) {
                logger.error('fail to excute v8-profiler' + err.stack);
                cb(err.toString());
                return;
            }
            cb(null, res);
        });
    }
}

// 显示服务器列表和显示已有profile文件列表和文件大小
let list = function(ProfilerModule: ProfilerModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    let servers: string[] = [];
    let profiles: any[] = [];
    let idMap = agent.idMap;

    for (let sid in idMap) {
        servers.push(sid);
    }

    fs.readdir(ProfilerModule.root, function(err, filenames) {
        if (err) {
            filenames = [];
        }
        for (let i = 0, l = filenames.length; i < l; i++) {
            let filePath = path.join(ProfilerModule.root, filenames[i]);
            let fileSize = getFileSize(filePath);
            profiles.push({
                name: filenames[i],
                size: fileSize
            });
        }

        cb(null, {
            servers: servers,
            profiles: profiles
        });
    });
};

let getFileSize = function(filePath: string){
    try{
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInKB = fileSizeInBytes / 1024;
        return `${fileSizeInKB}KB`;
    }
    catch(err){
        return 'unknown';
    }
}


// 删除已有的profile文件
let del = function(ProfilerModule: ProfilerModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    let filename = msg.filename;
    if (!filename) {
        cb('empty filename', '');
        return;
    }
    fs.unlink(path.join(ProfilerModule.root, filename), (err)=>{
        if(err){
            cb('删除文件出错:' + err.stack);
        }
        else{
            cb(null, {isDel: true});
        }
    });
};


/**
 * get the content of the profile file
 */
let get = function(ProfilerModule: ProfilerModule, agent: MasterAgent, msg: any, cb: MasterCallback) {
    let filename = msg.filename;
    if (!filename) {
        cb('empty filename', '');
        return;
    }
    fs.readFile(path.join(ProfilerModule.root, filename), 'utf-8', function(err, data) {
        if (err) {
            logger.error('fail to read profile file:' + filename + ', ' + err.stack);
            cb('fail to read profile with name:' + filename, '');
        }
        cb(null, data);
    });
};

let writeFile = function(ProfilerModule: ProfilerModule, title: string, type: string, content: string, profile: any, cb: MonitorCallback){
    let name = title + '-' + utils.format(new Date()) + '.' + type;
    let filename = path.join(ProfilerModule.root, name);
    fs.promises.writeFile(filename, content, {flag: 'w+'})
    .then(() => {
        let size = getFileSize(filename);
        cb(null, {name: name, size: size});
        profile.delete();
    })
    .catch(() => {
        cb(new Error(`生成${name} 文件过程出错`));
    })
}
