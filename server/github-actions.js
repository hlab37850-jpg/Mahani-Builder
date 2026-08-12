const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

function githubRequest(method, apiPath, token, requestBody = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: apiPath,
        method,
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Mahani-Builder-AI'
        }
      },
      (res) => {
        let body = '';

        res.on('data', chunk => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300 && !body.trim()) {
            return resolve({});
          }

          let data;

          try {
            data = JSON.parse(body);
          } catch {
            return reject(
              new Error(`GitHub returned invalid JSON: HTTP ${res.statusCode}`)
            );
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const error = new Error(
              `GitHub API HTTP ${res.statusCode}`
            );

            error.status = res.statusCode;
            error.data = data;

            return reject(error);
          }

          resolve(data);
        });
      }
    );

    req.on('error', reject);

    if (requestBody) {
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(requestBody));
      req.write(requestBody);
    }

    req.end();
  });
}

async function getLatestWorkflowRun(owner, repo, token) {
  return githubRequest(
    'GET',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=1`,
    token
  );
}

async function getWorkflowRun(owner, repo, runId, token) {
  return githubRequest(
    'GET',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}`,
    token
  );
}

async function getRunArtifacts(owner, repo, runId, token) {
  return githubRequest(
    'GET',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}/artifacts`,
    token
  );
}

function downloadGitHubArtifact(owner, repo, artifactId, token, outputZip) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path:
          `/repos/${encodeURIComponent(owner)}` +
          `/${encodeURIComponent(repo)}` +
          `/actions/artifacts/${artifactId}/zip`,
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': requestUrl.hostname === 'api.github.com' ? `Bearer ${token}` : undefined,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Mahani-Builder-AI'
        }
      },
      (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let body = '';

          res.on('data', chunk => {
            body += chunk;
          });

          res.on('end', () => {
            reject(
              new Error(
                `GitHub artifact download failed: HTTP ${res.statusCode} ${body}`
              )
            );
          });

          return;
        }

        const file = fs.createWriteStream(outputZip);

        res.pipe(file);

        file.on('finish', () => {
          file.close(() => resolve(outputZip));
        });

        file.on('error', reject);
        res.on('error', reject);
      }
    );

    req.on('error', reject);
    req.end();
  });
}

function extractApk(zipPath, outputDir) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(outputDir, { recursive: true });

    execFile(
      'unzip',
      ['-o', zipPath, 'app-release.apk', '-d', outputDir],
      (error, stdout, stderr) => {
        if (error) {
          return reject(
            new Error(
              `Failed to extract APK: ${error.message}\n${stderr || ''}`
            )
          );
        }

        const apkPath = path.join(outputDir, 'app-release.apk');

        if (!fs.existsSync(apkPath)) {
          return reject(
            new Error('app-release.apk was not found inside the artifact')
          );
        }

        resolve(apkPath);
      }
    );
  });
}

async function waitForWorkflowSuccess(
  owner,
  repo,
  runId,
  token,
  options = {}
) {
  const intervalMs = options.intervalMs || 10000;
  const timeoutMs = options.timeoutMs || 15 * 60 * 1000;

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const run = await getWorkflowRun(
      owner,
      repo,
      runId,
      token
    );

    console.log(
      `[GITHUB] Run ${run.id}: status=${run.status}, conclusion=${run.conclusion}`
    );

    if (run.status === 'completed') {
      if (run.conclusion !== 'success') {
        throw new Error(
          `GitHub Actions failed: ${run.conclusion || 'unknown'}`
        );
      }

      return run;
    }

    await new Promise(resolve =>
      setTimeout(resolve, intervalMs)
    );
  }

  throw new Error('GitHub Actions build timed out');
}

async function buildAndDownloadApk(
  owner,
  repo,
  runId,
  token,
  outputDir
) {
  console.log('[GITHUB] Waiting for build...');

  const run = await waitForWorkflowSuccess(
    owner,
    repo,
    runId,
    token
  );

  console.log('[GITHUB] Build completed successfully');

  const artifacts = await getRunArtifacts(
    owner,
    repo,
    run.id,
    token
  );

  const artifact =
    (artifacts.artifacts || []).find(
      item =>
        item.name === 'mahani_app-apk' &&
        item.expired === false
    ) ||
    (artifacts.artifacts || []).find(
      item =>
        item.name.toLowerCase().includes('apk') &&
        item.expired === false
    );

  if (!artifact) {
    throw new Error('No valid APK artifact found');
  }

  console.log(
    `[GITHUB] Artifact found: ${artifact.name} (${artifact.id})`
  );

  fs.mkdirSync(outputDir, { recursive: true });

  const zipPath = path.join(
    outputDir,
    `${artifact.name}-${artifact.id}.zip`
  );

  await downloadGitHubArtifact(
    owner,
    repo,
    artifact.id,
    token,
    zipPath
  );

  console.log('[GITHUB] Artifact downloaded');

  const apkPath = await extractApk(
    zipPath,
    outputDir
  );

  console.log(
    `[GITHUB] APK extracted: ${apkPath}`
  );

  return {
    runId: run.id,
    workflowUrl: run.html_url,
    artifactId: artifact.id,
    artifactName: artifact.name,
    apkPath,
    apkSize: fs.statSync(apkPath).size
  };
}

module.exports = {
  getLatestWorkflowRun,
  getWorkflowRun,
  getRunArtifacts,
  downloadGitHubArtifact,
  extractApk,
  waitForWorkflowSuccess,
  buildAndDownloadApk
};

async function dispatchWorkflow(owner, repo, workflowFile, ref, token) {
  return githubRequest(
    'POST',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`,
    token,
    JSON.stringify({ ref })
  );
}

