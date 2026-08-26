# process2agent — Design Specification v2

## Aestetische Richtung: "Command Center"

Die App soll wirken wie eine Operationszentrale fuer Prozessanalyse: 
dunkel, praezise, datenreich, ruhig. Kein SaaS-Dashboard mit buntem 
Konfetti. Kein Dark Mode "weil es cool aussieht". Dunkel, weil der 
BPMN-Viewer und die Farbkodierung auf dunklem Hintergrund besser 
lesbar sind und die Aufmerksamkeit auf die Daten lenken.

Referenz-Aesthetik: Bloomberg Terminal trifft Figma -- funktionale 
Dichte mit typografischer Praezision.

---

## 1. Farbsystem

### Hintergruende (dunkel, abgestuft)

```css
:root {
  /* Basis-Hintergruende */
  --bg-base:        #0f1117;   /* App-Hintergrund, dunkelste Ebene */
  --bg-surface:     #171923;   /* Karten, Panels, Drawer */
  --bg-elevated:    #1e2130;   /* Hover-States, aktive Elemente */
  --bg-overlay:     #252838;   /* Modale, Tooltips */
  
  /* BPMN-Viewer Hintergrund */
  --bg-canvas:      #0d0f14;   /* Diagramm-Hintergrund, fast schwarz */
  
  /* Raender und Trennlinien */
  --border-subtle:  #2a2d3a;   /* Standard-Border */
  --border-active:  #3d4155;   /* Fokus, aktiver Zustand */
}
```

### Text (hell auf dunkel)

```css
:root {
  --text-primary:    #e8eaed;  /* Haupttext, Ueberschriften */
  --text-secondary:  #9ca3b4;  /* Zweittext, Labels, Metadaten */
  --text-muted:      #5c6478;  /* Deaktiviert, Platzhalter */
  --text-inverse:    #0f1117;  /* Text auf hellen Badges */
}
```

### Akzentfarben (sparsam, mit Bedeutung)

```css
:root {
  /* Primaer: Blau (Marke, aktive Elemente, Links) */
  --accent-primary:     #4e7cff;
  --accent-primary-dim: #4e7cff22;  /* Glow, Hintergrund-Tint */
  
  /* Semantische Farben (BPMN-Kodierung + Status) */
  --color-quick-win:    #34d399;  /* Gruen: Quick Wins, abgeschlossen */
  --color-potential:    #60a5fa;  /* Blau: Potenzial, Agent-unterstuetzt */
  --color-human:        #f59e0b;  /* Amber: Mensch bleibt im Loop */
  --color-risk:         #ef4444;  /* Rot: Risiko, Klaerungsbedarf */
  --color-system:       #a78bfa;  /* Violett: System/Integration */
  --color-neutral:      #6b7280;  /* Grau: nicht klassifiziert */
  
  /* Quick-Win/Potential/Human als Hintergrund-Tints */
  --tint-quick-win:     #34d39912;
  --tint-potential:     #60a5fa12;
  --tint-human:         #f59e0b12;
  --tint-risk:          #ef444412;
}
```

### Regel: Maximal 3 Farben gleichzeitig sichtbar

Die Semantik-Farben erscheinen nur im BPMN-Diagramm, in 
Status-Badges und in der Legende. Nie im Fliesstext, nie in 
Ueberschriften, nie in Buttons (ausser Primary). Das haelt 
die Oberflaeche ruhig.

### Skalen und Buttons (aktualisiert 2026-08-26)

```css
:root {
  /* Typografie-Skala (ersetzt ad-hoc Groessen) */
  --text-xs: 0.72rem;    /* Labels, Eyebrows, Badges */
  --text-sm: 0.85rem;    /* Sekundaertext, Metas, Buttons */
  --text-md: 0.95rem;    /* Fliesstext */
  --text-lg: 1.1rem;     /* Abschnittstitel */
  --text-xl: 1.35rem;    /* Seiten-/Prozesstitel */
  --text-2xl: 1.7rem;    /* Drawer-Titel */
  --text-display: clamp(1.75rem, 3vw, 2.25rem); /* Landing-Claim */

  /* Spacing-Skala */
  --space-1: 0.25rem;  --space-2: 0.5rem;
  --space-3: 0.75rem;  --space-4: 1rem;
  --space-5: 1.25rem;  --space-6: 1.5rem;
  --space-7: 2rem;     --space-8: 3rem;

  --r-btn: 8px;  /* Buttons: bewusst NICHT Pill (9999px) */
}
```

- Buttons: 8px-Radius, 36px/32px Hoehe, font-weight 600, keine
  Glow-Shadows; Hover nur ueber background/border-color
- Globaler Fokus-Ring: `:focus-visible { outline: 2px solid
  var(--accent-primary); outline-offset: 2px; }`
