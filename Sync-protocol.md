<div dir="rtl" lang="ar">

LDPR Protocol Specification
Logically Distributed Pruned Replication

| Version | Status      | Date |
|---------|-------------|------|
| 1.0.0   | Final Draft | 2025 |

1. Overview (نظرة عامة)

بروتوكول LDPR هو نظام مزامنة بيانات موزع (Distributed Data Synchronization) مصمم لبيئات Local-First.
يعتمد البروتوكول على المنطق التالي والمبادئ الأساسية:

المبادئ الأساسية:
- Storage-Centric Remote: النسخة البعيدة (Remote) هي مخزن سلبي (Shared Storage) فقط.
- Immediate Deletion: الحذف يتم فيزيائياً وفوراً لتقليل استهلاك التخزين.
- Self-Pruning: النظام ينظف نفسه (Tombstones & Metadata) تلقائياً بناءً على تتبع حالة الممثلين.
- Monotonic Consistency: الاعتماد على تسلسل رتيب (Sequences) لضمان عدم فقدان البيانات.

2. Actors (الممثلون)

التعريف
الـ Actor هو أي جهاز أو عميل (Local Replica) يمتلك نسخة محلية من القائمة ويشارك في عمليات القراءة/الكتابة.

المسؤوليات
- الـ Actors هم "عقل" النظام؛ هم من يقررون إنشاء البيانات، حذفها، وتنظيف السجلات.
- إدارة العدادات الخاصة بهم في الـ Remote.

3. Replicas & Registration (النسخ والتسجيل)

3.1. Local Replica (النسخة المحلية)
تحتوي على البيانات الفعلية للمستخدم + ميتا بيانات خفيفة لتتبع حالة المزامنة.

3.2. Remote Replica (النسخة البعيدة)
مخزن مركزي يحتوي على:
- البيانات المجمعة من كل الـ Actors.
- قوائم النظام: __meta__ و __tombs__.

3.3. آلية التسجيل (Actor Registration Logic)
يجب أن يعرف النظام بدقة عدد الأجهزة المهتمة بكل قائمة لإدارة عملية التنظيف.

أ. التسجيل (Join):
يتم عندما يمتلك الجهاز عنصراً واحداً على الأقل، وتكون حالته isActor == false.
- زيادة العداد في الريموت: RemoteMeta.actors_counter += 1.
- تحديث إشارة التغيير: RemoteMeta._meta_write_sequence += 1.
- تحديث الحالة المحلية: LocalMeta.isActor = true.

ب. المغادرة (Leave):
يتم عندما يقوم المستخدم بحذف آخر عنصر في القائمة محلياً.
- إنقاص العداد: RemoteMeta.actors_counter -= 1.
- حذف سجل الـ Meta المحلي نهائياً.

4. Conflict Resolution (حل التعارض)

يعتمد البروتوكول استراتيجية LWW (Last Write Wins) مع HLC لضمان الترتيب الزمني.

Hybrid Logical Clock (HLC)
- يتم تخزين الوقت في حقل _updatedAt_HLC.
- يجمع بين الوقت الفيزيائي (Physical Time) والعداد المنطقي (Logical Counter).
- الهدف: ضمان أن أي حدث لاحق يمتلك طابعاً زمنياً أكبر دائماً، حتى لو كانت ساعة الجهاز غير دقيقة.

Clock Skew Correction
- عند الاتصال بالـ Remote، يتم حساب الفرق (Offset) بين وقت الجهاز ووقت السيرفر.
- يتم ضبط الـ HLC محلياً بناءً على هذا الفرق لمنع "تزوير التاريخ" أو المشاكل الناتجة عن الساعات القديمة.

5. Checkpoints & Sequences (نقاط التفتيش)

تعتمد المزامنة على ثلاثة أنواع من التسلسلات لضمان الكفاءة والترتيب:

| التسلسل               | المستوى         | الوظيفة                                                                 |
|-----------------------|------------------|-------------------------------------------------------------------------|
| write_sequence        | Item             | الهوية التسلسلية للعنصر. يتم تعيينه عند الإنشاء أو التحديث.            |
| max_write_sequence    | Remote Meta      | عداد تراكمي يمثل "السقف". يُستخدم لتوليد الأرقام الجديدة.              |
| local_checkpoint_sequence | Local Meta   | مؤشر يحدد آخر نقطة استلام لدى الـ Actor.                                |

