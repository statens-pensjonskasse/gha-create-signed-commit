export interface FileChange {
    path: string;
    content: string;
    mode: string;
}

export interface ActionInputs {
    token: string;
    repository: string;
    branch: string;
    message: string;
    workingDirectory: string;
    failOnNoChanges: boolean;
    paths?: string[];
    fetchCommit: boolean;
}

export interface CommitResult {
    commitSha: string;
    treeSha: string;
}

export interface RepositoryInfo {
    owner: string;
    repo: string;
}

