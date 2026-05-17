export function buildSandboxPrompt(extractedText: string, stepName: string, pattern: string): string {
  return `Du bist ein KI-Experte für Prozessautomatisierung. Teste, ob ein LLM das folgende Dokument für den Schritt "${stepName}" korrekt verarbeiten kann.

Pattern: ${pattern}

Dokument-Inhalt:
"""
${extractedText.slice(0, 8000)}
"""

Analysiere das Dokument und extrahiere:
1. Die Hauptthemen/Kategorien
2. Beteiligte Personen/Organisationen (falls vorhanden)
3. Wichtige Daten/Zahlen (falls vorhanden)
4. Entscheidungen oder nächste Schritte (falls vorhanden)

Antworte NUR mit einem JSON-Objekt:
{
  "summary": "<kurze Zusammenfassung>",
  "entities": ["<Entität 1>", "<Entität 2>"],
  "confidence": 0.0-1.0,
  "recommendation": "<Empfehlung zur Nutzung>"
}

Kein Markdown, kein Text vor oder nach dem JSON.`;
}
