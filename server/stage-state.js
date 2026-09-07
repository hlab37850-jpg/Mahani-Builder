const fs = require('fs');
const path = require('path');

function safeName(name) {
  return String(name || 'mahani_app')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_') || 'mahani_app';
}

function statePath(projectName) {
  return path.join(
    __dirname,
    'projects',
    safeName(projectName),
    '.mahani-state.json'
  );
}

function saveState(projectName, state) {
  const file = statePath(projectName);

  fs.mkdirSync(path.dirname(file), {
    recursive: true
  });

  fs.writeFileSync(
    file,
    JSON.stringify(state, null, 2),
    'utf8'
  );

  return file;
}

function loadState(projectName) {
  const file = statePath(projectName);

  if (!fs.existsSync(file)) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(file, 'utf8')
  );
}

function deleteState(projectName) {
  const file = statePath(projectName);

  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    return true;
  }

  return false;
}

function stateExists(projectName) {
  return fs.existsSync(statePath(projectName));
}

module.exports = {
  safeName,
  statePath,
  saveState,
  loadState,
  deleteState,
  stateExists
};
