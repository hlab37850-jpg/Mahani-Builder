require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { buildProject, safeProjectName, MODEL } = require('./professional-engine');
const githubActions = require('./github-actions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    name: 'Mahani Builder AI',
    status: 'online',
    engine: 'professional',
    model: MODEL
  });
});


function normalizeResumeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findResumableProject(appName, idea, appType, design) {
  const projectsRoot = path.join(__dirname, 'projects');

  if (!fs.existsSync(projectsRoot)) {
    return null;
  }

  const target = {
    appName: normalizeResumeText(appName),
    description: normalizeResumeText(idea),
    appType: normalizeResumeText(appType || 'تطبيق عام'),
    design: normalizeResumeText(
      design || 'تصميم احترافي حديث، عربي RTL'
    )
  };

  const candidates = [];

  for (const name of fs.readdirSync(projectsRoot)) {
    const projectRoot = path.join(projectsRoot, name);
    const checkpointPath = path.join(
      projectRoot,
      '.mahani-checkpoint.json'
    );

    if (!fs.existsSync(checkpointPath)) {
      continue;
    }

    try {
      const checkpoint = JSON.parse(
        fs.readFileSync(checkpointPath, 'utf8')
      );

      if (
        !checkpoint ||
        checkpoint.version !== 2 ||
        !checkpoint.projectName ||
        !Array.isArray(checkpoint.completedStages) ||
        checkpoint.completedStages.length === 0 ||
        checkpoint.completedStages.length >= 4
      ) {
        continue;
      }

      const sameApp =
        normalizeResumeText(checkpoint.appName) ===
        target.appName;

      const sameDescription =
        normalizeResumeText(checkpoint.description) ===
        target.description;

      const sameAppType =
        normalizeResumeText(checkpoint.appType) ===
        target.appType;

      const sameDesign =
        normalizeResumeText(checkpoint.design) ===
        target.design;

      if (
        sameApp &&
        sameDescription &&
        sameAppType &&
        sameDesign
      ) {
        candidates.push({
          projectName: checkpoint.projectName,
          completedStages: checkpoint.completedStages,
          mtime: fs.statSync(checkpointPath).mtimeMs
        });
      }
    } catch (error) {
      console.log(
        '[CHECKPOINT] تجاهل checkpoint غير صالح: ' +
        checkpointPath
      );
    }
  }

  if (!candidates.length) {
    console.log(
      '[CHECKPOINT] لا يوجد مشروع مطابق لهذا الطلب'
    );
    return null;
  }

  candidates.sort((a, b) => b.mtime - a.mtime);

  const selected = candidates[0];

  console.log(
    '[CHECKPOINT] تم العثور على مشروع مطابق: ' +
    selected.projectName
  );

  console.log(
    '[CHECKPOINT] المراحل المكتملة: ' +
    selected.completedStages.join(', ')
  );

  return selected.projectName;
}

app.post('/api/analyze', async (req, res) => {
  const startedAt = Date.now();

  try {
    const {
      appName,
      idea,
      appType,
      design
    } = req.body || {};

    if (!appName || !idea) {
      return res.status(400).json({
        success: false,
        error: 'اسم التطبيق وفكرة التطبيق مطلوبان'
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OPENROUTER_API_KEY غير موجود في .env'
      });
    }

    let projectName = findResumableProject(
      appName,
      idea,
      appType,
      design
    );

    if (projectName) {
      console.log(
        '[MAHANI] استئناف المشروع المتوقف: ' +
        projectName
      );
    } else {
      projectName = safeProjectName(appName);

      console.log(
        '[MAHANI] لا يوجد مشروع متوقف — إنشاء مشروع جديد: ' +
        projectName
      );
    }

    const plan = {
      appName: String(appName).trim(),
      description: String(idea).trim(),
      platform: 'android',
      appType: appType || 'تطبيق عام',
      design: design || 'تصميم احترافي حديث، عربي RTL',
      requirements: {
        production: true,
        realData: true,
        offlineFirst: true,
        sqlite: true,
        arabicRTL: true,
        extensibleArchitecture: true
      }
    };

    console.log('');
    console.log('==========================================');
    console.log('[MAHANI] PROFESSIONAL BUILD START');
    console.log('==========================================');
    console.log('[MAHANI] App:', plan.appName);
    console.log('[MAHANI] Project:', projectName);
    console.log('[MAHANI] Model:', MODEL);

    const result = await buildProject(
      apiKey,
      projectName,
      plan
    );

    console.log('');
    console.log('==========================================');
    console.log('[MAHANI] GITHUB APK BUILD START');
    console.log('==========================================');

    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;

    if (!githubToken || !githubOwner) {
      throw new Error('GITHUB_TOKEN أو GITHUB_OWNER غير موجود في .env');
    }

    const githubRepo = githubActions.normalizeRepoName
      ? githubActions.normalizeRepoName(projectName)
      : String(projectName)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 90);

    const githubOutputDir = path.join(
      __dirname,
      'projects',
      projectName,
      'github-build'
    );

    fs.mkdirSync(githubOutputDir, { recursive: true });

    const githubResult = await githubActions.buildProject(
      githubOwner,
      githubRepo,
      githubToken,
      result.projectRoot,
      githubOutputDir
    );

    console.log('[MAHANI] GITHUB APK BUILD COMPLETE');
    console.log('[MAHANI] APK:', githubResult.apkPath);
    console.log('[MAHANI] Size:', githubResult.apkSize);

    const elapsed = Math.round(
      (Date.now() - startedAt) / 1000
    );

    console.log('[MAHANI] PROFESSIONAL BUILD COMPLETE');
    console.log('[MAHANI] Files:', result.files.length);
    console.log('[MAHANI] Time:', elapsed, 'seconds');

    return res.json({
      success: true,
      message: 'تم إنشاء المشروع عبر المحرك الاحترافي',
      engine: 'professional',
      model: MODEL,
      durationSeconds: elapsed,
      project: {
        name: plan.appName,
        folder: projectName,
        path: result.projectRoot
      },
      github: {
        repository: githubResult.repository,
        runId: githubResult.runId,
        workflowUrl: githubResult.workflowUrl,
        artifactId: githubResult.artifactId,
        artifactName: githubResult.artifactName,
        apkPath: githubResult.apkPath,
        apkSize: githubResult.apkSize
      },
      stages: result.stages,
      files: result.files
    });

  } catch (error) {
    console.error('');
    console.error('==========================================');
    console.error('[MAHANI] PROFESSIONAL BUILD ERROR');
    console.error('==========================================');
    console.error(error);

    return res.status(500).json({
      success: false,
      error: 'فشل إنشاء المشروع',
      details: error.message
    });
  }
});

app.get('/api/project/:name', (req, res) => {
  try {
    const projectName = safeProjectName(req.params.name);

    const projectRoot = path.join(
      __dirname,
      'projects',
      projectName
    );

    if (!fs.existsSync(projectRoot)) {
      return res.status(404).json({
        success: false,
        error: 'المشروع غير موجود'
      });
    }

    const files = [];

    function walk(dir) {
      for (const entry of fs.readdirSync(dir, {
        withFileTypes: true
      })) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          files.push(
            path.relative(projectRoot, full)
          );
        }
      }
    }

    walk(projectRoot);

    res.json({
      success: true,
      project: projectName,
      files: files.sort()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('==========================================');
  console.log('Mahani Builder AI');
  console.log('Professional Engine');
  console.log(`Running on port ${PORT}`);
  console.log(`Model: ${MODEL}`);
  console.log('==========================================');
});