منطق المزامنة (Sync Logic)
- عند الرفع (Push):
  New_Item.write_sequence = Remote.max_write_sequence + 1

- عند الجلب (Pull):
  SELECT * FROM Items WHERE write_sequence > local_checkpoint_sequence

6. Deletions & Tombstones (الحذف والتنظيف)

فلسفة النظام: "الحذف يفوز دائماً" (Deletions Always Win).

6.1. عملية الحذف (Deletion Flow)
- الحذف الفوري: يتم حذف العنصر فيزيائياً من Local و Remote في نفس اللحظة.
- إنشاء الشاهد (Tombstone Creation): يتم إنشاء سجل في __tombs__ بالقيم التالية:
  - capture_actors_counter: النسخة الحالية من عدد الـ Actors.
  - received_actors_counters: 1 (الذي قام بالحذف).
  - write_sequence: تسلسل جديد (ليتم التقاطه من قبل الآخرين).
  - createdAt: timestamp للحسابات والـ TTL.
- تحديث الميتا:
  - length -= 1
  - _meta_write_sequence += 1

6.2. استهلاك الحذف (Consumption)
عندما يقوم Actor آخر بالمزامنة:
- يستلم الـ Tombstone.
- يحذف العنصر محلياً.
- يزيد العداد في الريموت: received_actors_counters += 1.

6.3. التنظيف النهائي (Pruning Strategy)

أ. تنظيف الـ Tombstone:
- يُحذف الـ Tombstone من الـ Remote نهائياً عندما يتم استلامه من قبل عدد كافٍ من الـ Actors (received_actors_counters >= capture_actors_counter) أو عند تجاوز شروط TTL/السياسات الأخرى.

ب. تنظيف القائمة (List Pruning):
- تُحذف الـ RemoteMeta نهائياً عندما:
  - length == 0 (القائمة فارغة فعلياً).
  - actors_counter == 0 (لا يوجد ممثلون).

7. Edge Cases: TTL & Repair (معالجة الغياب)

للتعامل مع الأجهزة المفقودة أو التي تم مسح بياناتها دون إعلام السيرفر (Ghost Actors).

7.1. مدة الصلاحية (TTL)
- يتم تحديد مدة زمنية (مثل 30 يوماً). إذا انقضت المدة ولم يتغير نشاط الـ Tombstone:
  - يتم تجاهل الغائبين في شرط التنظيف.
  - يتم حذف الـ Tombstone قسراً لتوفير المساحة.

7.2. وضع الإصلاح (Repair Mode)
- إذا عاد Actor للاتصال بعد غياب طويل (تجاوز TTL):
  - يكتشف أن الـ Checkpoint الخاص به غير صالح أو قديم جداً.
  - يقوم بعملية Full Resync:
    - مقارنة المعرفات (_id) المحلية مع الموجودة في الـ Remote.
    - أي عنصر محلي غير موجود في الـ Remote يتم حذفه فوراً (لأنه حُذف ونُظف أثناء الغياب).
  - يعيد تسجيل نفسه (isActor = true).

8. Data Structures (هيكلية البيانات)

8.1 Remote List Meta (__meta__)
يستخدم لإدارة حالة القائمة في السحابة.

```json
{
  "name": "string (Primary Key)",
  "max_write_sequence": "integer",      // Last global sequence (Increment only)
  "_meta_write_sequence": "integer",    // Increments on structure change (count/length)
  "actors_counter": "integer",          // Total active replicas
  "length": "integer"                   // Real-time item count
}
```

8.2 Local List Meta
يستخدم لتتبع حالة الجهاز المحلي.

```json
{
  "name": "string",
  "local_checkpoint_sequence": "integer", // Last synced sequence
  "isActor": "boolean"                    // Active status flag
}
```

8.3 Tombstone Item (__tombs__)
سجل مؤقت لإبلاغ الحذف.

```json
{
  "itemId": "string",
  "list_name": "string",
  "write_sequence": "integer",            // To be fetched by delta sync
  "capture_actors_counter": "integer",    // Target confirmations needed
  "received_actors_counters": "integer",  // Current confirmations
  "createdAt": "timestamp"                // For TTL calculation
}
```

8.4 Standard Item
العنصر الفعلي للبيانات.

```json
{
  "_id": "string",
  "list_name": "string",
  "data": "json object",
  "write_sequence": "integer",
  "_updatedAt_HLC": "string"              // Hybrid Logical Clock Timestamp
}
```

</div>
