const stateStore = require('./stage-state');

const STAGES = Object.freeze([
  'plan',
  'core',
  'data',
  'services',
  'ui',
  'verify',
  'repair'
]);

function isValidStage(stage) {
  return STAGES.includes(stage);
}

function nextStage(stage) {
  const index = STAGES.indexOf(stage);

  if (index === -1 || index >= STAGES.length - 1) {
    return null;
  }

  return STAGES[index + 1];
}

function previousStage(stage) {
  const index = STAGES.indexOf(stage);

  if (index <= 0) {
    return null;
  }

  return STAGES[index - 1];
}

function createState(projectName) {
  const state = {
    projectName,
    currentStage: 'plan',
    completed: [],
    failed: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  stateStore.saveState(projectName, state);

  return state;
}

function loadState(projectName) {
  return stateStore.loadState(projectName);
}

function loadOrCreateState(projectName) {
  const existing = loadState(projectName);

  if (existing) {
    return existing;
  }

  return createState(projectName);
}

function saveState(state) {
  if (!state || !state.projectName) {
    throw new Error('Invalid stage state');
  }

  state.updatedAt = new Date().toISOString();

  stateStore.saveState(
    state.projectName,
    state
  );

  return state;
}

function completeStage(state, stage) {
  if (!isValidStage(stage)) {
    throw new Error(`Invalid stage: ${stage}`);
  }

  if (!state.completed.includes(stage)) {
    state.completed.push(stage);
  }

  state.failed = state.failed.filter(
    item => item.stage !== stage
  );

  state.currentStage =
    nextStage(stage) || stage;

  saveState(state);

  return state;
}

function failStage(state, stage, error) {
  if (!isValidStage(stage)) {
    throw new Error(`Invalid stage: ${stage}`);
  }

  state.failed.push({
    stage,
    error: String(error || 'Unknown error'),
    at: new Date().toISOString()
  });

  state.currentStage = stage;

  saveState(state);

  return state;
}

function resetState(projectName) {
  return createState(projectName);
}

module.exports = {
  STAGES,
  isValidStage,
  nextStage,
  previousStage,
  createState,
  loadState,
  loadOrCreateState,
  saveState,
  completeStage,
  failStage,
  resetState
};
