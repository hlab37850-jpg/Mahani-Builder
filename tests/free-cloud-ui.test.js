const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('static UI contains syntactically valid client JavaScript and no embedded access token', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const start = html.lastIndexOf('<script>');
  const end = html.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start, 'main UI script must exist');
  const script = html.slice(start + '<script>'.length, end);
  assert.doesNotThrow(() => new vm.Script(script), 'client JavaScript must parse');
  assert.match(html, /apiBaseUrl/);
  assert.match(html, /turnstileToken/);
  assert.doesNotMatch(html, /gh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub tokens must not be embedded in the UI');
});

test('free cloud workflow requires secrets and publishes a short-lived APK artifact', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'generate-app.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /secrets\.OPENROUTER_API_KEY/);
  assert.match(workflow, /secrets\.GENERATED_APPS_TOKEN/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /retention-days: 7/);
});
