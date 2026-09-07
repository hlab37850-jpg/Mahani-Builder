const fs = require('fs');
const path = './server/professional-engine.js';
let content = fs.readFileSync(path, 'utf8');

console.log('🔧 Fixing provider logic...');

// ============================================================
// 1. البحث عن دالة askAI واستبدال منطق الـ loop بالكامل
// ============================================================
// نبحث عن بداية دالة askAI ونستبدلها بكود محسّن

const askAIFunctionStart = content.indexOf('async function askAI(apiKey, messages, maxTokens = 5000) {');
if (askAIFunctionStart === -1) {
  console.log('❌ askAI function not found');
  process.exit(1);
}

// إيجاد نهاية الدالة
let braceCount = 0;
let askAIFunctionEnd = askAIFunctionStart;
let started = false;
for (let i = askAIFunctionStart; i < content.length; i++) {
  if (content[i] === '{') {
    braceCount++;
    started = true;
  } else if (content[i] === '}') {
    braceCount--;
    if (started && braceCount === 0) {
      askAIFunctionEnd = i + 1;
      break;
    }
  }
}

const newAskAI = `async function askAI(apiKey, messages, maxTokens = 5000) {
  // ترتيب المزودين حسب الموثوقية (Groq أولاً - بدون quota issues)
  const providers = [
    {
      name: 'Groq',
      envKey: 'GROQ_API_KEY',
      model: 'openai/gpt-oss-120b',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      tokenField: 'max_completion_tokens'
    },
    {
      name: 'Cerebras',
      envKey: 'CEREBRAS_API_KEY',
      model: 'gpt-oss-120b',
      endpoint: 'https://api.cerebras.ai/v1/chat/completions',
      tokenField: 'max_tokens'
    },
    {
      name: 'SambaNova',
      envKey: 'SAMBANOVA_API_KEY',
      model: 'MiniMax-M2.7',
      endpoint: 'https://api.sambanova.ai/v1/chat/completions',
      tokenField: 'max_tokens'
    },
    {
      name: 'Cohere',
      envKey: 'COHERE_API_KEY',
      model: 'command-a-plus-05-2026',
      endpoint: 'https://api.cohere.ai/compatibility/v1/chat/completions',
      tokenField: 'max_tokens'
    },
    ...(apiKey ? [{
      name: 'OpenRouter',
      envKey: null,
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      tokenField: 'max_tokens'
    }] : [])
  ];

  let lastError = null;

  // محاولة كل مزود مرة واحدة فقط (بدون إعادة محاولة عند quota/429)
  for (const provider of providers) {
    const key = provider.envKey ? process.env[provider.envKey] : apiKey;
    if (!key) {
      console.log('[AI] تخطي ' + provider.name + ' (لا يوجد مفتاح)');
      continue;
    }

    try {
      console.log('[AI] محاولة المزود: ' + provider.name + ' -> ' + provider.model);
      console.log('[AI] tokens=' + maxTokens);

      const body = JSON.stringify({
        model: provider.model,
        messages,
        [provider.tokenField]: maxTokens,
        temperature: 0.2
      });

      const result = await new Promise((resolve, reject) => {
        const url = new URL(provider.endpoint);
        const isGroq = url.hostname.includes('groq');
        const req = require('https').request({
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key,
            'Content-Length': Buffer.byteLength(body)
          }
        }, res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve({ ok: true, data: JSON.parse(data), status: res.statusCode });
              } catch (e) {
                resolve({ ok: false, error: 'Invalid JSON: ' + e.message, data: data, status: res.statusCode });
              }
            } else {
              resolve({ ok: false, error: 'HTTP ' + res.statusCode, data: data, status: res.statusCode });
            }
          });
        });

        req.on('error', e => resolve({ ok: false, error: e.message, status: 0 }));
        req.write(body);
        req.end();
      });

      if (!result.ok) {
        // خطأ HTTP - نتحقق من نوعه
        const errorMsg = String(result.data || result.error || '');

        // إذا كان 429 (Rate Limit/Quota) - تخطي هذا المزود نهائيًا
        if (result.status === 429 || errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          console.log('[AI] ❌ ' + provider.name + ' استنفد الحصة - تخطي نهائي');
          lastError = new Error('Quota exceeded: ' + provider.name);
          continue;
        }

        // إذا كان 503 (ضغط عالي) - تخطي
        if (result.status === 503 || errorMsg.includes('503')) {
          console.log('[AI] ⚠️ ' + provider.name + ' ضغط عالي - تخطي');
          lastError = new Error('Service unavailable: ' + provider.name);
          continue;
        }

        // أخطاء أخرى
        throw new Error('HTTP ' + result.status + ': ' + errorMsg.slice(0, 300));
      }

      const content2 = result.data.choices?.[0]?.message?.content;
      if (!content2) throw new Error('Empty response');

      const finishReason = result.data.choices?.[0]?.finish_reason;
      console.log('[AI] provider=' + provider.name + ' model=' + provider.model + ' finish=' + finishReason + ' content=' + content2.length);

      // إذا كان finish_reason=length، نحاول مع حجم أكبر
      if (finishReason === 'length' && maxTokens < 8000) {
        console.log('[AI] JSON مبتور - إعادة محاولة بنفس المزود بحجم أكبر');
        return askAI(apiKey, messages, Math.min(maxTokens + 2000, 8000));
      }

      // استخراج JSON من الاستجابة
      const jsonMatch = content2.match(/\\{[\\s\\S]*\\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[PIPELINE] ✅ ' + provider.name + ' نجح');
      return parsed;

    } catch (error) {
      lastError = error;
      console.log('[AI] فشل ' + provider.name + ': ' + error.message.slice(0, 200));
      continue;
    }
  }

  throw new Error(
    'AI generation failed: all providers failed. LAST=' +
    (lastError ? lastError.message : 'unknown error')
  );
}`;

content = content.substring(0, askAIFunctionStart) + newAskAI + content.substring(askAIFunctionEnd);
console.log('✅ Replaced askAI function with smart logic');

// ============================================================
// 2. كتابة الملف
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
