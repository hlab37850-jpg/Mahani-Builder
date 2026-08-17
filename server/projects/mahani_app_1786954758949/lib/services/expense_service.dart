import '../database/expense_database.dart';
import '../model/expense.dart';

class ExpenseService {
  final ExpenseDatabase _database = ExpenseDatabase.instance;

  ExpenseService._internal();

  static final ExpenseService _instance = ExpenseService._internal();

  factory ExpenseService() => _instance;

  Future<int> addExpense(Expense expense) async {
    return await _database.insertExpense(expense);
  }

  Future<List<Expense>> getExpenses() async {
    return await _database.getAllExpenses();
  }

  Future<Expense?> getExpenseById(int id) async {
    return await _database.getExpenseById(id);
  }

  Future<int> updateExpense(Expense expense) async {
    return await _database.updateExpense(expense);
  }

  Future<int> deleteExpense(int id) async {
    return await _database.deleteExpense(id);
  }

  Future close() async {
    await _database.close();
  }
}
