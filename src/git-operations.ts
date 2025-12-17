import * as core from '@actions/core';
import { createGitHubClient, parseRepository } from './github-client';

/**
 * Fetch a specific commit from the remote repository using the GitHub API
 * @param commitSha The commit SHA to fetch
 * @param token The GitHub token for API authentication
 * @param repository The repository in owner/repo format
 */
export async function fetchCommit(commitSha: string, token: string, repository: string): Promise<void> {
    core.debug(`Fetching commit ${commitSha} from remote via GitHub API`);

    const { owner, repo } = parseRepository(repository);

    try {
        const octokit = createGitHubClient(token);

        // Fetch the commit details from the GitHub API
        const commitResponse = await octokit.rest.git.getCommit({
            owner,
            repo,
            commit_sha: commitSha,
        });

        core.info(`✓ Successfully fetched commit ${commitSha}`);
        core.debug(`  Author: ${commitResponse.data.author.name}`);
        core.debug(`  Message: ${commitResponse.data.message}`);
        core.debug(`  Tree SHA: ${commitResponse.data.tree.sha}`);
        core.debug(`  Verification: ${commitResponse.data.verification?.verified ? 'verified' : 'unverified'}`);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch commit ${commitSha}: ${error.message}`);
        }
        throw new Error(`Failed to fetch commit ${commitSha}: Unknown error`);
    }
}
