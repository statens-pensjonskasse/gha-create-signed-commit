import type { RepositoryInfo } from './types.js';
/**
 * Parse repository string into owner and repo
 * @param repository Repository in format owner/repo
 * @returns Object with owner and repo
 * @throws {RepositoryValidationError} If repository format is invalid
 */
export declare function parseRepository(repository: string): RepositoryInfo;
/**
 * Create a GitHub client
 * @param token GitHub token for authentication
 * @returns Octokit instance
 */
export declare function createGitHubClient(token: string): import("@octokit/core").Octokit & import("@octokit/plugin-rest-endpoint-methods").Api & {
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
};
