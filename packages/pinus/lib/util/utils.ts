import * as os from 'os';
import * as fs from 'fs';
import * as util from 'util';
import {exec} from 'child_process';
import {getLogger} from 'pinus-logger';
import * as Constants from './constants';
import {pinus} from '../pinus';
import {ServerInfo} from './constants';
import {Application} from '../application';
import * as path from 'path';

let logger = getLogger('pinus', path.basename(__filename));

/**
 *  清理被引用的模块缓存
 */
export function clearRequireCache(path: string) {
    const moduleObj = require.cache[path];
    if (!moduleObj) {
        logger.warn('can not find module of truepath', path);
        return;
    }
    if (moduleObj.parent) {
        //    console.log('has parent ',moduleObj.parent);
        moduleObj.parent.children.splice(moduleObj.parent.children.indexOf(moduleObj), 1);
    }
    delete require.cache[path];
}

export function clearRequireCaches(dir: string){
    const files = fs.readdirSync(dir); // 读取文件夹中的文件和文件夹

    files.forEach((file) => {
      const filePath = path.join(dir, file); // 构建文件或文件夹的完整路径
  
      if (fs.statSync(filePath).isDirectory()) {
        // 如果是文件夹，则递归调用自身遍历子文件夹
        clearRequireCaches(filePath);
      } else {
        // 执行你的操作，例如打印文件路径
        clearRequireCache(filePath);
      }
    });
}

/**
 *  魔改module require的模块
 *  如果有hotfix 文件就替换成hotfix 文件里面的值
 *  如果没有hotfix文件，就只是正常require文件
 *  Todo
 */
let _replacePathMap: { [key: string]: string } = {};

export function overrideRequire() {
    console.log(_replacePathMap)
    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function (modulePath: string, ...rest: any[]) {
        console.info('start to require ' + modulePath);
        let _modulePath = require.resolve(modulePath);
        if(_replacePathMap.hasOwnProperty(_modulePath)){
            return originalLoad.apply(Module, [_replacePathMap[_modulePath], ...rest]);
        }
        return originalLoad.apply(Module, [modulePath, ...rest]);
    }
};

/**
 *  增加单个文件为覆盖的内容
 */

export function replaceRequireFile(app: Application, relativePath: string){
    let hotfixFilePath = require.resolve(path.join(app.getBase(), Constants.FILEPATH.HOTFIX_DIR, relativePath));
    const fileExtension = path.extname(relativePath);
    if(fileExtension === '.ts'){
        relativePath = relativePath.replace(/\.ts$/, '.js');
    }
    let originalFilePath = require.resolve(path.join(app.getPkgBase(), relativePath));
    // 原始文件存在的情况
    if(fs.existsSync(originalFilePath) && fs.statSync(originalFilePath).isFile()){
        if(!_replacePathMap.hasOwnProperty(originalFilePath)){
            console.log('add _pathMap', originalFilePath, hotfixFilePath);
            _replacePathMap[originalFilePath] = hotfixFilePath;
        }
    }
}

/**
 *  按文件夹增加多个文件到_pathMap中
 */
export function replaceRequireFiles(app: Application, relativeDir: string){
    console.log('start to replaceRequireFiles')
    let hotfixFileDir = path.join(app.getBase(), Constants.FILEPATH.HOTFIX_DIR, relativeDir);
    let hotfixDir = path.join(app.getBase(), Constants.FILEPATH.HOTFIX_DIR);
    console.log('replaceRequireFiles', hotfixFileDir, hotfixDir)
    function recursivelyReadFilesSync(dir: string){
        const files = fs.readdirSync(dir); // 读取文件夹中的文件和文件夹
        files.forEach((file) => {
          const filePath = path.join(dir, file); // 构建文件或文件夹的完整路径
      
          if (fs.statSync(filePath).isDirectory()) {
            // 如果是文件夹，则递归调用自身遍历子文件夹
            recursivelyReadFilesSync(filePath);
          } else {
            // 执行操作，替换require的路径
            const fileExtension = path.extname(filePath);
            if (fileExtension === '.js' || fileExtension === '.ts' || fileExtension === '.json') {
                let relativePath = path.relative(hotfixDir, filePath);
                replaceRequireFile(app, relativePath);
            }
          }
        });
    }
    // 通过hotfix 目录进行遍历
    recursivelyReadFilesSync(hotfixFileDir);
}


/**
 * Invoke callback with check
 */
