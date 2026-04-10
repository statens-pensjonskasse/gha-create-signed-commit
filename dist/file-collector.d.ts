import type { FileChange } from './types.js';
/**
 * Collect files based on the input
 * @param paths Optional list of paths to collect (supports wildcards)
 * @param workingDirectory The working directory
 * @returns Array of file changes
 */
export declare function collectFiles(paths: string[] | undefined, workingDirectory: string): Promise<FileChange[]>;
