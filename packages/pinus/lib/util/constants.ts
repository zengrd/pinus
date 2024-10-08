import { RemoteServerCode } from '../index';


export enum KEYWORDS {
    BEFORE_FILTER= '__befores__',
    AFTER_FILTER= '__afters__',
    GLOBAL_BEFORE_FILTER= '__globalBefores__',
    GLOBAL_AFTER_FILTER= '__globalAfters__',
    ROUTE= '__routes__',
    BEFORE_STOP_HOOK= '__beforeStopHook__',
    MODULE= '__modules__',
    SERVER_MAP= '__serverMap__',
    RPC_BEFORE_FILTER= '__rpcBefores__',
    RPC_AFTER_FILTER= '__rpcAfters__',
    MASTER_WATCHER= '__masterwatcher__',
    MONITOR_WATCHER= '__monitorwatcher__'
}

export enum FILEPATH  {
    MASTER = '../config/master.json',
    SERVER = '../config/servers.json',
    CRON = '../config/crons.json',
    LOG = '../config/log4js.json',
    SERVER_PROTOS = '../config/serverProtos.json',
    CLIENT_PROTOS = '../config/clientProtos.json',
    MASTER_HA = '../config/masterha.json',
    LIFECYCLE = '/lifecycle.js',
    SERVER_DIR = '/app/servers/',
    CONFIG_DIR = '../config',
}

export enum DIR  {
    REMOTE = 'remote', // app下或者plguin下rpc 目录
    CRON = 'cron',   // app或者plugin下定时器脚本目录
    EVENT = 'events',
    COMPONENT = 'components',
    HANDLER = 'handler',
    LOG = '../logs', // pkg 打包后外置logs目录
    SCRIPT = '../scripts', // pkg打包后外置脚本目录
    PROFILE = '../profiles', // v8-profiler-next 生成profile文件的路径
    MASTER_HA = '/pinus/masterha', // master 高可用信息存储目录(相对路径)
}

export enum RESERVED  {
    BASE = 'base',
    PKG_BASE = 'pkg_base',
    MAIN = 'main',
    MASTER = 'master',
    SERVERS = 'servers',
    ENV = 'env',
    CPU = 'cpu',
    ENV_DEV = 'development',
    ENV_PRO = 'production',
    ALL = 'all',
    SERVER_TYPE = 'serverType',
    SERVER_ID = 'serverId',
    CURRENT_SERVER = 'curServer',
    MODE = 'mode',
    TYPE = 'type',
    REMOTE_LOGGER = 'remoteLogger',
    CLUSTER = 'clusters',
    STAND_ALONE = 'stand-alone',
    BEFORE_START = 'beforeStart',
    START = 'start',
    AFTER_START = 'afterStart',
    AFTER_STARTALL = 'afterStartAll',
    CRONS = 'crons',
    ERROR_HANDLER = 'errorHandler',
    GLOBAL_ERROR_HANDLER = 'globalErrorHandler',
    AUTO_RESTART = 'auto-restart',
    RESTART_FORCE = 'restart-force',
    CLUSTER_COUNT = 'clusterCount',
    CLUSTER_PREFIX = 'cluster-server-',
    CLUSTER_SIGNAL = '++',
    RPC_ERROR_HANDLER = 'rpcErrorHandler',
    SERVER = 'server',
    CLIENT = 'client',
    STARTID = 'startId',
    STOP_SERVERS = 'stop_servers',
    SSH_CONFIG_PARAMS = 'ssh_config_params'
}

export enum COMMAND  {
    TASKSET = 'taskset',
    KILL = 'kill',
    TASKKILL = 'taskkill',
    SSH = 'ssh'
}

export enum PLATFORM  {
    WIN = 'win32',
    LINUX = 'linux'
}

export enum LIFECYCLE  {
    BEFORE_STARTUP = 'beforeStartup',
    BEFORE_SHUTDOWN = 'beforeShutdown',
    AFTER_STARTUP = 'afterStartup',
    AFTER_STARTALL = 'afterStartAll'
}

export enum SIGNAL  {
    FAIL = 0,
    OK = 1
}

export enum TIME  {
    TIME_WAIT_STOP = 3 * 1000,
    TIME_WAIT_KILL = 5 * 1000,
    TIME_WAIT_RESTART = 5 * 1000,
    TIME_WAIT_COUNTDOWN = 10 * 1000,
    TIME_WAIT_MASTER_KILL = 2 * 60 * 1000,
    TIME_WAIT_MONITOR_KILL = 2 * 1000,
    TIME_WAIT_PING = 30 * 1000,
    TIME_WAIT_MAX_PING = 5 * 60 * 1000,
    DEFAULT_UDP_HEARTBEAT_TIME = 20 * 1000,
    DEFAULT_UDP_HEARTBEAT_TIMEOUT = 100 * 1000,
    DEFAULT_MQTT_HEARTBEAT_TIMEOUT = 90 * 1000
}

export interface RouteRecord {
    route: string;
    serverType: string;
    handler: string;
    method: string;
}

export type UID = string;
export type SID = number;
export type FRONTENDID = string;

/**
 * ServerInfo
 */
export interface ServerInfo {
    id: string;
    serverType: string;
    host: string;
    port: number;
    clientHost?: string;
    clientPort?: number;
    frontend ?: boolean;

    args ?: string | string[];
    cpu ?: number;

    ['max-connections'] ?: number;
    ['auto-restart'] ?: boolean;
    ['restart-force'] ?: boolean;
    ['clusterCount'] ?: number;

    handlerPaths ?: string[];
    remoterPaths ?: RemoteServerCode[];
    // 进程id  number
    pid?: any;
    // 进程启动时的 env 参数
    env?: string;
}
