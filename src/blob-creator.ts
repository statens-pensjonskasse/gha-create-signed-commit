import * as core from '@actions/core';
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
export async function createBlobsInBatches(
    files: FileChange[],
    octokit: Octokit,
    owner: string,
    repo: string,
    batchSize = 10,
): Promise<TreeItem[]> {
    const treeItems: TreeItem[] = [];
    const totalFiles = files.length;

    core.debug(`Creating ${totalFiles} blob(s) in batches of ${batchSize}`);

    for (let i = 0; i < totalFiles; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(totalFiles / batchSize);

        core.debug(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} file(s))`);

        const batchResults = await Promise.all(
            batch.map(async (file) => {
                core.debug(`Creating blob for: ${file.path} (mode: ${file.mode})`);
                const blobResponse = await octokit.rest.git.createBlob({
                    owner,
                    repo,
                    content: file.content,
                    encoding: 'utf-8',
                });
                core.debug(`Blob created: ${blobResponse.data.sha}`);
                return {
                    path: file.path,
                    mode: file.mode as '100644' | '100755',
                    type: 'blob' as const,
                    sha: blobResponse.data.sha,
                };
            }),
        );

        treeItems.push(...batchResults);
    }

    core.debug(`✓ Successfully created ${treeItems.length} blob(s)`);
    return treeItems;
}
