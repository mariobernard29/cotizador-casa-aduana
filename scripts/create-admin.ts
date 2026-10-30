/**
 * Crea (o promueve) el primer usuario administrador.
 * Uso: npm run admin:create -- correo@dominio.com "Nombre Apellido"
 * La contraseña se pide por la terminal y no se guarda en ningún archivo.
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local.
 */
import { config } from "dotenv";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const [email, fullName = "Administrador"] = process.argv.slice(2);
if (!email) {
  console.error('Uso: npm run admin:create -- correo@dominio.com "Nombre"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    out._writeToOutput = (s: string) => {
      if (s.includes(question)) out.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const supabase = createClient(url!, key!, { auth: { persistSession: false } });
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    const password = process.env.ADMIN_PASSWORD || (await askHidden("Contraseña (mín. 10 caracteres): "));
    if (password.length < 10) throw new Error("La contraseña debe tener al menos 10 caracteres");
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) throw error ?? new Error("No se pudo crear el usuario");
    user = data.user;
    console.log(`Usuario creado: ${email}`);
  } else {
    console.log(`El usuario ${email} ya existe; se activará como administrador.`);
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, email, full_name: fullName, role: "admin", active: true });
  if (error) throw error;
  console.log("Listo: perfil activo con rol de administrador.");
}

main().catch((e) => {
  console.error("Error:", e.message ?? e);
  process.exit(1);
});
