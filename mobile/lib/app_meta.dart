import 'package:flutter/material.dart';

class AppMeta {
  final IconData icon;
  final Color from;
  final Color to;
  const AppMeta(this.icon, this.from, this.to);
}

const fallbackMeta = AppMeta(Icons.apps, Color(0xFF475569), Color(0xFF94A3B8));

const Map<String, AppMeta> appMeta = {
  'cong-viec': AppMeta(
    Icons.check_box_outlined,
    Color(0xFF0D9488),
    Color(0xFF34D399),
  ),
  'de-xuat': AppMeta(Icons.send_outlined, Color(0xFFF43F5E), Color(0xFFF472B6)),
  'tuyen-dung': AppMeta(Icons.person_add, Color(0xFFDB2777), Color(0xFFFB7185)),
  'hanh-chinh': AppMeta(Icons.approval, Color(0xFF881337), Color(0xFFB91C1C)),
  'cham-cong': AppMeta(Icons.access_time, Color(0xFF0891B2), Color(0xFF38BDF8)),
  'ho-so': AppMeta(Icons.badge_outlined, Color(0xFF9333EA), Color(0xFF818CF8)),
  'tinh-luong': AppMeta(
    Icons.account_balance_wallet,
    Color(0xFFF43F5E),
    Color(0xFFEC4899),
  ),
  'bao-cao': AppMeta(Icons.pie_chart, Color(0xFFF59E0B), Color(0xFFFB923C)),
  'kho': AppMeta(Icons.inventory_2, Color(0xFF334155), Color(0xFF4F46E5)),
  'cai-dat': AppMeta(Icons.settings, Color(0xFF475569), Color(0xFF94A3B8)),
};
