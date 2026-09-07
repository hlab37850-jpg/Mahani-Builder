require('dotenv').config();
const githubActions = require('./server/github-actions');
const path = require('path');

const owner = process.env.GITHUB_OWNER;
const repo = 'test-hello-world-' + Date.now();
const token = process.env.GITHUB_TOKEN;
const projectPath = path.join(__dirname, 'server', 'projects', 'test_hello_world');
const outputDir = path.join(__dirname, 'server', 'projects', 'test_hello_world', 'github-build');

async function main() {
  console.log('========================================');
  console.log('MAHANI GITHUB BUILD TEST');
  console.log('========================================');
  console.log('Owner:', owner);
  console.log('Repo:', repo);
  console.log('Project:', projectPath);
  console.log('');

  if (!owner || !token) {
    throw new Error('GITHUB_OWNER or GITHUB_TOKEN missing');
  }

  console.log('Starting build...');
  const startTime = Date.now();

  const result = await githubActions.buildProject(
    owner,
    repo,
    token,
    projectPath,
    outputDir
  );

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('');
  console.log('========================================');
  console.log('✅ BUILD COMPLETED SUCCESSFULLY');
  console.log('========================================');
  console.log('Repository:', result.repository.url);
  console.log('Workflow URL:', result.workflowUrl);
  console.log('Run ID:', result.runId);
  console.log('Artifact ID:', result.artifactId);
  console.log('APK Path:', result.apkPath);
  console.log('APK Size:', result.apkSize, 'bytes');
  console.log('Duration:', elapsed, 'seconds');
  console.log('========================================');
}

main().catch(err => {
  console.error('');
  console.error('========================================');
  console.error('❌ BUILD FAILED');
  console.error('========================================');
  console.error('Error:', err.message);
  console.error('========================================');
  process.exit(1);
});
