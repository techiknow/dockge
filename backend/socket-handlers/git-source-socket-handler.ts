import { SocketHandler } from "../socket-handler";
import { DockgeServer } from "../dockge-server";
import { DockgeSocket, checkLogin } from "../util-server";
import { log } from "../log";
import { R } from "redbean-node";
import childProcessAsync from "promisify-child-process";
import fs from "fs";
import path from "path";
import { getComposeTerminalName } from "../../common/util-common";
import { Terminal } from "../terminal";

export class GitSourceSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        socket.on("addGitSource", async (url: string, stackName: string, branch: string, callback: Function) => {
            try {
                checkLogin(socket);

                const stacksDir = server.stacksDir;
                const stackPath = path.join(stacksDir, stackName);

                if (fs.existsSync(stackPath)) {
                    throw new Error(`Stack directory already exists: ${stackName}. Please provide a different Stack Name.`);
                }

                log.info("git", `Cloning ${url} ${branch ? 'branch ' + branch : 'default branch'} to ${stackPath}`);

                const gitArgs = ["clone", "--progress"];
                if (branch) {
                    gitArgs.push("-b", branch);
                }
                gitArgs.push(url, stackPath);
                
                const { spawn } = await import("child_process");
                const child = spawn("git", gitArgs);

                let stderrOutput = "";
                if (child.stderr) {
                    child.stderr.on("data", (data: Buffer) => {
                        const str = data.toString();
                        stderrOutput += str;
                        // Limit stderr to last 500KB to prevent memory leak
                        if (stderrOutput.length > 500 * 1024) {
                            stderrOutput = stderrOutput.slice(-500 * 1024);
                        }
                        socket.emit("gitCloneProgress", str);
                    });
                }

                await new Promise<void>((resolve, reject) => {
                    child.on("close", (code: number) => {
                        if (code === 0) resolve();
                        else {
                            const err: any = new Error(`git clone failed with exit code ${code}`);
                            err.stderr = stderrOutput;
                            reject(err);
                        }
                    });
                    child.on("error", reject);
                });

                let actualBranch = branch;
                if (!actualBranch) {
                    const resBranch = await childProcessAsync.spawn("git", ["branch", "--show-current"], {
                        cwd: stackPath,
                        encoding: "utf-8",
                    });
                    actualBranch = (resBranch.stdout || "").toString().trim() || "main";
                }

                let gitSource = await R.findOne("git_source", " stack_name = ? ", [stackName]);
                if (!gitSource) {
                    gitSource = R.dispense("git_source");
                    gitSource.stack_name = stackName;
                }
                gitSource.url = url;
                gitSource.branch = actualBranch;
                await R.store(gitSource);

                server.sendStackList();

                callback({ ok: true });
            } catch (e: any) {
                let stderr = e.stderr ? `\n${e.stderr.toString()}` : "";
                let msg = `${e.message}${stderr}`;

                if (stderr.includes("not found in upstream origin") || stderr.includes("Remote branch") || stderr.includes("Could not find remote branch")) {
                    msg = `Branch not found. Please chek and update the branch name. \n${stderr}`;
                }

                log.error("git", `Failed to add git source: ${msg}`);
                callback({ ok: false, msg: msg });
            }
        });

        socket.on("deleteGitSource", async (stackName: string, callback: Function) => {
            try {
                checkLogin(socket);
                await R.exec("DELETE FROM git_source WHERE stack_name = ?", [stackName]);
                callback({ ok: true });
            } catch (e: any) {
                log.error("git", `Failed to delete git source: ${e.message}`);
                callback({ ok: false, msg: e.message });
            }
        });

        socket.on("fetchGitSourceStatus", async (stackName: string, callback: Function) => {
            try {
                checkLogin(socket);
                const stacksDir = server.stacksDir;
                const stackPath = path.join(stacksDir, stackName);

                if (!fs.existsSync(stackPath)) {
                    throw new Error("Stack directory does not exist.");
                }

                const terminalName = getComposeTerminalName(socket.endpoint, stackName);

                // Fetch latest from remote
                const fetchExitCode = await Terminal.exec(server, socket, terminalName, "git", ["remote", "update"], stackPath);
                if (fetchExitCode !== 0) {
                    throw new Error("Failed to fetch from remote, please check the terminal output for more information.");
                }

                // Check status
                const statusRes = await Terminal.execWithOutput(server, socket, terminalName, "git", ["status", "-uno"], stackPath);
                if (statusRes.exitCode !== 0) {
                    throw new Error("Failed to check git status, please check the terminal output for more information.");
                }

                const output = statusRes.output;
                const isBehind = output.includes("Your branch is behind");

                let statusMessage = "Branch is up to date.";
                if (isBehind) {
                    const lines = output.split(/\r?\n/);
                    const behindLine = lines.find((line: string) => line.includes("Your branch is behind"));
                    if (behindLine) {
                        statusMessage = behindLine.trim();
                    } else {
                        statusMessage = "Update available! Branch is behind remote.";
                    }
                }

                callback({ ok: true, isBehind, statusMessage });
            } catch (e: any) {
                const msg = e instanceof Error ? e.message : String(e);
                const stderr = e?.stderr ? `\n${e.stderr.toString()}` : "";
                log.error("git", `Failed to fetch git source status: ${msg}${stderr}`);
                callback({ ok: false, msg: `${msg}${stderr}` });
            }
        });

        socket.on("pullGitSource", async (stackName: string, callback: Function) => {
            try {
                checkLogin(socket);
                const stacksDir = server.stacksDir;
                const stackPath = path.join(stacksDir, stackName);

                if (!fs.existsSync(stackPath)) {
                    throw new Error("Stack directory does not exist.");
                }

                const terminalName = getComposeTerminalName(socket.endpoint, stackName);
                const res = await Terminal.execWithOutput(server, socket, terminalName, "git", ["pull"], stackPath);
                if (res.exitCode !== 0) {
                    throw new Error("Failed to pull latest changes, please check the terminal output for more information.");
                }

                const output = res.output.trim();

                callback({ ok: true, output });
            } catch (e: any) {
                const msg = e instanceof Error ? e.message : String(e);
                const stderr = e?.stderr ? `\n${e.stderr.toString()}` : "";
                log.error("git", `Failed to pull git source: ${msg}${stderr}`);
                callback({ ok: false, msg: `${msg}${stderr}` });
            }
        });

        socket.on("getGitSources", async (callback: Function) => {
            try {
                checkLogin(socket);
                const sources = await R.findAll("git_source");
                callback({ ok: true, sources });
            } catch (e: any) {
                callback({ ok: false, msg: e.message });
            }
        });

        socket.on("getGitSourceDetails", async (stackName: string, callback: Function) => {
            try {
                checkLogin(socket);
                let url = "";
                let branch = "";
                const stacksDir = server.stacksDir;
                const stackPath = path.join(stacksDir, stackName);

                if (!fs.existsSync(stackPath)) {
                    throw new Error("Stack directory does not exist.");
                }

                let gitSource = await R.findOne("git_source", " stack_name = ? ", [stackName]);
                if (gitSource) {
                    url = gitSource.url;
                    branch = gitSource.branch;
                }

                try {
                    if (!url) {
                        const resUrl = await childProcessAsync.spawn("git", ["remote", "get-url", "origin"], {
                            cwd: stackPath,
                            encoding: "utf-8",
                        });
                        url = (resUrl.stdout || "").toString().trim();
                    }

                    const resBranch = await childProcessAsync.spawn("git", ["branch", "--show-current"], {
                        cwd: stackPath,
                        encoding: "utf-8",
                    });
                    const fsBranch = (resBranch.stdout || "").toString().trim();
                    
                    if (fsBranch) {
                        branch = fsBranch;
                        // Auto-correct the database if it was out of sync (e.g., due to the previous 'main' bug)
                        if (gitSource && gitSource.branch !== branch) {
                            gitSource.branch = branch;
                            await R.store(gitSource);
                        }
                    }
                } catch (e) {
                    // ignore error if git commands fail
                }

                callback({ ok: true, url, branch });
            } catch (e: any) {
                const stderr = e.stderr ? `\n${e.stderr.toString()}` : "";
                callback({ ok: false, msg: `${e.message}${stderr}` });
            }
        });
    }
}
