# Schrift-Experiment: Netzwerk (Version 2)

Ein interaktives Experimentiersystem zur Erzeugung generativer Netzwerk-Schriften und Vektor-Glyphen-Fusion im Browser. 

Version 2 erweitert das Projekt um erweiterte Netzwerk-Verbindungen, animierbare Parameter-Slider, selektive Pfadfusionen und einen direkten **OTF-Font-Export**.

---

## 🚀 Kernfunktionen in Version 2

### 1. Interaktives Schreiben & Schrift-Import
* **Drag & Drop / Button-Load**: Laden eigener Schriftdateien (`.ttf`, `.otf`) per Drag & Drop auf das Canvas oder über den abgerundeten **„Load Font (TTF / OTF)“**-Button.
* **Direktes Tippen auf dem Canvas**: Text lässt sich wie in einem Texteditor direkt über die Tastatur schreiben (`Backspace`, `Enter`, Zeicheneingabe).
* **Blinkender Schreib-Cursor**: Erscheint erst, sobald eine Schriftart geladen ist.

### 2. Generative Parameter-Steuerung
Über die 250px breite Seitenleiste können alle Netzwerk-Eigenschaften in Echtzeit angepasst werden:

* **Size** (Schriftgröße): Skaliert die Glyphen auf dem Canvas.
* **Tracking** (Spationierung): Passt den horizontalen Zeichenabstand an.
* **Line Height** (Zeilenabstand): Steuert den vertikalen Zeilenabstand bei mehrzeiligem Text.
* **Connection Range (CONN)**: Maximale Distanz, in der Punkte zwischen Zeichen Verbindungsfäden spinnen.
* **Thread Density (DENS)**: Dichte der Punktabtastung entlang der Glyphen-Konturen.
* **Curve Gravity (FLOW)**: Biegt Verbindungsfäden nach oben oder unten (inkl. *Magnetic Snap* bei `0`).
* **Distortion (NOIS)**: Fügt organismische/zufällige Verformungen und Jitter hinzu.
* **Line Thickness (BRCH)**: Steuert die Strichstärke der Verbindungs-Fäden.
* **Continuous Threads (V2 Mode)**: Schaltet kontinuierliche Faden-Netzwerke zwischen aufeinanderfolgenden Zeichen frei.

### 3. Automated Slider Animations (Play/Pause)
Jeder Regler besitzt einen eigenen **Play/Pause (▶ / ⏸)**-Button. Damit lassen sich Parameter automatisiert durchlaufen, um dynamische Bewegungsmuster und fließende Schriftformen zu erzeugen.

### 4. OTF-Font Export
* **Echte Vektor-Fusion**: Über die Integration von `opentype.js` und `paper.js` werden die generierten Fäden und Glyphen in echte Vektorpfade konvertiert.
* **Dateiexport**: Generiert eine installierbare OpenType Font (`.otf`) mit anpassbarem Export-Namen.

---

## 🎨 Design & Benutzeroberfläche

* **Typografie**: Durchgehend in **Helvetica Regular** ohne Fett-Schnitte.
* **Farbkonzept**: Einheitlicher blauer Akzent (`#007aff`) für Buttons, Aktivitätszustände und Slider.
* **Formen**: Sanft abgerundetes Pillen-Design (`border-radius: 20px`) für Buttons und Eingabefelder.
* **Layout**: Aufgeräumte 250px-Steuerungsleiste links und dynamisches Canvas rechts.

---

## 📁 Projektstruktur

```
schrift/
├── index_v2.html     # Haupt-HTML-Oberfläche (Version 2)
├── sketch_v2.js       # p5.js & opentype.js Logik, Rendering und Export
├── index.html        # Version 1 (Referenz/Fallback)
├── sketch.js         # Skript für Version 1
├── fonts/            # Schriftarten-Verzeichnis
└── README.md         # Dokumentation
```

---

## 🛠️ Verwendung

1. **Datei öffnen**: Öffne `index_v2.html` in einem modernen Webbrowser (Chrome, Safari, Firefox).
2. **Font laden**: Ziehe eine `.ttf`- oder `.otf`-Schriftdatei auf den Bildschirm oder klicke auf **Load Font (TTF / OTF)**.
3. **Text eingeben**: Tippe direkt auf der Tastatur, um deinen Wunschtext einzugeben.
4. **Parameter variieren**: Nutze die Regler oder Play-Buttons zur Gestaltung des Netzwerks.
5. **Schrift exportieren**: Gib unter *Export Name* einen Namen ein und klicke auf **Export Font as OTF**, um die generierte Schriftart herunterzuladen.
