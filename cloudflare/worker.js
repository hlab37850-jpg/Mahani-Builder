const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGIN || 'https://mahani-builder.vercel.app').replace(/\/$/, '');
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
  if (origin === allowed) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(request, env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request, env) }
  });
}

async function github(env, path, options = {}) {
  const response = await fetch('https://api.github.com' + path, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + env.MAHANI_DISPATCH_TOKEN,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Mahani-Builder-Free-Worker',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 600);
    throw new Error('GitHub API returned HTTP ' + response.status + ': ' + detail);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) throw new Error('Turnstile is not configured on the Worker.');
  const form = new URLSearchParams();
  form.set('secret', env.TURNSTILE_SECRET);
  form.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form
  });
  const result = await response.json();
  if (!result.success) throw new Error('فشل التحقق الأمني. أعد التحقق ثم حاول مجددًا.');
}

async function handle(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGIN || 'https://mahani-builder.vercel.app').replace(/\/$/, '');
  if (origin && origin !== allowed) return json(request, env, { success: false, error: 'Origin not allowed' }, 403);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (!env.MAHANI_DISPATCH_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    return json(request, env, { success: false, error: 'خدمة البناء غير مكتملة الإعداد.' }, 503);
  }

  const url = new URL(request.url);
  if (url.pathname === '/api/config' && request.method === 'GET') {
    if (!env.TURNSTILE_SITE_KEY) return json(request, env, { success: false, error: 'TURNSTILE_SITE_KEY غير مضبوط.' }, 503);
    return json(request, env, { success: true, siteKey: env.TURNSTILE_SITE_KEY });
  }

  if (url.pathname === '/api/generate' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json(request, env, { success: false, error: 'الطلب ليس JSON صالحًا.' }, 400); }

    const appName = String(body.appName || '').trim();
    const idea = String(body.idea || '').trim();
    const appType = String(body.appType || 'تطبيق عام').trim();
    const design = String(body.design || '').trim();
    const turnstileToken = String(body.turnstileToken || '').trim();

    if (!appName || !idea) return json(request, env, { success: false, error: 'اسم التطبيق وفكرته مطلوبان.' }, 400);
    if (appName.length > 80 || idea.length > 12000 || appType.length > 100 || design.length > 4000) {
      return json(request, env, { success: false, error: 'تجاوز أحد الحقول الحد المسموح.' }, 400);
    }
    if (!turnstileToken) return json(request, env, { success: false, error: 'أكمل التحقق الأمني أولًا.' }, 400);

    try {
      await verifyTurnstile(turnstileToken, request, env);
      const requestId = crypto.randomUUID();
      const response = await fetch(
        'https://api.github.com/repos/' + encodeURIComponent(env.GITHUB_OWNER) + '/' +
        encodeURIComponent(env.GITHUB_REPO) + '/actions/workflows/generate-app.yml/dispatches',
        {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': 'Bearer ' + env.MAHANI_DISPATCH_TOKEN,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Mahani-Builder-Free-Worker',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: String(env.GITHUB_REF || 'fix/generation-pipeline-verification'),
            inputs: { request_id: requestId, app_name: appName, idea, app_type: appType, design }
          })
        }
      );
      if (response.status !== 204) {
        const detail = (await response.text()).slice(0, 600);
        throw new Error('تعذر تشغيل GitHub Actions (HTTP ' + response.status + '): ' + detail);
      }
      return json(request, env, {
        success: true,
        requestId,
        status: 'queued',
        message: 'تم إرسال الطلب للبناء السحابي المجاني.',
        statusUrl: '/api/status?requestId=' + encodeURIComponent(requestId)
      }, 202);
    } catch (error) {
      return json(request, env, { success: false, error: error.message || 'تعذر بدء البناء.' }, 502);
    }
  }

  if (url.pathname === '/api/status' && request.method === 'GET') {
    const requestId = String(url.searchParams.get('requestId') || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
      return json(request, env, { success: false, error: 'رقم الطلب غير صالح.' }, 400);
    }
    try {
      const owner = encodeURIComponent(env.GITHUB_OWNER);
      const repo = encodeURIComponent(env.GITHUB_REPO);
      const runs = await github(env,
        '/repos/' + owner + '/' + repo + '/actions/workflows/generate-app.yml/runs?per_page=30'
      );
      const expected = 'Mahani Build - ' + requestId;
      const run = (runs.workflow_runs || []).find(item =>
        item.display_title === expected || item.name === expected
      );
      if (!run) return json(request, env, { success: true, requestId, status: 'queued', message: 'بانتظار بدء عامل البناء السحابي.' });

      return json(request, env, {
        success: true,
        requestId,
        status: run.status,
        conclusion: run.conclusion,
        runId: run.id,
        runUrl: run.html_url,
        artifactUrl: run.html_url ? run.html_url + '#artifacts' : null,
        message: run.status === 'completed'
          ? (run.conclusion === 'success' ? 'اكتمل البناء. افتح نتيجة التشغيل لتنزيل APK من Artifacts.' : 'فشل البناء. افتح سجلات التشغيل لمعرفة الخطأ.')
          : 'يجري توليد المشروع وبناؤه سحابيًا.'
      });
    } catch (error) {
      return json(request, env, { success: false, error: error.message || 'تعذر جلب حالة البناء.' }, 502);
    }
  }

  return json(request, env, { success: false, error: 'المسار غير موجود.' }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      const origin = request.headers.get('Origin') || '';
      return new Response(JSON.stringify({ success: false, error: error.message || 'Unexpected error' }), {
        status: 500,
        headers: { ...JSON_HEADERS, ...corsHeaders(request, env) }
      });
    }
  }
};
