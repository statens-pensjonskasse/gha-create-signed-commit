import * as core from '@actions/core';
import { createSignedCommit } from './commit-creator';
import { fetchCommit } from './git-operations';
import { getActionInputs } from './input-parser';
import { validateInputs } from './validation';

export async function run(): Promise<void> {
    try {
        const inputs = getActionInputs();

        // Validate inputs before processing
        validateInputs(inputs);

        const result = await createSignedCommit(inputs);

        core.setOutput('commit-sha', result.commitSha);
        core.setOutput('tree-sha', result.treeSha);

        core.info(`✓ Successfully created commit: ${result.commitSha}`);
        core.debug('Note: Commit has been created but not pushed. Use git push or update the ref to push it.');

        // Fetch the commit details via API if requested and a commit was created
        if (inputs.fetchCommit && result.commitSha) {
            await fetchCommit(result.commitSha, inputs.token, inputs.repository);
        }
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed('An unexpected error occurred');
        }
    }
}

