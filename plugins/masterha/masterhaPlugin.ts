import { Application, IPlugin, invokeCallback, IComponent, getLogger, DIR, FILEPATH, RESERVED, isLocal, localrun, sshrun } from 'pinus';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { EventEmitter } from 'events';
import * as zookeeper from 'node-zookeeper-client';
import { Event, CreateMode } from 'node-zookeeper-client';

let logger = getLogger('pinus', path.basename(__filename));

/**
 * master的高可用插件，提供zookeeper服务
 * 写成typescript形式，和项目统一
 */

export function masterhaPlugin(){
  return new MasterhaPlugin();
}


// 插件类
class MasterhaPlugin implements IPlugin {
    name = 'masterhaPlugin';
    components = [ZookeeperComponent];
}


class ZookeeperComponent extends EventEmitter implements IComponent {
  public name = 'zookeeper';
  public app: Application;
  public hosts: string;
  public path: string;
  public firstNode: string;
  public lockPath: string;
  public username: string;
  public password: string;
  public setACL: boolean;
  public nodePath: string;
  public version: number | undefined;
  public onDataSet: boolean;
  public authentication: string;
  public acls: zookeeper.ACL[];
  public client: zookeeper.Client;

  constructor(app: Application, opts: any) {
    super();
    this.app = app;
    this.hosts = opts.server || '127.0.0.1:2181';
    this.path = opts.path || DIR.MASTER_HA;
    this.lockPath = this.path + '/lock';
    this.username = opts.username || 'pinus';
    this.password = opts.password || 'pinus';
    this.setACL = opts.setACL;
    this.nodePath = this.lockPath + '/' + this.app.serverId + '-';
    this.version = undefined;
    this.onDataSet = false;
    this.authentication = this.username + ':' + this.password;
    const shaDigest = crypto.createHash('sha1').update(this.authentication).digest('base64');
    this.acls = [
      new zookeeper.ACL(
        zookeeper.Permission.ALL,
        new zookeeper.Id('digest', this.username + ':' + shaDigest)
      )
    ];

    this.client = zookeeper.createClient(this.hosts, { sessionTimeout: opts.timeout || 5000 });
    this.client.once('connected', () => {
      // 权限管理
      this.client.addAuthInfo('digest', Buffer.from(this.authentication));
      if (this.setACL) {
        this.client.setACL(this.path, this.acls, -1, (error: Error | unknown, stat: zookeeper.Stat) => {
          if (error) {
            logger.warn('Failed to set ACL: %s.', error);
            return;
          }
          logger.info('ACL is set to: %j', this.acls);
        });
      }
      watchNode(this.client, this.path, onMasterUpdate.bind(this));
    });
    this.client.connect();
  }


  start(cb: () => void) {
    if (this.app.serverType !== 'master') {
      logger.info('bind masterupdate event for %j', this.app.serverId);
      this.on('onMasterUpdate', this.reconnect.bind(this));
      invokeCallback(cb);
    } 
    else {
      createNode(this.client, this.lockPath, null, (err: Error | null, result: any) => {
        if (err) {
          logger.error('start firstNode zookeeper failed! err : %j', err);
          invokeCallback(cb, err);
          return;
        }
        this.getLock((err: Error | null, result: any) => {
          if (err || !result) {
            this.on('onPromote', this.onPromote.bind(this));
            invokeCallback(cb);
          } else {
            this.setData(this.app.getMaster(), (err: Error | null) => {
              if (err) {
                logger.error('set master info failed!');
                invokeCallback(cb);
                return;
              }
              invokeCallback(cb);
            });
          }
        });
      });
    }
  }

  stop(force: any, cb: () => void) {
    this.client.close();
    invokeCallback(cb);
  }

  /**
   * 所有服务器启动之后，开启master备用服务器 
   */
  afterStartAll(){
    if(this.app.serverType === 'master'){
      let configFile = path.join(this.app.getBase(), FILEPATH.MASTER_HA);
      if (!fs.existsSync(configFile)) {
        logger.error('masterha config file is not exist');
        return;
      }
      let masterha = require(configFile).masterha;
      for (let i = 0; i < masterha.length; i++) {
          let server = masterha[i];
          server.mode = RESERVED.STAND_ALONE;
          server.masterha = 'true';
          server.home = this.app.getBase()
          runServer(this.app, server);
      }
    }
  }


  setData(data: any, cb: (err: Error | null, result?: zookeeper.Stat) => void) {
    const buffer = Buffer.from(JSON.stringify(data));
    this.client.setData(this.path, buffer, (err: Error | unknown, result: zookeeper.Stat) => {
      if (err) {
        logger.warn('set Data error for server %j', this.app.serverId);
        invokeCallback(cb, err);
        return;
      }
      if (cb) {
        invokeCallback(cb, err, result);
      }
    });
  }

  getData(cb: (err: Error | null, data?: string) => void) {
    this.client.getData(this.path, (err: Error | unknown, data: Buffer) => {
      if (err) {
        logger.warn('get master info failed for server : %j!', this.app.serverId);
        invokeCallback(cb, err);
        return;
      }
      invokeCallback(cb, null, data.toString());
    });
  }

