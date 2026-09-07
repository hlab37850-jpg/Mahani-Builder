require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createFlutterBase, safeName } = require('./generator');

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
    ai: 'cohere/north-mini-code:free'
  });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { appName, idea, appType, design } = req.body;

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
        error: 'OPENROUTER_API_KEY غير موجود'
      });
    }

    const prompt = `
أنت مهندس تطبيقات خبير داخل منصة Mahani Builder AI.

حلل فكرة التطبيق التالية بدقة.
لا تخترع وظائف غير مطلوبة.
أعد JSON صالحًا فقط.
لا تستخدم Markdown.
لا تضع أي نص خارج JSON.

اسم التطبيق:
${appName}

نوع التطبيق:
${appType || 'تطبيق عام'}

فكرة التطبيق:
${idea}

التصميم المطلوب:
${design || 'تصميم حديث عربي RTL'}

أعد بهذا الشكل:

{
  "appName": "",
  "description": "",
  "platform": "android",
  "features": [],
  "screens": [],
  "data": {},
  "design": {
    "style": "",
    "direction": "rtl",
    "primaryColor": ""
  },
  "files": [
    {
      "path": "lib/main.dart",
      "purpose": "نقطة دخول التطبيق",
      "content": "كود Dart كامل وصالح لهذا الملف"
    },
    {
      "path": "lib/screens/home_screen.dart",
      "purpose": "الشاشة الرئيسية",
      "content": "كود Dart كامل وصالح لهذه الشاشة"
    }
  ]
}

قواعد مهمة للـ files:
- أعد جميع ملفات Dart الضرورية لتنفيذ التطبيق فعليًا.
- كل ملف يجب أن يحتوي على path و purpose و content.
- content يجب أن يكون كود Dart كاملًا وقابلًا للترجمة، وليس وصفًا أو مثالًا.
- يجب أن تكون الملفات مترابطة وتستخدم imports صحيحة.
- لا تستخدم placeholders مثل TODO أو "ضع الكود هنا".
- لا تنشئ ملفات غير ضرورية.
- احترم اللغة العربية واتجاه RTL.
- اجعل التطبيق قابلًا للبناء باستخدام Flutter stable.
- لا تضع Markdown داخل content.
- لا تضع \`\`\` داخل content.

`;

    console.log('[ANALYZE] قبل طلب OpenRouter');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    let response;

    try {
      console.log('[ANALYZE] إرسال الطلب إلى OpenRouter...');
      response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://127.0.0.1:3000',
            'X-Title': 'Mahani Builder AI'
          },
          body: JSON.stringify({
            model: 'cohere/north-mini-code:free',
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert Flutter application engineer. Return valid JSON only. Never return Markdown. Generate the actual complete Flutter source code for every required file. Every file object MUST contain path, purpose, and complete content. Do not use placeholders, TODOs, descriptions instead of code, or fixed templates. File paths must be relative, safe, and inside lib/. Keep the project minimal but fully functional. All files must compile together.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 12000,
            response_format: {
              type: 'json_object'
            }
          }),
          signal: controller.signal
        }
      );
    } catch (error) {
      if (error.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'انتهت مهلة توليد المشروع من النموذج بعد 120 ثانية'
        });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
      console.log('[ANALYZE] انتهى طلب OpenRouter');
    }

    console.log('[ANALYZE] استلمنا HTTP:', response.status);

    console.log('[ANALYZE] بدء قراءة OpenRouter stream...');

let responseText = '';

if (!response.body) {
  throw new Error('OPENROUTER_RESPONSE_BODY_UNAVAILABLE');
}

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const result = await reader.read();

  if (result.done) {
    break;
  }

  if (result.value) {
    responseText += decoder.decode(result.value, { stream: true });
    console.log(
      '[ANALYZE] استلمنا chunk:',
      result.value.length,
      'bytes'
    );
  }
}

responseText += decoder.decode();

console.log('[ANALYZE] انتهت قراءة OpenRouter stream');

console.log('[ANALYZE] بعد response.text()');

    console.log(
      '[ANALYZE] حجم استجابة OpenRouter:',
      responseText.length,
      'bytes'
    );

    let data;

    try {
      data = JSON.parse(responseText);
      console.log('[ANALYZE] تم تحليل JSON من OpenRouter');
    } catch (error) {
      console.error('[ANALYZE] فشل تحليل JSON:', error.message);
      console.error('[ANALYZE] بداية الاستجابة:', responseText.slice(0, 1000));

      return res.status(502).json({
        success: false,
        error: 'استجابة النموذج ليست JSON صالحًا',
        details: error.message
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: 'فشل الاتصال بالنموذج',
        details: data
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        success: false,
        error: 'النموذج لم يعط نتيجة'
      });
    }

    let plan;

    try {
      plan = JSON.parse(content.trim());
    } catch {
      const cleaned = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      try {
        plan = JSON.parse(cleaned);
      } catch {
        return res.status(502).json({
          success: false,
          error: 'النموذج أعاد JSON غير صالح',
          raw: content
        });
      }
    }

    console.log('[ANALYZE] بدء إنشاء ملفات المشروع...');
    const projectPath = createFlutterBase(appName, plan);
    console.log('[ANALYZE] انتهى إنشاء المشروع:', projectPath);
    res.json({
      success: true,
      message: 'تم تحليل التطبيق بنجاح',
      model: 'cohere/north-mini-code:free',
      plan,
      project: {
        name: plan.appName || appName,
        folder: safeName(appName),
        path: projectPath
      },
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: 'حدث خطأ داخل الخادم',
      details: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mahani Builder AI running on port ${PORT}`);
});
