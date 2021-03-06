import * as path from 'path';
import * as glob from 'glob';
import { injectable, inject } from "inversify";
import { CodeGenServer } from "../common/generate-protocol";
import { RawProcess, RawProcessFactory } from '@theia/process/lib/node/raw-process';

@injectable()
export class CoffeeCodeGenServer implements CodeGenServer {
    constructor(@inject(RawProcessFactory)
    protected readonly processFactory: RawProcessFactory){}
    generateCode(sourceFile: string, targetFolder: string, packageName: string):Promise<string> {
        
        const serverPath = path.resolve(__dirname, '..', '..', 'server');
        const jarPaths = glob.sync('**/plugins/org.eclipse.equinox.launcher_*.jar', { cwd: serverPath });
        if (jarPaths.length === 0) {
            throw new Error('The Java server launcher is not found.');
        }

        const jarPath = path.resolve(serverPath, jarPaths[0]);

        const command = 'java';
        const args: string[] = [];

        args.push(
            '-jar', jarPath,
            '-targetFolder',targetFolder,
            '-source',sourceFile,
            '-packageName',packageName
        );
        
        return new Promise((resolve) => {
            const process = this.spawnProcess(command, args);
            process.process.on('exit', (code)=> {
                switch(code){
                    case 0: resolve('OK');break;
                    case -10:resolve('Target Folder Parameter missing');
                    case -11:resolve('Source File Parameter missing');
                    case -12:resolve('Package Name Parameter missing');
                    case -20:resolve('Encoding not found, check Server Log!');
                    case -30:resolve('IO Exception occurred, check Server Log!');
                    default:resolve('UNKNOWN ERROR');break;
                }
            });   
        });
    } 
    dispose(): void {
        //do nothing
    }
    setClient(): void {
        //do nothing
    }

    private spawnProcess(command: string, args?: string[]): RawProcess {
        const rawProcess = this.processFactory({ command, args });
        rawProcess.process.once('error', this.onDidFailSpawnProcess.bind(this));
        const stderr = rawProcess.process.stderr;
        if(stderr)
            stderr.on('data', this.logError.bind(this));
        return rawProcess;
    }
    protected onDidFailSpawnProcess(error: Error): void {
        console.error(error);
    }

    protected logError(data: string | Buffer) {
        if (data) {
            console.error(`Code Gen: ${data}`);
        }
    }

}