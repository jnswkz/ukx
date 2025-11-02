export async function jsonFileParser(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const parsed = await response.json();

  return Array.isArray(parsed) ? parsed : [parsed];
}