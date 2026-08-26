import { getControlPrismaClient } from "../src/client";
import { hashPassword } from "../src/password";

async function main() {
  const email = process.env.SUPERADMIN_SEED_EMAIL;
  const password = process.env.SUPERADMIN_SEED_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Definí SUPERADMIN_SEED_EMAIL y SUPERADMIN_SEED_PASSWORD antes de correr el seed",
    );
  }

  const prisma = getControlPrismaClient();
  const passwordHash = await hashPassword(password);

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`SuperAdmin listo: ${superAdmin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
