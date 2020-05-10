import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import Category from '../models/Category';

interface TransactionDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const transactionsFromFile = await this.getTransactionsFromFile(filename);

    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getRepository(Transaction);
    const existingCategories = await categoriesRepository.find();

    const categoriesToAdd = transactionsFromFile
      .filter(
        transaction =>
          !existingCategories.find(
            category => category.title === transaction.category,
          ),
      )
      .map(transaction => transaction.category)
      .filter((value, index, self) => self.indexOf(value) === index)
      .map(title => ({ title }));

    const newCategories = categoriesRepository.create(categoriesToAdd);
    await categoriesRepository.save(newCategories);

    const allCategories = [...existingCategories, ...newCategories];

    const transactions = transactionsRepository.create(
      transactionsFromFile.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionsRepository.save(transactions);

    return transactions;
  }

  private async getTransactionsFromFile(
    filename: string,
  ): Promise<TransactionDTO[]> {
    const filepath = path.join(uploadConfig.directory, filename);
    const readCSVStream = fs.createReadStream(filepath);

    const parseStream = csvParse({ from_line: 2, ltrim: true, rtrim: true });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: TransactionDTO[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value || !category) return;
      transactions.push({ title, value, type, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    await fs.promises.unlink(filepath);
    return transactions;
  }
}

export default ImportTransactionsService;
