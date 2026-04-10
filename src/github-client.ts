import * as github from '@actions/github';
import { RepositoryValidationError } from './errors.js';
import type { RepositoryInfo } from './types.js';

/**
 * Parse repository string into owner and repo
 * @param repository Repository in format owner/repo
 * @returns Object with owner and repo
 * @throws {RepositoryValidationError} If repository format is invalid
 */
export function parseRepository(repository: string): RepositoryInfo {
    const [owner, repo] = repository.split('/');

    if (!owner || !repo) {
        throw new RepositoryValidationError(repository);
    }

    return { owner, repo };
}

/**
 * Create a GitHub client
 * @param token GitHub token for authentication
 * @returns Octokit instance
 */
export function createGitHubClient(token: string) {
    return github.getOctokit(token);
}