  getLock(cb: (err: Error | null, result?: any) => void) {
    if (this.version) {
      checkLock(this, cb);
    } else {
      this.client.create(this.nodePath, Buffer.from(this.app.serverId), CreateMode.EPHEMERAL_SEQUENTIAL, (err: Error | unknown, path: string) => {
        if (err) {
          logger.warn('getLock error! node path  %j, serverId : %j, err : %j', this.nodePath, this.app.serverId, err);
          invokeCallback(cb, err);
          return;
        }
        this.version = parseInt(path.substr(path.lastIndexOf('-') + 1), 10);
        checkLock(this, cb);
      });
    }
  }

  onPromote() {
    this.getLock((err: Error | null, result: any) => {
      if (result) {
        this.setData(this.app.getMaster(), (err: Error | null, result: any) => {
          if (err) {
            logger.error('setData failed, err: ' + err.stack);
          } else {
            logger.info('server host: %s, port: %s now is promoted to master!', this.app.master.host, this.app.master.port);
          }
        });
      }
    });
  }

  reconnect() {
    this.getData((err: Error | null, masterInfo: string | undefined) => {
      if (err || !masterInfo) {
        logger.error('get masterInfo failed, err ' + (err ? err.stack : 'unknown'));
        return;
      }
      const monitor = this.app.components.__monitor__;
      monitor?.reconnect(JSON.parse(masterInfo));
    });
  }
}


function checkLock(self: ZookeeperComponent, cb: Function): void {
    let client = self.client;
    let version = self.version;
    let lockPath = self.lockPath;
  
    client.getChildren(lockPath, function(err: Error | unknown, children: string[], stat: zookeeper.Stat) {
      if(err) {
        logger.warn('get children error for serverId %j!', this.app.serverId);
        invokeCallback(cb, err);
        return;
      }
  
      let data = getVersion(children);
      let versions = data.versions;
  
      if(version === versions[0]) {
        cb(null, true);
      } else {
        let node = getWatchNode(version, data);
        let nodePath = lockPath + '/' + node;
        if(node) {
          watchNode(client, nodePath, onNodeChange.bind(self));
          invokeCallback(cb, null, false);
          return;
        } else {
          cb(new Error('Can not find watch node!'));
        }
      }
    });
  }
  
  function getVersion(children: string[]): { versions: number[], map: { [key: number]: string } } {
    let versions: number[] = [];
    let map: { [key: number]: string } = {};
  
    for(let i = 0; i < children.length; i++) {
      let child = children[i];
      let version = parseInt(child.substr(child.lastIndexOf('-') + 1), 10);
  
      versions.push(version);
      map[version] = child;
    }
  
    //sort the version numbers
    versions.sort();
  
    return {
      versions: versions,
      map: map
    };
  }
  
  function getWatchNode(version: number | undefined, data: { versions: number[], map: { [key: number]: string } }): string | null {
    let versions = data.versions;
    let map = data.map;
  
    for(let i = 1; i < versions.length; i++) {
      if(version === versions[i]) {
        return map[versions[i-1]];
      }
    }
    return null;
  }
  
  function createNode(client: zookeeper.Client, path: string, value: any, cb: Function): void {
    if(typeof(value) === 'function') {
      cb = value;
      value = null;
    }
  
    client.exists(path, function(err: Error | unknown, stat: zookeeper.Stat) {
      if(err) {
        invokeCallback(cb, err);
        return;
      }
  
      //If node not exist, create the node
      if(!stat) {
        client.create(path, value, function(err: Error | unknown, result: any) {
          logger.info('create node result, path : %j, err : %j, result : %j', path, err, result);
          invokeCallback(cb, err, result);
          return;
        });
      } else {
        invokeCallback(cb);
        return;
      }
    });
  }
  
  function watchNode(client: zookeeper.Client, path: string, func: ( event: zookeeper.Event )=>void): void {
    client.exists(path, func, function(err: Error | unknown, stat: zookeeper.Stat) {
      if(err || !stat) {
        logger.warn('Watch path not exist! path: %j', path);
      }
    });
  }
  
  function onNodeChange(event: zookeeper.Event): void {
    if(event.type === Event.NODE_DELETED) {
      logger.info('promote master');
      this.emit('onPromote');
    }
  }
  
  function onMasterUpdate(event: zookeeper.Event): void {
    if(event.type === Event.NODE_DATA_CHANGED) {
      this.emit('onMasterUpdate');
    }

    if(event.type !== Event.NODE_DELETED) {
      watchNode(this.client, this.path, onMasterUpdate.bind(this));
    }
  }

/**
 * Run server.
 *
 * @param {Object} server server information
 */
function runServer(app: Application, server: any) {
  let cmd, key;
  let main = app.get(RESERVED.MAIN);
  if (isLocal(server.host)) {
      let options = [];
      options.push(main);
      for (key in server) {
          options.push(util.format('%s=%s', key, server[key]));
      }
      localrun(process.execPath, null, options);
  } else {
      cmd = util.format('cd "%s" && "%s"', server.home, process.execPath);
      cmd += util.format(' "%s" ', main);
      for (key in server) {
          cmd += util.format(' %s=%s ', key, server[key]);
      }
      sshrun(cmd, server.host);
  }
}