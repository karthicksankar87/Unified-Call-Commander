import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Upsert Locations
  const store1 = await prisma.location.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Store #1', address: '123 Main St' },
  });

  const store2 = await prisma.location.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Store #2', address: '456 Market Ave' },
  });

  // Upsert Users
  const passwordHash = await bcrypt.hash('password', 10);

  const john = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'john@example.com',
      password: passwordHash,
      role: 'staff',
      locationId: store1.id,
    },
  });

  const jane = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: passwordHash,
      role: 'manager',
      locationId: store2.id,
    },
  });

  // Upsert Customers
  const cust1 = await prisma.customer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Alice Johnson',
      contact: '+1-555-1001',
    },
  });

  const cust2 = await prisma.customer.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Bob Williams',
      contact: '+1-555-1002',
    },
  });

  // Create a few calls
  await prisma.call.create({
    data: {
      status: 'incoming',
      customerId: cust1.id,
      timestamp: new Date(),
    },
  });

  await prisma.call.create({
    data: {
      status: 'active',
      routedToUserId: john.id,
      customerId: cust2.id,
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    },
  });

  await prisma.call.create({
    data: {
      status: 'completed',
      routedToUserId: jane.id,
      customerId: cust1.id,
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
  });

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
