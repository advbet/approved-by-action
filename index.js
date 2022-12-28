import * as core from '@actions/core'
import * as github from '@actions/github'

const run = async () => {
  const token = core.getInput('github-token', { required: false }) || process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('No GITHUB_TOKEN found');
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  const reviews = await octokit.pulls.listReviews({
    ...context.repo,
    pull_number: context.payload.pull_request.number
  });

  core.info(reviews);
};

run()
  .then(() => {
    core.info('Done.');
  })
  .catch((e) => {
    core.error(e.message);
  });
