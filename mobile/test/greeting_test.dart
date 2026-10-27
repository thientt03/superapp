import 'package:flutter_test/flutter_test.dart';
import 'package:superapp/greeting.dart';

void main() {
  test('greeting theo giờ', () {
    for (final h in [0, 10]) {
      expect(greeting(h), 'Chào buổi sáng 👋');
    }
    for (final h in [11, 12]) {
      expect(greeting(h), 'Chào buổi trưa 👋');
    }
    for (final h in [13, 17]) {
      expect(greeting(h), 'Chào buổi chiều 👋');
    }
    for (final h in [18, 23]) {
      expect(greeting(h), 'Chào buổi tối 👋');
    }
  });
}