module.exports.dispatchWorkflow = dispatchWorkflow;

async function getRunArtifacts(owner, repo, runId, token) {
  return githubRequest(
    'GET',
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}/artifacts`,
    token
  );
}

async function waitForWorkflowSuccess(owner, repo, runId, token, options = {}) {
  const timeout = options.timeout || 600000;
  const interval = options.interval || 10000;
  const started = Date.now();

  while (Date.now() - started < timeout) {
    const run = await getWorkflowRun(owner, repo, runId, token);

    console.log(
      `[GITHUB] Run ${run.id}: status=${run.status}, conclusion=${run.conclusion}`
    );

    if (run.status === 'completed') {
      if (run.conclusion !== 'success') {
        throw new Error(
          `GitHub Actions failed: ${run.conclusion || 'unknown'}`
        );
      }

      return run;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('GitHub Actions timeout');
}

async function downloadGitHubArtifact(owner, repo, artifactId, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/artifacts/${artifactId}/zip`,
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': requestUrl.hostname === 'api.github.com' ? `Bearer ${token}` : undefined,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Mahani-Builder-AI'
        }
      },
      res => {
        const chunks = [];

        res.on('data', chunk => chunks.push(chunk));

        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(
              new Error(
                `GitHub artifact download failed: HTTP ${res.statusCode}`
              )
            );
          }

          resolve(Buffer.concat(chunks));
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function extractApk(zipBuffer, outputDir) {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { execFileSync } = require('child_process');

  fs.mkdirSync(outputDir, { recursive: true });

  const zipPath = path.join(
    os.tmpdir(),
    `mahani-${Date.now()}.zip`
  );

  fs.writeFileSync(zipPath, zipBuffer);

  execFileSync(
    'unzip',
    ['-o', zipPath, '-d', outputDir],
    { stdio: 'ignore' }
  );

  const apkPath = path.join(outputDir, 'app-release.apk');

  if (!fs.existsSync(apkPath)) {
    throw new Error('app-release.apk not found in GitHub artifact');
  }

  return apkPath;
}

