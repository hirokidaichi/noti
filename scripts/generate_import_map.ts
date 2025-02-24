const DENO_JSON_PATH = './deno.json';
const IMPORT_MAP_PATH = './import_map.json';

async function generateImportMap() {
  try {
    const denoJsonText = await Deno.readTextFile(DENO_JSON_PATH);
    const denoJson = JSON.parse(denoJsonText);

    if (!denoJson.imports) {
      console.error('imports section not found in deno.json');
      Deno.exit(1);
    }

    const importMap = {
      imports: denoJson.imports,
    };

    await Deno.writeTextFile(
      IMPORT_MAP_PATH,
      JSON.stringify(importMap, null, 2) + '\n',
    );

    console.log('Successfully generated import_map.json');
  } catch (error) {
    console.error('Error generating import_map.json:', error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await generateImportMap();
}
