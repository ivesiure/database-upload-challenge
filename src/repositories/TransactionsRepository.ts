import { EntityRepository, Repository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactionsRepository = getRepository(Transaction);
    const transactions = await transactionsRepository.find();
    const balance = { income: 0, outcome: 0, total: 0 };
    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        balance.income += transaction.value;
        balance.total += transaction.value;
      }
      if (transaction.type === 'outcome') {
        balance.outcome += transaction.value;
        balance.total -= transaction.value;
      }
    });

    return balance;
  }
}

export default TransactionsRepository;
