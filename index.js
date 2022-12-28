import * as core from '@actions/core'
import * as github from '@actions/github'

const employees = {
  'aponad': 'Anton P.',
  'eeedvisss': 'Edvinas B.'
}

const run = async () => {
  const token = core.getInput('GITHUB_TOKEN', { required: true });

  if (!token) {
    throw new Error('No GITHUB_TOKEN found in input');
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  const {users: requestedUsers, teams: requestedTeams} = await octokit.rest.pulls.requestReviewers({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
  });
  core.debug(requestedUsers);
  core.debug(requestedTeams);

  const {data: reviews} = await octokit.rest.pulls.listReviews({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
    per_page: 100,
  });
  core.debug(reviews);

  // core.debug(reviews);
  // core.debug(`reviews length: ${reviews.length}`);
  //
  // let latestReviews = reviews
  //   .reverse()
  //   .filter(review => review.user?.id !== context.payload.pull_request.user.id)
  //   .filter(review => review.state.toLowerCase() !== 'commented')
  //   .filter((review, index, array) => {
  //     // unique
  //     return array.findIndex(x => review.user?.id === x.user?.id) === index
  //   })
  //
  //
  //
  // const approvedReviews = reviews.filter(review => review.state.toLowerCase() !== 'approved')
  //
  // if (approvedReviews.length > 0) {
  //   let text = '';
  //   approvedReviews.forEach(review => {
  //     const login = review.user.login;
  //     if (login in employees) {
  //       text += `\nApproved-by: ${employees[login]} (${login})`
  //     } else {
  //       text += `\nApproved-by: ${login}`
  //     }
  //   })
  //   core.debug(text);
  // }
};

run()
  .then(() => {
    core.info('Done.');
  })
  .catch((e) => {
    core.error(e.message);
  });
