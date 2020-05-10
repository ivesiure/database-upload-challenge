import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const categoryRepository = getRepository(Category);

    let existingCategory = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!existingCategory) {
      existingCategory = categoryRepository.create({ title: category });
      await categoryRepository.save(existingCategory);
    }

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('Insuficient funds');
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: existingCategory.id,
    });

    await transactionsRepository.save(transaction);

    delete transaction.category_id;

    return transaction;
  }
}

export default CreateTransactionService;
