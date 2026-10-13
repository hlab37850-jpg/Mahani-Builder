# تشغيل Mahani Builder مجانًا (بدون خادم مدفوع)

هذا المسار يستخدم الخدمات المجانية المتاحة:
- واجهة الموقع الحالية على Vercel Free (أو GitHub Pages).
- Cloudflare Workers Free لتلقي الطلبات وحماية رمز GitHub عن الواجهة.
- Cloudflare Turnstile Free لتقليل إساءة استخدام نقطة الإنشاء.
- GitHub Actions لبناء المشاريع في السحابة.
- OpenRouter مع نموذج مجاني متاح؛ حدود النموذج المجاني تتغير وقد يتوقف مؤقتًا عند بلوغ الحصة.

**مهم:** المجانية ليست غير محدودة لكل حالة. مستودعات التطبيقات الخاصة تستهلك دقائق GitHub Actions المجانية المخصصة للحساب. يمكن اختيار المستودعات العامة للبناء القياسي المجاني غير المحدود، لكن ذلك يجعل شيفرة التطبيق وملفات المشروع عامة. الافتراضي آمن: مستودعات خاصة.

## 1. إعداد أسرار GitHub (مرة واحدة)

في مستودع `hlab37850-jpg/Mahani-Builder` افتح:
Settings → Secrets and variables → Actions → New repository secret

أضف:

- `OPENROUTER_API_KEY`: مفتاح حساب OpenRouter الذي يستخدم نموذجًا مجانيًا متاحًا.
- `GENERATED_APPS_OWNER`: اسم حساب GitHub الذي سينشئ مستودعات التطبيقات، مثل `hlab37850-jpg`.
- `GENERATED_APPS_TOKEN`: رمز GitHub لا يُكشف للواجهة. يلزم أن يستطيع إنشاء المستودعات ورفع الشيفرات وتشغيل GitHub Actions. مع Classic PAT غالبًا يلزم نطاق `repo` و`workflow`. احفظه سرًا ولا تضعه في أي ملف أو محادثة.

إذا كان الحساب يستخدم سياسات مؤسسة تمنع Classic PAT، أنشئ Fine-grained token بصلاحيات مناسبة للمستودعات المستهدفة، وتأكد من أن الصلاحيات تشمل إنشاء المستودعات وتشغيل Actions.

## 2. اختيار خصوصية التطبيقات الناتجة

الافتراضي هو خاص. هذا يحمي الشيفرة لكنه يستهلك حصة دقائق Actions المجانية للمستودعات الخاصة.

لجعل المستودعات الناتجة عامة (على مسؤوليتك لأن الشيفرة ستكون مرئية للجميع)، افتح:
Settings → Secrets and variables → Actions → Variables → New repository variable

- الاسم: `GENERATED_REPOS_PRIVATE`
- القيمة: `false`

احذف المتغير أو اجعله `true` للعودة إلى المستودعات الخاصة. لا تضع كلمات مرور أو بيانات عملاء حقيقية في وصف التطبيق.

## 3. نشر واجهة API المجانية على Cloudflare Workers

1. أنشئ حساب Cloudflare Free.
2. من Workers & Pages أنشئ Worker جديدًا باسم مثل `mahani-builder-api`.
3. بعد دمج التغييرات إلى `main`، انسخ محتوى `cloudflare/worker.js` كاملًا إلى محرر Worker ثم انشره.
4. في Worker → Settings → Variables and Secrets أضف المتغيرات العادية:
   - `GITHUB_OWNER` = `hlab37850-jpg`
   - `GITHUB_REPO` = `Mahani-Builder`
   - `GITHUB_REF` = `main`
   - `ALLOWED_ORIGIN` = `https://mahani-builder.vercel.app`
   - `TURNSTILE_SITE_KEY` = مفتاح الموقع العام من Turnstile
5. أضف Secret باسم `MAHANI_DISPATCH_TOKEN` يحتوي رمز GitHub الذي يستطيع تشغيل Workflow في مستودع Mahani Builder.
6. أنشئ Turnstile widget مجانيًا في Cloudflare، وأضف اسم المضيف `mahani-builder.vercel.app`، ثم خزّن المفتاح السري باسم `TURNSTILE_SECRET` في Worker Secrets.
7. أعد نشر Worker بعد إضافة المتغيرات والأسرار.

لا تضف `MAHANI_DISPATCH_TOKEN` أو `TURNSTILE_SECRET` إلى JavaScript في الواجهة أو إلى GitHub commits. يمكن استخدام نفس رمز GitHub في سر Actions الخاص بتوليد التطبيقات، لكن يُفضّل تقييد الصلاحيات قدر الإمكان.

## 4. التأكد من تفعيل Workflow

بعد دمج التغييرات إلى `main)، تحقق من وجود:
`.github/workflows/generate-app.yml`

ويجب أن تكون صلاحيات Actions مفعلة للمستودع. يرسل Worker الطلب إلى Workflow، ثم يجري عامل GitHub إنشاء المشروع ورفعه وتشغيل البناء. لا يحتاج الخادم إلى الاحتفاظ بملفات المشروع أو APK على قرص دائم.

## 5. ربط الموقع

افتح موقع Mahani Builder، وأدخل رابط Worker الذي يظهر لك بعد النشر، مثل:
`https://mahani-builder-api.<your-subdomain>.workers.dev`

أكمل تحقق Turnstile، ثم جرّب تطبيقًا صغيرًا لا يحتوي على بيانات حقيقية. الواجهة تستعلم عن حالة Workflow وتعرض رابط تشغيل GitHub. بعد النجاح افتح التشغيل ثم قسم **Artifacts** ونزّل ملف ZIP الذي يحتوي على APK؛ فك الضغط قبل تثبيت APK.

## 6. تشخيص الأعطال

- `404 workflow not found`: تأكد من دمج الملف إلى `main` وأن اسم الملف `generate-app.yml` صحيح.
- `401/403 GitHub API`: رمز GitHub أو صلاحيات Actions/المستودعات غير كافية.
- `OPENROUTER_API_KEY missing`: السر غير مضاف في Settings → Secrets and variables → Actions.
- فشل النموذج المجاني أو `429`: حصة النموذج انتهت أو النموذج غير متاح؛ جرّب لاحقًا أو غيّر النموذج المجاني في `server/professional-engine.js`.
- البناء نجح لكن لا يظهر Artifact: افتح سجلات Workflow وتأكد من نجاح خطوة Upload APK artifact.

## حدود مهمة

- لا يمكن ضمان بقاء كل نموذج ذكاء اصطناعي مجانيًا أو متاحًا دائمًا؛ الحصص تتغير وفق مزود الخدمة.
- دقائق GitHub Actions للمستودعات الخاصة محدودة وفق الخطة والحساب. المستودعات العامة تتيح دقائق قياسية مجانية، مقابل نشر الشيفرة علنًا.
- تنزيل Artifact من GitHub يتطلب تسجيل الدخول إلى الحساب الذي يملك صلاحية المستودع، وتبقى الملفات وفق مدة الاحتفاظ المضبوطة في Workflow (7 أيام).
- لم تُجرَ بعد تجربة شاملة من واجهة الموقع حتى تنزيل APK على هاتف حقيقي؛ يجب إجراء اختبار دخان بعد إعداد الأسرار ونشر Worker.
