
import * as fs from 'fs';
import * as path from 'path';
import { connectToMaster, hotfix } from '../utils/utils';
import { DEFAULT_USERNAME, DEFAULT_PWD, DEFAULT_MASTER_HOST, DEFAULT_MASTER_PORT, DEFAULT_HOTFIX_DIR} from '../utils/constants';
import { Command } from 'commander';

/*
** 热更新代码，通过pinus 命令启动热更新
** 暂时先写服务端，后面有需要再写客户端
** pinus hotfix 就默认更新所有的进程
** 支持按照服务器类型进行更新
** 如果不传文件名就默认热更新整个文件夹
** 传文件名就更新单个文件
** 传入的directory 是相对于根目录下的内容参数，以获取热更新时候的位置
*/

export default function (program: Command) {
    program.command('hotfix')
    .description('hotfix the servers, for multiple servers, use `pinus hotfix auth connector`')
    .option('-u, --username <username>', 'administration user name', DEFAULT_USERNAME)
    .option('-p, --password <password>', 'administration password', DEFAULT_PWD)
    .option('-h, --host <master-host>', 'master server host', DEFAULT_MASTER_HOST)
    .option('-P, --port <master-port>', 'master server port', (value)=>parseInt(value), DEFAULT_MASTER_PORT)
    .option('-d, --directory, <directory>', 'the hotfix code file or directory', DEFAULT_HOTFIX_DIR)
    .action(function () {
        let args = [].slice.call(arguments, 0);
        let opts = args[args.length - 1];
        opts.serverTypes = args.slice(0, -1);
        opts.filePath = opts.directory;
        hotfix('hotfix', opts);
    });
}