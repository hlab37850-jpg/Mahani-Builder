require('dotenv').config();
const engine = require('./server/professional-engine');

const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
const projectName = 'mysubs';

const plan = {
  appName: 'اشتراكاتي',
  description: 'تطبيق إدارة الاشتراكات الشهرية - يجمع كل اشتراكاتك في مكان واحد مع تنبيهات التجديد والرسوم البيانية. يعرض إجمالي الإنفاق الشهري والسنوي، ويصنف الاشتراكات حسب الفئة (ترفيه، إنتاجية، تخزين، تعليم، صحة)، ويرسل تنبيهات قبل التجديد.',
  platform: 'android',
  appType: 'إدارة مالية',
  design: 'تصميم Minimal عصري 2026، ألوان أزرق داكن #1E293B وبنفسجي #7C3AED وأخضر #10B981، خط Tajawal، كروت عائمة بزوايا دائرية 20px، دعم الوضع الليلي، عربي RTL كامل، رسوم بيانية دائرية وقضبان',
  requirements: {
    production: true,
    realData: true,
    offlineFirst: true,
    sqlite: true,
    arabicRTL: true,
    extensibleArchitecture: true
  }
};

async function main() {
  console.log('========================================');
  console.log('MAHANI BUILDER - بناء تطبيق اشتراكاتي');
  console.log('========================================');
  console.log('App Name:', plan.appName);
  console.log('Project:', projectName);
  console.log('Model:', engine.MODEL);
  console.log('');

  const startTime = Date.now();

  try {
    const result = await engine.buildProject(apiKey, projectName, plan);

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log('');
    console.log('========================================');
    console.log('✅ BUILD COMPLETED SUCCESSFULLY');
    console.log('========================================');
    console.log('Project:', projectName);
    console.log('Total Files:', result.files.length);
    console.log('Dart Files:', result.dartFiles.length);
    console.log('APK Path:', result.apkPath);
    console.log('APK Size:', result.github.apkSize, 'bytes');
    console.log('Repository:', result.github.repository.url);
    console.log('Workflow URL:', result.github.workflowUrl);
    console.log('Duration:', elapsed, 'seconds');
    console.log('========================================');

  } catch (error) {
    console.error('');
    console.error('========================================');
    console.error('❌ BUILD FAILED');
    console.error('========================================');
    console.error('Error:', error.message);
    console.error('========================================');
    process.exit(1);
  }
}

main();
