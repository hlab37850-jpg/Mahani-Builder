const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  safeProjectName,
  root,
  validateGeneratedFiles,
  writeGitHubWorkflow
} = require('../server/professional-engine');

test('safeProjectName normalizes names into stable Dart-compatible identifiers', () => {
  assert.equal(safeProjectName(' My New App! '), 'my_new_app');
  assert.match(safeProjectName('A'.repeat(100)), /^[a-z0-9_]{1,50}$/);
});

test('generated project preflight rejects missing files and accepts a minimal valid project', () => {
  const projectName = 'pipeline_test_' + process.pid + '_' + Date.now();
  const projectRoot = root(projectName);

  try {
    fs.mkdirSync(projectRoot, { recursive: true });

    const emptyValidation = validateGeneratedFiles(projectName);
    assert.equal(emptyValidation.valid, false);
    assert.ok(emptyValidation.errors.some(error => error.includes('lib/main.dart')));
    assert.ok(emptyValidation.errors.some(error => error.includes('pubspec.yaml')));

    fs.mkdirSync(path.join(projectRoot, 'lib'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, 'lib', 'main.dart'),
      "import 'package:flutter/material.dart';\nvoid main() => runApp(const MaterialApp(home: Scaffold(body: Text('Ready'))));\n",
      'utf8'
    );
    fs.writeFileSync(
      path.join(projectRoot, 'pubspec.yaml'),
      "name: " + projectName + "\ndescription: test\npublish_to: 'none'\nversion: 1.0.0+1\nenvironment:\n  sdk: '>=3.9.0 <4.0.0'\ndependencies:\n  flutter:\n    sdk: flutter\nflutter:\n  uses-material-design: true\n",
      'utf8'
    );

    const validation = validateGeneratedFiles(projectName);
    assert.equal(validation.valid, true, validation.errors.join('; '));
    assert.ok(validation.files.includes('lib/main.dart'));

    const workflowPath = writeGitHubWorkflow(projectName);
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /flutter pub get/);
    assert.match(workflow, /flutter analyze/);
    assert.match(workflow, /flutter build apk --release/);
    assert.match(workflow, /actions\/upload-artifact@v4/);
    assert.match(workflow, /if-no-files-found: error/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
