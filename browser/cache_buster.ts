export function rewriteWithRandomHash(code: string) {
  const newCode = code
    .replace(
      /(import|export)\s+(.*)\s+from\s+['"](\..*)['"]/gi,
      `$1 $2 from "$3?${Math.random()}"`
    )
    .replace(
      /import\s+['"](\..*)['"]/,
      // ts
      `import "$1?${Math.random()}"`
    );
  return newCode;
}
