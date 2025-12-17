/**
 * Fetch a specific commit from the remote repository using the GitHub API
 * @param commitSha The commit SHA to fetch
 * @param token The GitHub token for API authentication
 * @param repository The repository in owner/repo format
 */
export declare function fetchCommit(commitSha: string, token: string, repository: string): Promise<void>;
