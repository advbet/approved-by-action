import * as core from '@actions/core'
import * as github from '@actions/github'

const run = async () => {
  const token = core.getInput('GITHUB_TOKEN', { required: true })

  if (!token) {
    throw new Error('No GITHUB_TOKEN found in input')
  }

  const octokit = github.getOctokit(token)
  const context = github.context

  const { data: pull } = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: context.payload.pull_request.number
  })

  const { data: reviews } = await octokit.rest.pulls.listReviews({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
    per_page: 100
  })

  const latestReviews = reviews
    .reverse()
    .filter(review => review.state.toLowerCase() !== 'commented')
    .filter((review, index, array) => {
      // https://dev.to/kannndev/filter-an-array-for-unique-values-in-javascript-1ion
      return array.findIndex(x => review.user?.id === x.user?.id) === index
    })

  let updatePR = false
  let approveByBody = ''
  let pullBody = pull.body || ''
  const approveByIndex = pullBody.search(/Approved-by/)

  for (const review of latestReviews) {
    core.debug(`Latest ${review.user?.login} review '${review.state.toLowerCase()}'`)

    if (review.state.toLowerCase() === 'approved') {
      const login = review.user?.login
      const { data: user } = await octokit.rest.users.getByUsername({ username: login })
      core.debug(`${login} name is '${user?.name}'`)

      if (user?.name?.length > 0) {
        approveByBody += `\nApproved-by: ${login} (${user.name})`
      } else {
        approveByBody += `\nApproved-by: ${login}`
      }
    }
  }

  // body with "Approved-by" already set
  if (approveByIndex > -1) {
    pullBody = pullBody.replace(/\nApproved-by:.*/s, approveByBody)
    updatePR = true
  }

  // body without "Approved-by"
  if (approveByBody.length > 0 && approveByIndex === -1) {
    pullBody += `\n${approveByBody}`
    updatePR = true
  }

  core.debug(`updatePR: ${updatePR}`)
  core.debug(`approveByIndex: ${approveByIndex}`)
  core.debug(`approveByBody length: ${approveByBody.length}`)

  if (updatePR) {
    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: pullBody
    })
  }
}

run()
  .then(() => {
    core.info('Done.')
  })
  .catch((e) => {
    core.error(e.message)
  })
