import 'package:flutter/material.dart';import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'screens/customers.dart';
import 'screens/products.dart';
import 'screens/debts.dart';
import 'screens/reports.dart';
void main()=>runApp(ProviderScope(child:MahaniApp()));
class MahaniApp extends StatelessWidget{ @override Widget build(BuildContext c)=>MaterialApp(debugShowCheckedModeBanner:false,title:'تطبيق الإدارة الذكي',theme:ThemeData(useMaterial3:true,colorSchemeSeed:Color(0xFF0175C2)),home:Directionality(textDirection:TextDirection.rtl,child:Root()));}
class Root extends StatefulWidget{ @override State<Root> createState()=>_R();}
class _R extends State<Root>{int i=0; final p=[CustomersScreen(),
        ProductsScreen(),
        DebtsScreen(),
        ReportsScreen()]; @override Widget build(BuildContext c)=>Scaffold(body:p[i],bottomNavigationBar:NavigationBar(selectedIndex:i,onDestinationSelected:(x)=>setState(()=>i=x),destinations:[NavigationDestination(icon:Icon(Icons.widgets),label:'العملاء'),NavigationDestination(icon:Icon(Icons.widgets),label:'المنتجات'),NavigationDestination(icon:Icon(Icons.widgets),label:'الديون'),NavigationDestination(icon:Icon(Icons.widgets),label:'التقارير')]),);}