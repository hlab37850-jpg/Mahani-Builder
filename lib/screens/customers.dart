import 'package:flutter/material.dart';

class CustomersScreen extends StatelessWidget {
  const CustomersScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('العملاء')),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: const [
          Card(child: ListTile(title: Text('عنصر تجريبي 1'))),
          Card(child: ListTile(title: Text('عنصر تجريبي 2'))),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: null,
        child: const Icon(Icons.add),
      ),
    );
  }
}
