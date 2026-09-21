const prisma = require('../src/config/prisma');
const { ensureAdminEmployee } = require('../src/modules/employees/employee.seed');

async function main() {
  console.log('🌱 Seeding database...');
  const admin = await ensureAdminEmployee();
  console.log('✅ Admin employee ensured successfully:', {
    id: admin.id,
    name: admin.name,
    role: admin.role,
    phone: admin.phone,
    isActive: admin.isActive,
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
