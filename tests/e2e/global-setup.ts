import { execSync } from "node:child_process";

/** Restaura los datos de demostración antes de la suite. */
export default async function globalSetup() {
  execSync("pnpm db:seed", { stdio: "inherit" });
}
