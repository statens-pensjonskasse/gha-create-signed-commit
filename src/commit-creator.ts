import * as core from '@actions/core';
import { createBlobsInBatches } from './blob-creator.js';
import { collectFiles } from './file-collector.js';
import { createGitHubClient, parseRepository } from './github-client.js';
import type { ActionInputs, CommitResult } from './types.js';
import { calculateTotalSize, validateFileSize } from './validation.js';

/**
 * Create a signed commit using the GitHub API
 * @param inputs The action inputs
 * @returns The commit and tree SHA
 */
export async function createSignedCommit(inputs: ActionInputs): Promise<CommitResult> {
    const octokit = createGitHubClient(inputs.token);
    const { owner, repo } = parseRepository(inputs.repository);

    core.startGroup('Creating signed commit');
    core.info(`Repository: ${inputs.repository}`);
    core.info(`Branch: ${inputs.branch}`);
    core.info(`Message: ${inputs.message}`);
    core.info(`Working directory: ${inputs.workingDirectory}`);

    // Collect files based on input mode
    const files = await collectFiles(inputs.paths, inputs.workingDirectory);
    core.info(`Files to commit: ${files.length}`);

    // Validate file sizes and warn if needed
    for (const file of files) {
        const warning = validateFileSize(file.path, file.content);
        if (warning) {
            core.warning(warning);
        }
    }

    // Log total commit size
    const totalSizeMB = calculateTotalSize(files);
    core.info(`Total commit size: ${totalSizeMB.toFixed(2)}MB`);

    if (totalSizeMB > 100) {
        core.warning(
            `Commit size (${totalSizeMB.toFixed(2)}MB) exceeds recommended limit of 100MB. ` +
                'This may cause performance issues. Consider splitting into multiple commits.',
        );
    }

    // Handle no changes
    if (files.length === 0) {
        if (inputs.failOnNoChanges) {
            core.endGroup();
            throw new Error('No files to commit and fail-on-no-changes is true');
        }
        core.warning('No files to commit, skipping commit creation');
        core.endGroup();
        return { commitSha: '', treeSha: '' };
    }

    try {
        // Get the parent commit SHA - either specified or from branch HEAD
        let currentCommitSha: string;
        if (inputs.parentCommit) {
            core.info(`Using specified parent commit: ${inputs.parentCommit}`);
            currentCommitSha = inputs.parentCommit;
        } else {
            core.info(`Fetching reference for branch: ${inputs.branch}`);
            const refResponse = await octokit.rest.git.getRef({
                owner,
                repo,
                ref: `heads/${inputs.branch}`,
            });
            currentCommitSha = refResponse.data.object.sha;
            core.info(`Current commit SHA: ${currentCommitSha}`);
        }

        // Get the current commit to retrieve its tree
        core.info('Fetching current commit details');
        const commitResponse = await octokit.rest.git.getCommit({
            owner,
            repo,
            commit_sha: currentCommitSha,
        });
        const baseTreeSha = commitResponse.data.tree.sha;
        core.info(`Base tree SHA: ${baseTreeSha}`);

        // Create blobs for each file in batches
        const treeItems = await createBlobsInBatches(files, octokit, owner, repo);

        // Create a new tree
        core.info('Creating new tree');
        const treeResponse = await octokit.rest.git.createTree({
            owner,
            repo,
            base_tree: baseTreeSha,
            tree: treeItems,
        });
        const newTreeSha = treeResponse.data.sha;
        core.info(`New tree SHA: ${newTreeSha}`);

        // Create the commit
        core.info('Creating commit');
        const commitData = await octokit.rest.git.createCommit({
            owner,
            repo,
            message: inputs.message,
            tree: newTreeSha,
            parents: [currentCommitSha],
        });
        const newCommitSha = commitData.data.sha;
        core.info(`Commit created: ${newCommitSha}`);
        core.info(`Verification status: ${commitData.data.verification?.verified ? 'verified' : 'unverified'}`);

        core.endGroup();

        return {
            commitSha: newCommitSha,
            treeSha: newTreeSha,
        };
    } catch (error) {
        core.endGroup();
        throw error;
    }
}