async function buildAndDownloadApk(owner, repo, runId, token, outputDir) {
  const run = await waitForWorkflowSuccess(
    owner,
    repo,
    runId,
    token
  );

  const artifacts = await getRunArtifacts(
    owner,
    repo,
    runId,
    token
  );

  const artifact =
    (artifacts.artifacts || []).find(
      a => a.name === 'mahani_app-apk' && !a.expired
    ) ||
    (artifacts.artifacts || [])[0];

  if (!artifact) {
    throw new Error('No APK artifact found');
  }

  console.log(
    `[GITHUB] Downloading artifact ${artifact.name} (${artifact.id})`
  );

  const zip = await downloadGitHubArtifact(
    owner,
    repo,
    artifact.id,
    token
  );

  const apkPath = await extractApk(
    zip,
    outputDir
  );

  return {
    run,
    artifact,
    apkPath
  };
}

module.exports.getRunArtifacts = getRunArtifacts;
module.exports.downloadGitHubArtifact = downloadGitHubArtifact;
module.exports.extractApk = extractApk;
module.exports.waitForWorkflowSuccess = waitForWorkflowSuccess;
module.exports.buildAndDownloadApk = buildAndDownloadApk;

async function buildLatestApk(owner, repo, token, outputDir) {
  const before = await getLatestWorkflowRun(owner, repo, token);
  const previousId = before.workflow_runs?.[0]?.id || 0;

  await dispatchWorkflow(owner, repo, 'build-apk.yml', 'main', token);

  let run = null;

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));

    const latest = await getLatestWorkflowRun(owner, repo, token);
    const candidate = latest.workflow_runs?.[0];

    if (candidate && candidate.id !== previousId) {
      run = candidate;
      break;
    }
  }

  if (!run) {
    throw new Error('لم يتم العثور على تشغيل GitHub Actions الجديد');
  }

  console.log(`[GITHUB] New run: ${run.id}`);

  const result = await buildAndDownloadApk(
    owner,
    repo,
    run.id,
    token,
    outputDir
  );

  return {
    runId: run.id,
    workflowUrl: run.html_url,
    artifactId: result.artifact.id,
    artifactName: result.artifact.name,
    apkPath: result.apkPath
  };
}

module.exports.buildLatestApk = buildLatestApk;

async function downloadGitHubArtifactFollowRedirect(url, token) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);

    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Mahani-Builder-AI'
    };

    if (requestUrl.hostname === 'api.github.com') {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-GitHub-Api-Version'] = '2022-11-28';
    }

    const req = https.request(
      {
        hostname: requestUrl.hostname,
        port: requestUrl.port || 443,
        path: requestUrl.pathname + requestUrl.search,
        method: 'GET',
        headers
      },
      res => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return resolve(
            downloadGitHubArtifactFollowRedirect(
              res.headers.location,
              token
            )
          );
        }

        const chunks = [];

        res.on('data', chunk => chunks.push(chunk));

        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(
              new Error(
                `GitHub artifact download failed: HTTP ${res.statusCode}`
              )
            );
          }

          resolve(Buffer.concat(chunks));
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

module.exports.downloadGitHubArtifactFollowRedirect =
  downloadGitHubArtifactFollowRedirect;

const originalBuildAndDownloadApk = buildAndDownloadApk;

buildAndDownloadApk = async function(owner, repo, runId, token, outputDir) {
  const run = await waitForWorkflowSuccess(
    owner,
    repo,
    runId,
    token
  );

  const artifacts = await getRunArtifacts(
    owner,
    repo,
    runId,
    token
  );

  const artifact =
    (artifacts.artifacts || []).find(
      a => a.name === 'mahani_app-apk' && !a.expired
    ) ||
    (artifacts.artifacts || [])[0];

  if (!artifact) {
    throw new Error('No APK artifact found');
  }

  console.log(
    `[GITHUB] Downloading artifact ${artifact.name} (${artifact.id})`
  );

  const url =
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/artifacts/${artifact.id}/zip`;

  const zip = await downloadGitHubArtifactFollowRedirect(
    url,
    token
  );

  const apkPath = await extractApk(
    zip,
    outputDir
  );

  return {
    run,
    artifact,
    apkPath
  };
};

module.exports.buildAndDownloadApk = buildAndDownloadApk;