export function invokeCallback(cb: Function, ...args: any[]) {
    if (typeof cb === 'function') {
        let len = args.length + 1;
        if (len === 1) {
            return cb();
        }

        if (len === 2) {
            return cb(args[0]);
        }

        if (len === 3) {
            return cb(args[0], args[1]);
        }

        if (len === 4) {
            return cb(args[0], args[1], args[2]);
        }
        cb.apply(null, args);
        // cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
}

/**
 * Get the count of elements of object
 */
export function size(obj: any) {
    let count = 0;
    for (let i in obj) {
        if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
            count++;
        }
    }
    return count;
}

/**
 * Check a string whether ends with another string
 */
export function endsWith(str: string, suffix: string) {
    if (typeof str !== 'string' || typeof suffix !== 'string' ||
        suffix.length > str.length) {
        return false;
    }
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

/**
 * Check a string whether starts with another string
 */
export function startsWith(str: string, prefix: string) {
    if (typeof str !== 'string' || typeof prefix !== 'string' ||
        prefix.length > str.length) {
        return false;
    }

    return str.indexOf(prefix) === 0;
}

/**
 * Compare the two arrays and return the difference.
 */
export function arrayDiff<T extends string>(array1: Array<T>, array2: Array<T>) {
    let o: { [key: string]: boolean } = {};
    for (let i = 0, len = array2.length; i < len; i++) {
        o[array2[i]] = true;
    }

    let result = [];
    for (let i = 0, len = array1.length; i < len; i++) {
        let v = array1[i];
        if (o[v]) continue;
        result.push(v);
    }
    return result;
}

/*
 * Date format
 */
export function format(date: Date, format ?: string) {
    format = format || 'MMddhhmm';
    let o = {
        'M+': date.getMonth() + 1, // month
        'd+': date.getDate(), // day
        'h+': date.getHours(), // hour
        'm+': date.getMinutes(), // minute
        's+': date.getSeconds(), // second
        'q+': Math.floor((date.getMonth() + 3) / 3), // quarter
        'S': date.getMilliseconds() // millisecond
    };

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }

    for (let k in o) {
        if (new RegExp('(' + k + ')').test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length === 1 ? (o as any)[k] :
                ('00' + (o as any)[k]).substr(('' + (o as any)[k]).length));
        }
    }
    return format;
}

/**
 * check if has Chinese characters.
 */
export function hasChineseChar(str: string) {
    if (/.*[\u4e00-\u9fa5]+.*$/.test(str)) {
        return true;
    } else {
        return false;
    }
}

/**
 * transform unicode to utf8
 */
export function unicodeToUtf8(str: string) {
    let i, len, ch;
    let utf8Str = '';
    len = str.length;
    for (i = 0; i < len; i++) {
        ch = str.charCodeAt(i);

        if ((ch >= 0x0) && (ch <= 0x7F)) {
            utf8Str += str.charAt(i);

        } else if ((ch >= 0x80) && (ch <= 0x7FF)) {
            utf8Str += String.fromCharCode(0xc0 | ((ch >> 6) & 0x1F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x800) && (ch <= 0xFFFF)) {
            utf8Str += String.fromCharCode(0xe0 | ((ch >> 12) & 0xF));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x10000) && (ch <= 0x1FFFFF)) {
            utf8Str += String.fromCharCode(0xF0 | ((ch >> 18) & 0x7));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x200000) && (ch <= 0x3FFFFFF)) {
            utf8Str += String.fromCharCode(0xF8 | ((ch >> 24) & 0x3));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        } else if ((ch >= 0x4000000) && (ch <= 0x7FFFFFFF)) {
            utf8Str += String.fromCharCode(0xFC | ((ch >> 30) & 0x1));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 24) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
            utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

        }

    }
    return utf8Str;
}

/**
 * Ping server to check if network is available
 *
 */
export function ping(host: string, cb: (ret: boolean) => void) {
    if (!isLocal(host)) {
        let cmd = 'ping -w 15 ' + host;
        exec(cmd, function (err, stdout, stderr) {
            if (!!err) {
                cb(false);
                return;
            }
            cb(true);
        });
    } else {
        cb(true);
    }
}

/**
 * Check if server is exsit.
 *
 */
