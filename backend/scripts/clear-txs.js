// backend/scripts/clear-txs.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up legacy pending transactions...");
  
  const result = await prisma.transaction.updateMany({
    where: { status: 'pending' },
    data: { status: 'failed' } // Mark them failed so the resolver ignores them
  });

  console.log(`✅ Cleared ${result.count} stale transactions from the DB.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());