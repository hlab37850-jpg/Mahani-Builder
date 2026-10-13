const fs = require('node:fs');
const path = require('node:path');
const {
  buildProject,
  safeProjectName
} = require('../server/professional-engine');

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error('Missing required environment variable: ' + name);
  return value;
}

function output(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  const text = String(value);
  if (/[\r\n]/.test(text)) {
    throw new Error('Unsafe multiline workflow output: ' + name);
  }
  fs.appendFileSync(file, name + '=' + text + '\n', 'utf8');
}

async function main() {
  const requestId = required('MAHANI_REQUEST_ID').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!requestId) throw new Error('Invalid request ID');

  const appName = required('MAHANI_APP_NAME');
  const idea = required('MAHANI_IDEA');
  const appType = String(process.env.MAHANI_APP_TYPE || 'تطبيق عام').trim();
  const design = String(process.env.MAHANI_DESIGN || 'تصميم احترافي حديث، عربي RTL').trim();
  const apiKey = required('OPENROUTER_API_KEY');
  required('GITHUB_OWNER');
  required('GITHUB_TOKEN');

  const baseName = safeProjectName(appName).slice(0, 35) || 'mahani_app';
  const projectName = safeProjectName(baseName + '_' + requestId.slice(-10));
  const plan = {
    appName,
    description: idea,
    platform: 'android',
    appType,
    design,
    requirements: {
      production: true,
      realData: true,
      offlineFirst: true,
      sqlite: true,
      arabicRTL: true,
      extensibleArchitecture: true
    }
  };

  console.log('[MAHANI CLOUD] Starting request ' + requestId);
  const result = await buildProject(apiKey, projectName, plan);
  if (!result || !result.github || !result.github.repository || !result.apkPath) {
    throw new Error('Generation pipeline returned incomplete repository/APK metadata');
  }
  if (!fs.existsSync(result.apkPath) || !fs.statSync(result.apkPath).isFile()) {
    throw new Error('APK file missing after successful build');
  }
  const size = fs.statSync(result.apkPath).size;
  if (size < 1024) throw new Error('APK file is unexpectedly small: ' + size);

  output('apk_path', path.resolve(result.apkPath));
  output('repository_url', result.github.repository.url);
  output('nested_workflow_url', result.github.workflowUrl || '');
  output('apk_size', size);

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    fs.appendFileSync(summary, [
      '## Generated application',
      '',
      '- Name: ' + appName,
      '- Repository: ' + result.github.repository.url,
      '- Nested Android build: ' + (result.github.workflowUrl || 'see generated repository Actions'),
      '- APK size: ' + (size / (1024 * 1024)).toFixed(2) + ' MB',
      ''
    ].join('\n'), 'utf8');
  }
  console.log('[MAHANI CLOUD] APK generated and verified (' + size + ' bytes)');
}

main().catch(error => {
  console.error('[MAHANI CLOUD] FAILED:', error && error.stack || error);
  process.exitCode = 1;
});