export function checkPort(server: ServerInfo, cb: (result: string) => void) {
    if (!server.port && !server.clientPort) {
        invokeCallback(cb, 'leisure');
        return;
    }
    let port = server.port || server.clientPort;
    let host = server.host;
    let generateCommand = function (host: string, port: number) {
        let cmd;
        let ssh_params = pinus.app.get(Constants.RESERVED.SSH_CONFIG_PARAMS);
        if (!!ssh_params && Array.isArray(ssh_params)) {
            ssh_params = ssh_params.join(' ');
        }
        else {
            ssh_params = '';
        }
        if (!isLocal(host)) {
            cmd = util.format('ssh %s %s "netstat -an|awk \'{print $4}\'|grep %s|wc -l"', host, ssh_params, port);
        } else {
            cmd = util.format('netstat -an|awk \'{print $4}\'|grep %s|wc -l', port);
        }
        return cmd;
    };
    let cmd1 = generateCommand(host, port);
    let child = exec(cmd1, function (err, stdout, stderr) {
        if (err) {
            logger.error('command %s execute with error: %j', cmd1, err.stack);
            invokeCallback(cb, 'error');
        } else if (stdout.trim() !== '0') {
            invokeCallback(cb, 'busy');
        } else {
            port = server.clientPort;
            let cmd2 = generateCommand(host, port);
            exec(cmd2, function (err, stdout, stderr) {
                if (err) {
                    logger.error('command %s execute with error: %j', cmd2, err.stack);
                    invokeCallback(cb, 'error');
                } else if (stdout.trim() !== '0') {
                    invokeCallback(cb, 'busy');
                } else {
                    invokeCallback(cb, 'leisure');
                }
            });
        }
    });
}

export function isLocal(host: string) {
    let app = pinus.app;
    if (!app) {
        return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host);
    } else {
        return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0' || inLocal(host) || host === app.master.host;
    }
}

/**
 * Load cluster server.
 *
 */
export function loadCluster(app: Application, server: ServerInfo, serverMap: { [serverId: string]: ServerInfo }) {
    let increaseFields: { [key: string]: string } = {};
    let host = server.host;
    let count = Number(server[Constants.RESERVED.CLUSTER_COUNT]);
    let seq = app.clusterSeq[server.serverType];
    if (!seq) {
        seq = 0;
        app.clusterSeq[server.serverType] = count;
    } else {
        app.clusterSeq[server.serverType] = seq + count;
    }

    for (let key in server) {
        let value = (server as any)[key].toString();
        if (value.indexOf(Constants.RESERVED.CLUSTER_SIGNAL) > 0) {
            let base = (server as any)[key].slice(0, -2);
            increaseFields[key] = base;
        }
    }

    let clone = function (src: any) {
        let rs: any = {};
        for (let key in src) {
            rs[key] = src[key];
        }
        return rs;
    };
    for (let i = 0, l = seq; i < count; i++ , l++) {
        let cserver = clone(server);
        cserver.id = Constants.RESERVED.CLUSTER_PREFIX + server.serverType + '-' + l;
        for (let k in increaseFields) {
            let v = parseInt(increaseFields[k]);
            cserver[k] = v + i;
        }
        serverMap[cserver.id] = cserver;
    }
}

// export function extends(origin, add)
// {
//    if (!add || !this.isObject(add)) return origin;

//    let keys = Object.keys(add);
//    let i = keys.length;
//    while (i--)
//    {
//        origin[keys[i]] = add[keys[i]];
//    }
//    return origin;
// };

export function headHandler(headBuffer: Buffer) {
    let len = 0;
    for (let i = 1; i < 4; i++) {
        if (i > 1) {
            len <<= 8;
        }
        len += headBuffer.readUInt8(i);
    }
    return len;
}

let inLocal = function (host: string) {
    for (let index in localIps) {
        if (host === localIps[index]) {
            return true;
        }
    }
    return false;
};

let localIps = function () {
    let ifaces = os.networkInterfaces();
    let ips: string[] = [];
    let func = function (details: os.NetworkInterfaceInfo) {
        if (details.family === 'IPv4') {
            ips.push(details.address);
        }
    };
    for (let dev in ifaces) {
        ifaces[dev].forEach(func);
    }
    return ips;
}();

export function isObject(arg: any) {
    return typeof arg === 'object' && arg !== null;
}

export function extendsObject(origin: any, add: any) {
    if (!add || !isObject(add)) return origin;

    let keys = Object.keys(add);
    let i = keys.length;
    while (i--) {
        origin[keys[i]] = add[keys[i]];
    }
    return origin;
}

export let promisify = util.promisify;