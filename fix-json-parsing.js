const fs = require('fs');
const path = './server/professional-engine.js';
let content = fs.readFileSync(path, 'utf8');

console.log('🔧 Applying advanced JSON parsing fixes...');

// ============================================================
// 1. البحث عن الدالة التي تستخرج JSON وتحسينها
// ============================================================
const oldJsonExtract = `      // استخراج JSON من الاستجابة
      const jsonMatch = content2.match(/\\{[\\s\\S]*\\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);`;

const newJsonExtract = `      // استخراج JSON من الاستجابة مع تنظيف متقدم
      let jsonStr = content2;
      
      // إزالة markdown code blocks إذا وجدت
      jsonStr = jsonStr.replace(/\\\`\\\`\\\`json\\s*/g, '').replace(/\\\`\\\`\\\`\\s*/g, '');
      
      // محاولة استخراج JSON block
      const jsonMatch = jsonStr.match(/\\{[\\s\\S]*\\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      jsonStr = jsonMatch[0];
      
      // تنظيف المشاكل الشائعة في JSON
      jsonStr = jsonStr
        // إصلاح backticks غير المحفوظة في strings
        .replace(/\\\\\\\`/g, '\\\`')
        // إصلاح newlines في strings
        .replace(/\\n/g, '\\\\n')
        .replace(/\\r/g, '\\\\r')
        .replace(/\\t/g, '\\\\t');
      
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        // محاولة إصلاح JSON يدويًا
        console.log('[AI] JSON parsing failed, attempting repair...');
        
        // محاولة إصلاح missing commas
        jsonStr = jsonStr.replace(/"\\s*\\n\\s*"/g, '",\\n  "');
        jsonStr = jsonStr.replace(/"\\s*\\n\\s*\\[/g, '",\\n  [');
        jsonStr = jsonStr.replace(/\\]\\s*\\n\\s*"/g, '],\\n  "');
        
        try {
          parsed = JSON.parse(jsonStr);
        } catch (repairError) {
          // إذا فشل الإصلاح، نبني JSON يدويًا من الـ content
          console.log('[AI] JSON repair failed, extracting content manually...');
          const contentMatch = content2.match(/"content":\\s*"([\\s\\S]*?)"\\s*\\}/);
          const pathMatch = content2.match(/"path":\\s*"([^"]+)"/);
          const purposeMatch = content2.match(/"purpose":\\s*"([^"]+)"/);
          
          if (contentMatch && pathMatch) {
            parsed = {
              files: [{
                path: pathMatch[1],
                purpose: purposeMatch ? purposeMatch[1] : 'Generated file',
                content: contentMatch[1]
                  .replace(/\\\\n/g, '\\n')
                  .replace(/\\\\t/g, '\\t')
                  .replace(/\\"/g, '"')
              }]
            };
          } else {
            throw new Error('Failed to parse JSON: ' + parseError.message);
          }
        }
      }`;

if (content.includes(oldJsonExtract)) {
  content = content.replace(oldJsonExtract, newJsonExtract);
  console.log('✅ Enhanced JSON extraction logic');
} else {
  console.log('⚠️ JSON extraction pattern not found, trying alternative...');
  
  // محاولة بديلة: البحث عن أي مكان يتم فيه استخراج JSON
  const alternativePattern = /const jsonMatch = content2\.match\(\/\\\{\[\\\s\\\S\]\*\\\}\/\);/;
  if (alternativePattern.test(content)) {
    content = content.replace(
      alternativePattern,
      `let jsonStr = content2.replace(/\`\`\`json\\s*/g, '').replace(/\`\`\`\\s*/g, '');
      const jsonMatch = jsonStr.match(/\\{[\\s\\S]*\\}/);`
    );
    console.log('✅ Applied alternative fix');
  }
}

// ============================================================
// 2. تحسين الـ prompt لتجنب المشاكل
// ============================================================
const oldPromptRule = `    '- Never put Markdown inside Dart content.',`;
const newPromptRule = `    '- Never put Markdown inside Dart content.',
    '- Use single quotes for Dart strings when possible to avoid JSON escaping issues.',
    '- Avoid backticks in Dart code.',
    '- Keep the JSON structure simple and clean.',`;

if (content.includes(oldPromptRule)) {
  content = content.replace(oldPromptRule, newPromptRule);
  console.log('✅ Enhanced prompt rules');
}

// ============================================================
// 3. كتابة الملف
// ============================================================
fs.writeFileSync(path, content, 'utf8');
console.log('✅ File saved successfully');

// التحقق من صحة الـ syntax
try {
  require(path);
  console.log('✅ Syntax validation passed');
} catch (e) {
  console.log('❌ Syntax error:', e.message);
  process.exit(1);
}
