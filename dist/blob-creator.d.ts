import type * as github from '@actions/github';
import type { FileChange } from './types.js';
type Octokit = ReturnType<typeof github.getOctokit>;
/**
 * Tree item for GitHub API
 */
interface TreeItem {
    path: string;
    mode: '100644' | '100755';
    type: 'blob';
    sha: string;
}
/**
 * Create blobs in batches to avoid overwhelming the API
 * @param files Array of file changes to create blobs for
 * @param octokit GitHub API client
 * @param owner Repository owner
 * @param repo Repository name
 * @param batchSize Number of blobs to create concurrently (default: 10)
 * @returns Array of tree items
 */
export declare function createBlobsInBatches(files: FileChange[], octokit: Octokit, owner: string, repo: string, batchSize?: number): Promise<TreeItem[]>;
export {};
