import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const file = path.join(process.cwd(), "src/generated/contracts.json");
    return NextResponse.json(JSON.parse(await readFile(file, "utf8")));
  } catch {
    return NextResponse.json({ error: "No hay despliegue local. Ejecuta npm run chain y npm run deploy:local." }, { status: 404 });
  }
}
