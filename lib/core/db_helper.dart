import 'package:sqflite/sqflite.dart';import 'package:path/path.dart';
class DbHelper{
  static final DbHelper _i=DbHelper._(); DbHelper._(); factory DbHelper()=>_i; Database? _db;
  Future<Database> get db async => _db ??= await _init();
  Future<Database> _init() async {
    final p=join(await getDatabasesPath(),'mahani_pro_mshk6047.db');
    return openDatabase(p,version:1,onCreate:(d,v) async {
      await d.execute('CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, created_at TEXT)');
      await d.execute('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, created_at TEXT)');
      await d.execute('CREATE TABLE IF NOT EXISTS debts (id INTEGER PRIMARY KEY AUTOINCREMENT, customer TEXT, amount REAL, created_at TEXT)');
      await d.execute('CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, created_at TEXT)');
    });
  }
  Future<int> insert(String t, Map<String,dynamic> r){ r['created_at']=DateTime.now().toIso8601String(); return db.then((d)=>d.insert(t,r));}
  Future<List<Map>> getAll(String t)=>db.then((d)=>d.query(t,orderBy:'id DESC'));
  Future<int> delete(String t,int id)=>db.then((d)=>d.delete(t,where:'id=?',whereArgs:[id]));
}
