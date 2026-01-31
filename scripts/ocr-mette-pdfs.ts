import "dotenv/config";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { Mistral } from "@mistralai/mistralai";

const PDF_DIR = path.resolve("storage/mette-pdfs");
const MD_DIR = path.resolve("storage/mette-mds");

async function main() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error("MISTRAL_API_KEY is not set in .env");
    process.exit(1);
  }

  const client = new Mistral({ apiKey });

  if (!existsSync(PDF_DIR)) {
    console.error(`PDF directory not found: ${PDF_DIR}`);
    process.exit(1);
  }

  await mkdir(MD_DIR, { recursive: true });

  const files = (await readdir(PDF_DIR)).filter((f) =>
    f.toLowerCase().endsWith(".pdf")
  );

  if (files.length === 0) {
    console.log("No PDF files found in", PDF_DIR);
    return;
  }

  console.log(`Found ${files.length} PDFs in ${PDF_DIR}`);

  let skipped = 0;
  let processed = 0;

  for (let i = 0; i < files.length; i++) {
    const pdfFile = files[i];
    const baseName = pdfFile.replace(/\.pdf$/i, "");
    const mdPath = path.join(MD_DIR, `${baseName}.md`);

    if (existsSync(mdPath)) {
      skipped++;
      continue;
    }

    const pdfPath = path.join(PDF_DIR, pdfFile);
    const pdfBuffer = await readFile(pdfPath);
    const base64 = pdfBuffer.toString("base64");

    try {
      const result = await client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          documentUrl: `data:application/pdf;base64,${base64}`,
        },
      });

      const markdown = result.pages.map((p) => p.markdown).join("\n\n");
      await writeFile(mdPath, markdown, "utf-8");
      processed++;
      console.log(
        `[${i + 1}/${files.length}] ${pdfFile} → done (${result.pages.length} pages)`
      );
    } catch (err) {
      console.error(`[${i + 1}/${files.length}] ${pdfFile} → ERROR:`, err);
    }
  }

  console.log(
    `\nFinished. Processed: ${processed}, Skipped (already done): ${skipped}, Total: ${files.length}`
  );
}

main();
