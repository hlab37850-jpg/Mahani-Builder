import 'package:flutter/material.dart';import 'package:flutter_riverpod/flutter_riverpod.dart';import '../core/db_helper.dart';
class FallbackScreen extends ConsumerWidget{
  const FallbackScreen({super.key});
  @override Widget build(BuildContext context, WidgetRef ref){
    return Scaffold(appBar:AppBar(title:Text('الشاشة')),body:Center(child:Text('محتوى احترافي')));}}