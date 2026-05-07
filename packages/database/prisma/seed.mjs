import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEV_USER = {
  email: 'dpamneja@gmail.com',
  phoneE164: '+919999999999',
  displayName: 'Dhruv Pamneja',
  role: 'developer',
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEV_USER.email },
    update: {
      displayName: DEV_USER.displayName,
      role: DEV_USER.role,
      isActive: true,
    },
    create: DEV_USER,
  })

  console.log(`Seeded user: ${user.email} (id=${user.id}, role=${user.role})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
