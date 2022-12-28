import * as core from '@actions/core'
import * as github from '@actions/github'

const employees = {
  'aponad': 'Anton P.',
  'eeedvisss': 'Edvinas B.'
}

const run = async () => {
  const token = core.getInput('GITHUB_TOKEN', { required: true });
  core.info('github token: ' + token);

  if (!token) {
    throw new Error('No GITHUB_TOKEN found in input');
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  // core.info(octokit);
  // core.info(octokit.pulls);

  const reviews = await octokit.rest.pulls.listReviews({
    ...context.repo,
    pull_number: context.payload.pull_request.number
  });


  const approvedReviews = reviews.filter(review => review.state.toLowerCase() !== 'approved')

  if (approvedReviews.length > 0) {
    let text = '';
    approvedReviews.forEach(review => {
      const login = review.user.login;
      if (login in employees) {
        text += `Approved-by: ${employees[login]} (${login})\n`
      } else {
        text += `Approved-by: ${login}\n`
      }
    })
    core.info(text);
  }
};

run()
  .then(() => {
    core.info('Done.');
  })
  .catch((e) => {
    core.error(e.message);
  });
