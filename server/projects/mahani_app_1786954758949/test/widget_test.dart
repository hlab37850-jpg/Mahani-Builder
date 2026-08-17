import 'package:flutter_test/flutter_test.dart';
import 'package:mahani_app_1786954758949/main.dart';

void main() {
  testWidgets('تطبيق مدير المصروفات الذكي يعمل', (tester) async {
    await tester.pumpWidget(const MahaniApp());
    expect(find.text('مدير المصروفات الذكي'), findsOneWidget);
  });
}
