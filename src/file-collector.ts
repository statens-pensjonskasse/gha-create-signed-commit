import * as fs from 'node:fs';
import * as path from 'node:path';
import * as core from '@actions/core';
import { exec } from '@actions/exec';
import type { FileChange } from './types.js';

/**
 * Read file content and mode from the working directory
 * @param filePath The file path relative to working directory
 * @param workingDirectory The working directory
 * @returns Object with content and mode
 */
function readFileContent(filePath: string, workingDirectory: string): { content: string; mode: string } {
    const fullPath = path.join(workingDirectory, filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stats = fs.statSync(fullPath);

    // Convert file mode to Git format (100644 for regular, 100755 for executable)
    const isExecutable = (stats.mode & 0o111) !== 0;
    const mode = isExecutable ? '100755' : '100644';

    return { content, mode };
}

/**
 * Add files to git staging area
 * @param paths Optional list of paths to add
 * @param workingDirectory The working directory
 */
async function addFilesToGit(paths: string[] | undefined, workingDirectory: string): Promise<void> {
    const args = ['add', '--ignore-errors'];

    if (paths && paths.length > 0) {
        // Add specific paths
        args.push(...paths);
        core.debug(`Adding ${paths.length} path(s) to git staging area`);
    } else {
        return;
    }

    let errorOutput = '';
    let _stdOutput = '';
    const exitCode = await exec('git', args, {
        cwd: workingDirectory,
        listeners: {
            stdout: (data: Buffer) => {
                _stdOutput += data.toString();
            },
            stderr: (data: Buffer) => {
                errorOutput += data.toString();
            },
        },
        silent: true,
        ignoreReturnCode: true,
    });

    // Git add returns 128 when no files match pathspec
    // We only throw an error for other failures
    if (exitCode !== 0 && exitCode !== 128) {
        throw new Error(`Failed to add files to git: ${errorOutput}`);
    }

    // If files don't match, git may warn but still succeed with exit code 0 or 128
    if (exitCode === 128 && errorOutput.includes('did not match any files')) {
        core.warning(`No files matched the specified paths: ${paths?.join(', ')}`);
    } else if (exitCode === 128) {
        // For other 128 errors (like not a git repo), we should throw
        throw new Error(`Failed to add files to git: ${errorOutput}`);
    }
}

/**
 * Get staged files from git
 */
async function getStagedFiles(workingDirectory: string): Promise<string[]> {
    const files: string[] = [];
    let output = '';
    let errorOutput = '';

    const exitCode = await exec('git', ['diff', '--cached', '--name-only'], {
        cwd: workingDirectory,
        listeners: {
            stdout: (data: Buffer) => {
                output += data.toString();
            },
            stderr: (data: Buffer) => {
                errorOutput += data.toString();
            },
        },
        silent: true,
    });

    if (exitCode !== 0) {
        throw new Error(`Failed to get staged files: ${errorOutput}`);
    }

    const lines = output.split('\n').filter((line) => line.trim());
    files.push(...lines);

    return files;
}

/**
 * Collect all staged files after adding them
 */
async function collectStagedFiles(workingDirectory: string): Promise<FileChange[]> {
    core.debug('Collecting staged files');
    const stagedFiles = await getStagedFiles(workingDirectory);
    core.debug(`Collected ${stagedFiles.length} staged files`);

    const collectedFiles: FileChange[] = [];
    for (const filePath of stagedFiles) {
        const { content, mode } = readFileContent(filePath, workingDirectory);
        collectedFiles.push({ path: filePath, content, mode });
    }
    return collectedFiles;
}

/**
 * Collect files based on the input
 * @param paths Optional list of paths to collect (supports wildcards)
 * @param workingDirectory The working directory
 * @returns Array of file changes
 */
export async function collectFiles(paths: string[] | undefined, workingDirectory: string): Promise<FileChange[]> {
    // Add files to git staging area
    await addFilesToGit(paths, workingDirectory);

    // Collect the staged files
    return await collectStagedFiles(workingDirectory);
}
