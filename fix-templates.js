const fs = require('fs');
const path = './server/professional-engine.js';
let content = fs.readFileSync(path, 'utf8');
let originalContent = content;

console.log('🔍 Fixing all template literal issues...\n');

let fixes = 0;

// إصلاح VERSIONS داخل template literals (backticks)
// يجب أن تكون ${VERSIONS.xxx} وليس VERSIONS.xxx

const fixes_needed = [
  { pattern: /VERSIONS\.flutter(?!\})/g, replacement: '${VERSIONS.flutter}', name: 'flutter' },
  { pattern: /VERSIONS\.dartSdk(?!\})/g, replacement: '${VERSIONS.dartSdk}', name: 'dartSdk' },
  { pattern: /VERSIONS\.java(?!\})/g, replacement: '${VERSIONS.java}', name: 'java' },
  { pattern: /VERSIONS\.packages(?!\})/g, replacement: '${VERSIONS.packages}', name: 'packages' },
];

// فقط داخل template literals (backticks)
// نبحث عن كل template literal ونعالجه
const templateRegex = /`([^`]*?)`/g;
let newContent = content.replace(templateRegex, (match, inner) => {
  let fixed = inner;
  for (const fix of fixes_needed) {
    // نتأكد أن النص ليس داخل ${} بالفعل
    if (fixed.includes('VERSIONS.' + fix.name) && !fixed.includes('${VERSIONS.' + fix.name + '}')) {
      // استبدال دقيق: VERSIONS.xxx لكن ليس ${VERSIONS.xxx}
      const regex = new RegExp('(?<!\\$\\{)VERSIONS\\.' + fix.name + '(?!\\})', 'g');
      fixed = fixed.replace(regex, '${VERSIONS.' + fix.name + '}');
      fixes++;
    }
  }
  return '`' + fixed + '`';
});

content = newContent;

console.log(`✅ Applied ${fixes} fixes inside template literals\n`);

// التحقق من وجود pubspec.yaml template
if (content.includes('name:') && content.includes('publish_to:')) {
  console.log('✅ pubspec template found');
  
  // طباعة عينة من template للتحقق
  const pubspecStart = content.indexOf('`name:');
  if (pubspecStart !== -1) {
    const pubspecEnd = content.indexOf('`;', pubspecStart);
    if (pubspecEnd !== -1) {
      const sample = content.substring(pubspecStart, pubspecStart + 200);
      console.log('\n📋 Sample of pubspec template:');
      console.log(sample);
    }
  }
}

// حفظ الملف
if (content !== originalContent) {
  fs.writeFileSync(path, content, 'utf8');
  console.log('\n✅ File saved');
} else {
  console.log('\n⚠️ No changes made');
}

// التحقق من syntax
try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('✅ Syntax validation passed');
} catch (e) {
  console.log('❌ Syntax error:', e.message);
  process.exit(1);
}
