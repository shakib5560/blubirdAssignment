import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Read JSON synchronously
const productsData = JSON.parse(fs.readFileSync(path.resolve('./../fixtures/products.json'), 'utf-8'));
const customersData = JSON.parse(fs.readFileSync(path.resolve('./../fixtures/customers.json'), 'utf-8'));

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Clear existing data (optional but recommended for clean slate)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  // Seed Customers
  for (const customer of customersData) {
    const createdCustomer = await prisma.customer.create({
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    });
    console.log(`Created customer with id: ${createdCustomer.id}`);
  }

  // Seed Products
  for (const product of productsData) {
    const createdProduct = await prisma.product.create({
      data: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stockQuantity: product.stockQuantity,
      },
    });
    console.log(`Created product with id: ${createdProduct.id}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