- Kontrast: `--text-muted` ist WCAG-AA-pflichtig (≥4.5:1 auf
  --bg-surface) und darf nicht wieder abgedunkelt werden
- Dark Canvas: bpmn-js-Defaults werden per CSS auf das Theme gemappt
  (`src/styles/assessment.css`, Block "Dark Canvas"); die Legende
  unter dem Diagramm erklaert die Farbkodierung
- App-Header im Assessment: sticky mitBackdrop-Blur

---

## 2. Typografie

### Font-Stack

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=DM+Sans:wght@400;500;700&display=swap');

:root {
  --font-body:  'DM Sans', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', ui-monospace, monospace;
}
```

### Hierarchie

```css
/* App-Titel (Dateiname im Header) */
.app-title {
  font-family: var(--font-body);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
}

/* Schritt-Name im Drawer */
.step-title {
  font-family: var(--font-body);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  color: var(--text-primary);
  line-height: 1.2;
}

/* Section Headers (1. WIE SOLL KI UNTERSTUETZEN?) */
.section-label {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* BPMN-Typ Badge */
.bpmn-type-badge {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
}

/* Metriken im Header */
.metric-value {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.metric-label {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
```

---

## 3. Layout-Aenderungen

### Header (kompakt, datenreich)

```
+------------------------------------------------------------------+
| PROCESS2AGENT                    [Anthropic: claude-sonnet-4-6]   |
| subprozess_launchvorbereitung.bpmn                                |
| 19 Schritte · 4 Lanes           [62%] [3 lokal] [5 offen]       |
+------------------------------------------------------------------+
```

- Logo/Name links: "PROCESS2AGENT" in Caps, 0.7rem, 
  letter-spacing 0.12em, color: var(--accent-primary)
- Dateiname darunter: 1.35rem, font-weight 700
- Metadaten-Zeile: "19 Schritte · 4 Lanes" in --text-secondary
- Rechts: Score-Badges als kompakte Kapseln, nicht als Karten

Score-Badges:

```css
.score-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
}

.score-badge .value {
  color: var(--color-quick-win);
}

.score-badge .label {
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 500;
}
```

### BPMN-Viewer (volle Breite, dunkler Canvas)

- Hintergrund: var(--bg-canvas)
- Keine weisse Box um das Diagramm
- Elemente farbkodiert nach Analyse:
  - Gruen-Rand + kleines Blitz-Icon: Quick Win
  - Blau-Rand + AI-Badge: Automatisierungspotenzial
  - Amber-Rand + Person-Icon: Mensch im Loop
  - Grau-Rand: nicht klassifiziert
- Legende unter dem Diagramm als horizontale Reihe 
  (farbiger Punkt + Label), dezent in --text-muted

### Element-Liste (untere Haelfte, Karten-Grid)

Statt horizontaler Scroll-Leiste: ein Grid mit kompakten 
Karten (3 Spalten auf Desktop). Jede Karte:

```
+---------------------------------------------+
| Artikelanlage in ERP                        |
| Administration / Stammdaten                 |
| [MCP/API] [Sachdaten] [Mittel]             |
| "Stammdaten- und ERP-nahe Schritte..."     |
+---------------------------------------------+
```

- Karte: var(--bg-surface), border: var(--border-subtle), 
  border-radius: 12px
- Linker Rand: 3px solid in Semantik-Farbe 
  (gruen/blau/amber/grau)
- Elementname: font-weight 600, --text-primary
- Lane: --text-secondary, font-size 0.8rem
- Badges (Pattern, Privacy, Complexity) als kleine Pills
- Rationale-Preview: --text-muted, max 2 Zeilen, truncated
- Hover: border-color wechselt zu --border-active, 
  leichter Schatten
- Klick oeffnet den Drawer

### Drawer (rechtes Panel)

- Breite: 480px (Desktop), 100% (Mobile)
- Hintergrund: var(--bg-surface)
- Border-left: 1px solid var(--border-subtle)
- Slide-in von rechts, 250ms ease-out
- Overlay auf BPMN: rgba(0, 0, 0, 0.5)
- Schliesst per X-Button oder Klick auf Overlay

Drawer-Inhalt von oben nach unten:

1. Lane-Name als Section-Label
2. Elementname als Step-Title
3. "Schritt X von Y" + BPMN-Type-Badge
4. Empfehlungs-Box (farbiger Rand links, 
   Hintergrund: passende Tint-Farbe)
5. Implementation Hint Box (border-left: 
   3px solid var(--accent-primary), bg: --accent-primary-dim)
6. Risk Box (border-left: 3px solid var(--color-risk), 
   bg: --tint-risk)
7. Pattern-Auswahl als Karten-Grid (2x2 oder 2x3)
8. Privacy + Complexity als Pill-Reihen
9. Zielsystem-Dropdown
10. Notiz-Textarea
11. Sticky Footer: Zurueck / Ueberspringen / Speichern

### Dashboard-Bereich (unter der Element-Liste)

Drei Karten nebeneinander nach der Analyse:

**Karte 1: Prozess-Insights**
- Donut-Chart (SVG) mit Segmenten: 
  Quick Win / Potenzial / Menschlich / Offen
- Gesamtzahl in der Mitte
- Legende rechts vom Chart

**Karte 2: Top 3 Quick Wins**
- Drei kompakte Eintraege mit Elementname, 
  Implementation Hint (1 Zeile), Complexity-Badge
- Kein Rationale, nur Aktion

**Karte 3: Klaerungsbedarf**
- Liste der offenen Punkte mit Grund 
  (Privacy offen, Pattern unklar, etc.)
- Klick oeffnet den Drawer fuer das Element

---

## 4. Interaktionen und Animationen

**Grundsatz (aktualisiert 2026-08-26):** Dezent und zweckhaft. Keine Count-Ups,
keine Stagger-Reveals, keine künstlichen Fortschrittsschritte — sie wirken
"vibe-coded" und verlangsamen die Nutzung. Was bleibt:

- Drawer-Slide-in (250ms cubic-bezier) und Overlay-Fade (200ms)
- Card-Enter (250ms, ohne Verzögerungsstaffelung)
- View-Wechsel (250ms Fade/Translate)
- `prefers-reduced-motion` schaltet alles auf near-zero

Der Analyse-Wartescreen zeigt nur echten Kontext („KI-Analyse läuft…", Anzahl
Schritte) — keine erfundenen Einzelschritte. Beim `provider: none` entfällt
der Screen vollständig.

```css
@keyframes card-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### BPMN-Element Hover

Beim Hover ueber ein Element im Diagramm: leichter Glow-Effekt 
in der Semantik-Farbe. Kein Tooltip (zu langsam), stattdessen 
wird die passende Karte im Grid dezent hervorgehoben (border 
wechselt zu --border-active).

---

## 5. Report-View Redesign

Der Report bleibt eine separate Vollbild-Ansicht, aber im 
gleichen Dark Theme:

- Weisser Report-Container auf dunklem Hintergrund 
  (wie aktuell, aber der aeussere Rahmen ist dunkel)
- ODER: Report komplett im Dark Theme (bessere Konsistenz, 
  aber schwerer druckbar)
- Empfehlung: Report-Container bleibt hell 
  (Druckfreundlichkeit > Konsistenz), aber die 
  Steuerungsleiste (Zurueck, Drucken) ist im Dark Theme

---

## 6. Was NICHT gebaut werden soll

- Keine Sidebar-Navigation (es gibt nur eine Page)
- Keine Tabs ueber dem BPMN (Heatmap, Dependencies etc. 
  existieren nicht)
- Kein Chatbot-Widget
- Kein "Live"-Badge oder Versionsnummer
- Keine erfundenen "AI Agents im Einsatz"
- Kein Avatar/Profilbild oben rechts

Jedes UI-Element, das auf eine Funktion zeigt, die nicht 
existiert, schadet der Glaubwuerdigkeit mehr als es der 
Aesthetik hilft. Die App soll beeindrucken durch das, 
was sie tatsaechlich tut, nicht durch Attrappen.

---

## 7. Zusammenfassung der Aenderungen

| Bereich | Aktuell | Neu |
|---|---|---|
| Theme | Hell (weiss/grau) | Dunkel (Command Center) |
| Header | Zwei Zeilen + Score-Pills | Kompakt, Mono-Metriken rechts |
| BPMN-Canvas | Weisse Box | Dunkler Canvas, farbkodiert |
| Element-Liste | Horizontaler Scroll | Grid-Karten (3-spaltig) |
| Interview-Panel | Fester 45%-Split | Drawer (Slide-in, 480px) |
| Pattern-Karten | Weisse Karten | Dunkle Karten mit Tint-Borders |
| Dashboard | Nicht vorhanden | 3 Karten unter Element-Grid |
| Typografie | Inter/System | DM Sans + JetBrains Mono |
| Animationen | Keine | Card-enter, Drawer-slide, Score-countup |

---

## 8. Implementierungsreihenfolge

1. **CSS-Variablen und Dark Theme**: Alle Farben umstellen, 
   Hintergruende, Texte, Borders. Das veraendert sofort 80% 
   der visuellen Wirkung.
2. **Typografie**: Fonts laden, Hierarchie anwenden.
3. **BPMN-Canvas dunkel**: bg-canvas, Marker-Farben anpassen.
4. **Element-Grid statt Scroll-Leiste**: Layout aendern.
5. **Dashboard-Karten**: Donut + Quick Wins + Klaerungsbedarf.
6. **Animationen**: Card-enter, Drawer-slide, Score-countup.
7. **Feinschliff**: Hover-States, Focus-States, 
   Border-Radien konsistent.
