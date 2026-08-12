const {
  dispatchWorkflow,
  getLatestWorkflowRun
} = require('../server/github-actions');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed'
    });
  }

  try {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    if (!owner || !repo || !token) {
      return res.status(500).json({
        success: false,
        error: 'GitHub environment variables are missing'
      });
    }

    const before = await getLatestWorkflowRun(owner, repo, token);
    const previousId = before.workflow_runs?.[0]?.id || 0;

    await dispatchWorkflow(
      owner,
      repo,
      'build-apk.yml',
      'main',
      token
    );

    return res.status(202).json({
      success: true,
      message: 'تم بدء بناء APK',
      previousRunId: previousId,
      status: 'queued'
    });

  } catch (error) {
    console.error('[VERCEL BUILD ERROR]', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
