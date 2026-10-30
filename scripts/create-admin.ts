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

/** Lee la contraseña en modo raw: no se muestra en pantalla (también en PowerShell). */
function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    // Entrada redirigida: se lee una línea sin eco.
    return new Promise((resolve) => {
      const rl = readline.createInterface({ input: stdin });
      rl.once("line", (line) => {
        rl.close();
        resolve(line);
      });
    });
  }
  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          return reject(new Error("Cancelado"));
        }
        if (ch === "\u0008" || ch === "\u007f") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
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
