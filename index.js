import * as core from '@actions/core'
import * as github from '@actions/github'

const employees = {
  'adv-bet': 'ADV',
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

  const {data: pull} = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
  });
  // core.debug(pull.requested_reviewers);
  // core.debug(pull.requested_teams);
  //
  //
  // const {data: requestedReviewers} = await octokit.rest.pulls.listRequestedReviewers({
  //   ...context.repo,
  //   pull_number: context.payload.pull_request.number,
  // })
  // core.debug(requestedReviewers);

  const {data: reviews} = await octokit.rest.pulls.listReviews({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
    per_page: 100,
  });

  let latestReviews = reviews
    .reverse()
    .filter(review => review.state.toLowerCase() !== 'commented')
    .filter((review, index, array) => {
      // https://dev.to/kannndev/filter-an-array-for-unique-values-in-javascript-1ion
      return array.findIndex(x => review.user?.id === x.user?.id) === index
    });

  let approveByBody = '';
  let pullBody = pull.body;
  let approveByIndex = pullBody.search(/Approved-by/);
  let updatePR = false;

  latestReviews.forEach(review => {
    core.debug(`${review.user?.login} is ${review.state.toLowerCase()}.`)

    if (review.state.toLowerCase() === 'approved') {
      const login = review.user?.login;
      if (login in employees) {
        approveByBody += `\nApproved-by: ${employees[login]} (${login})`
      } else {
        approveByBody += `\nApproved-by: ${login}`
      }
    }
  });

  // body with "Approved-by" already set
  if (approveByIndex > -1) {
    pullBody = pullBody.replace('/\nApproved-by\:.*/', approveByBody);
    updatePR = true;
  }

  // body without "Approved-by"
  if (approveByBody.length > 0 && approveByIndex === -1) {
    pullBody += `\n${approveByBody}`;
    updatePR = true;
  }

  if (updatePR) {
    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: pullBody,
    });
  }

  // if (pull.requested_reviewers.length !== requestedReviewers.users.length) {
  //   const requestedReviews = pull.requested_reviewers.map(user => {
  //     return user.login;
  //   });
  //
  //   const notApproved = requestedReviewers.users.map(user => {
  //     return user.login;
  //   });
  //
  //   const approved = requestedReviews.filter(login => {
  //     return !notApproved.includes(login);
  //   });
  //
  //   let text = '';
  //   approved.forEach(login => {
  //     if (login in employees) {
  //       text += `\nApproved-by: ${employees[login]} (${login})`
  //     } else {
  //       text += `\nApproved-by: ${login}`
  //     }
  //   });
  //
  //   core.debug(text)
  // }

  // const {data: reviews} = await octokit.rest.pulls.listReviews({
  //   ...context.repo,
  //   pull_number: context.payload.pull_request.number,
  //   per_page: 100,
  // });
  // core.debug(reviews);

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
