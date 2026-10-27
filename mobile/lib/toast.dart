import 'package:flutter/material.dart';

import 'api.dart';

void showToast(BuildContext context, String msg) {
  final m = ScaffoldMessenger.of(context);
  m.hideCurrentSnackBar();
  m.showSnackBar(
    SnackBar(
      content: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle, color: Color(0xFF4ADE80), size: 16),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              msg,
              style: const TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
        ],
      ),
      backgroundColor: const Color(0xFF1E293B),
      behavior: SnackBarBehavior.floating,
      shape: const StadiumBorder(),
      duration: const Duration(milliseconds: 2500),
      // đẩy toast lên phía trên màn hình
      margin: EdgeInsets.only(
        bottom:
            MediaQuery.of(context).size.height -
            MediaQuery.of(context).padding.top -
            90,
        left: 40,
        right: 40,
      ),
    ),
  );
}

// 401 đã được ApiClient xử lý (đưa về đăng nhập) nên bỏ qua im lặng.
void toastError(BuildContext context, Object e) {
  if (e is ApiException) {
    if (e.status == 401) return;
    if (e.status == 403 || e.status == 422) {
      return showToast(
        context,
        e.detail.isEmpty ? 'Dữ liệu không hợp lệ' : e.detail,
      );
    }
  }
  showToast(context, 'Không thể kết nối máy chủ');
}
