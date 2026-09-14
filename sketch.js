// Netzwerk-Schrift: Echte Glyph-Fusion
let font;
let glyphCache = {}; // Speichert geparste Glyphen
let glyphPositions = {}; // Speichert die finalen Positionen der Glyphen
let textInput, trackSlider, connSlider, densSlider, flowSlider, noisSlider, brchSlider, lineSlider;

let FONT_SIZE = 140;
let LINE_SPACING = 1.2;
const FONT_URL = 'fonts/NeueSchriftVF.ttf';

// DOM elements for font input/status (initialized in setup)
let fontFileInput;
let fontNameEl;
let fontSelect;

// small registry of loaded fonts: {id, name, font}
let loadedFonts = [];
let activeFontId = null;

// Globale Jitter-Funktion für die NOIS-Achse
let currentNois = 0;
let currentJitterMax = 0;
function applyJitter(val) {
    if (val === undefined || isNaN(val)) return val;
    if (currentNois === 0) return val;
    return val + (Math.random() - 0.5) * 2 * currentJitterMax;
}

function setup() {
    const canvasContainer = document.getElementById('canvas-container');
    // Canvas so groß wie der verfügbare Platz (100% der Höhe, Rest der Breite)
    const canvas = createCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
    canvas.parent(canvasContainer);
    
    // UI-Elemente
    textInput = document.getElementById('text-input');
    trackSlider = document.getElementById('track-slider');
    connSlider = document.getElementById('conn-slider');
    densSlider = document.getElementById('dens-slider');
    flowSlider = document.getElementById('flow-slider');
    noisSlider = document.getElementById('nois-slider');
    brchSlider = document.getElementById('brch-slider');
    const sizeSlider = document.getElementById('size-slider');
    lineSlider = document.getElementById('line-slider');

    // Event-Listener
    textInput.addEventListener('input', updateText);
    sizeSlider.addEventListener('input', () => {
        FONT_SIZE = parseInt(sizeSlider.value);
        drawScene();
    });
    trackSlider.addEventListener('input', () => {
        drawScene();
    });
    connSlider.addEventListener('input', () => {
        drawScene();
    });
    densSlider.addEventListener('input', () => {
        drawScene();
    });
    flowSlider.addEventListener('input', (e) => {
        // "Magnetic Snap": Rastet bei 0 (Mitte) ein, wenn man in der Nähe ist
        if (Math.abs(e.target.value) < 10) {
            e.target.value = 0;
        }
        drawScene();
    });
    noisSlider.addEventListener('input', () => {
        drawScene();
    });
    brchSlider.addEventListener('input', () => {
        drawScene();
    });
    lineSlider.addEventListener('input', () => {
        LINE_SPACING = parseFloat(lineSlider.value);
        drawScene();
    });

    // Font file UI
    fontFileInput = document.getElementById('font-file');
    fontNameEl = document.getElementById('font-name');
    if (fontFileInput) {
        fontFileInput.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const name = f.name || 'local-font';
            // create an id
            const id = 'local-' + Date.now();
            fontNameEl.textContent = name;
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const ab = evt.target.result;
                    const parsed = opentype.parse(ab);
                    // register and activate
                    loadedFonts.push({id, name, font: parsed});
                    setActiveFontById(id);
                    populateFontSelect();
                    console.log('✓ Lokale Schrift geladen:', name);
                    updateText();
                } catch (err) {
                    console.error('Fehler beim Parsen der lokalen Schrift:', err);
                    showFontError('Fehler beim Parsen der lokalen Schrift: ' + err.message);
                }
            };
            reader.onerror = function(err) {
                console.error('FileReader error:', err);
                showFontError('Fehler beim Einlesen der Datei');
            };
            // Read as ArrayBuffer so opentype.js can parse it
            reader.readAsArrayBuffer(f);
        });
    }

    // font select element
    fontSelect = document.getElementById('font-select');
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            const id = e.target.value;
            setActiveFontById(id);
            updateText();
        });
    }

    // Lade Font
    console.log('Lade Font...');
    fetch(FONT_URL)
        .then(r => {
            console.log('Fetch response:', r.status, r.statusText);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.arrayBuffer();
        })
        .then(buf => {
            console.log('Buffer size:', buf.byteLength, 'bytes');
            try {
                const parsedFont = opentype.parse(buf);
                console.log('✓ Font erfolgreich geladen und geparst');
                
                // register default font
                const defaultId = 'default';
                const defaultName = 'Standard (NeueSchriftVF.ttf)';
                loadedFonts.push({id: defaultId, name: defaultName, font: parsedFont});
                setActiveFontById(defaultId);
                populateFontSelect();
                updateText();

            } catch (parseErr) {
                throw new Error('Font parsing failed: ' + parseErr.message);
            }
        })
        .catch(e => {
            console.error('Font loading error:', e.message, e);
            showFontError('Font Fehler: ' + e.message);
        });
}

function showFontError(message) {
    background(34);
    fill(255, 100, 100);
    textAlign(LEFT, TOP);
    textSize(14);
    text(message, 20, 20);
    fill(200);
    textSize(12);
    text('Überprüfe die Browser-Konsole (F12) für Details', 20, 60);
}

function updateText() {
    if (!font) return;
    drawScene();
}

function drawScene() {
    background(255);
    if (!font) return;
    
    let text = textInput.value;
    if (!text) return;

    push();

    const canvasWidth = width - 40;
    const lineHeight = FONT_SIZE * LINE_SPACING;
    const CONN = parseInt(connSlider.value);
    const DENS = parseInt(densSlider.value);
    const TRACKING = parseInt(trackSlider.value);
    const FLOW = parseInt(flowSlider.value);
    const NOIS = noisSlider && noisSlider.value ? parseInt(noisSlider.value) : 0;
    
    currentNois = NOIS;
    currentJitterMax = NOIS > 0 ? map(NOIS, 0, 100, 0, 25) : 0;

    const maxBridgeDist = map(CONN, 0, 100, 0, FONT_SIZE * 1.5);
    const densityFactor = map(DENS, 0, 100, 0.0, 0.15);

    let y = FONT_SIZE;
    let cumulativeX = 0;
    let screenGlyphs = [];

    // 1. POSITIONEN UND PUNKTE BERECHNEN
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\n') {
            y += lineHeight;
            cumulativeX = 0;
            continue;
        }

        const glyph = font.charToGlyph(char);
        const scale = FONT_SIZE / font.unitsPerEm;
        const advance = (glyph.advanceWidth * scale) + TRACKING;

        if (cumulativeX + advance > canvasWidth && cumulativeX > 0) {
            y += lineHeight;
            cumulativeX = 0;
        }

        const posX = cumulativeX + 20;
        const posY = y;
        
        const path = glyph.getPath(posX, posY, FONT_SIZE);
        const cmds = path.commands;
        
        const points = [];
        cmds.forEach(cmd => {
            if (cmd.x !== undefined && cmd.y !== undefined) {
                points.push({x: cmd.x, y: cmd.y});
            }
        });

        let cx = posX + (glyph.advanceWidth * scale) / 2;
        let cy = posY - FONT_SIZE / 3;

        screenGlyphs.push({ char, posX, posY, cmds, points, cx, cy });
        cumulativeX += advance;
    }

    // 2. DAS NETZWERK ZEICHNEN (Verbindungen zwischen allen Punkten!)
    if (CONN > 5) {
        const BRCH = brchSlider && brchSlider.value ? parseInt(brchSlider.value) : 20;
        stroke(0);
        strokeWeight(map(BRCH, 0, 100, 0.2, 6.0));
        noFill();
        
        for (let i = 0; i < screenGlyphs.length; i++) {
            for (let j = i + 1; j < screenGlyphs.length; j++) {
                const g1 = screenGlyphs[i];
                const g2 = screenGlyphs[j];
                const distCenter = dist(g1.cx, g1.cy, g2.cx, g2.cy);
                
                if (distCenter < FONT_SIZE * 2.5) {
                    for (let p1 of g1.points) {
                        for (let p2 of g2.points) {
                            const d = dist(p1.x, p1.y, p2.x, p2.y);
                            if (d < maxBridgeDist && Math.random() < densityFactor) {
                                if (FLOW !== 0 || currentNois > 0) {
                                    const sag = FLOW !== 0 ? map(FLOW, -100, 100, -d * 0.6, d * 0.6) : 0;
                                    const c1x = lerp(p1.x, p2.x, 0.33);
                                    const c1y = lerp(p1.y, p2.y, 0.33) + sag;
                                    const c2x = lerp(p1.x, p2.x, 0.66);
                                    const c2y = lerp(p1.y, p2.y, 0.66) + sag;
                                    bezier(p1.x, p1.y, applyJitter(c1x), applyJitter(c1y), applyJitter(c2x), applyJitter(c2y), p2.x, p2.y);
                                } else {
                                    line(p1.x, p1.y, p2.x, p2.y);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. DIE BUCHSTABEN ZEICHNEN (als Wireframe/Outlines)
    stroke(0);
    strokeWeight(1.5);
    noFill(); // Die Linien gehen nun transparent DURCH die Buchstaben (Netzwerk-Look)
    
    screenGlyphs.forEach(sg => {
        let drawing = false;
        sg.cmds.forEach(cmd => {
            if (cmd.type === 'M') {
                if (drawing) endShape();
                beginShape();
                vertex(cmd.x, cmd.y);
                drawing = true;
            } else if (cmd.type === 'L') {
                vertex(cmd.x, cmd.y);
            } else if (cmd.type === 'C') {
                bezierVertex(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
            } else if (cmd.type === 'Q') {
                quadraticVertex(cmd.x1, cmd.y1, cmd.x, cmd.y);
            } else if (cmd.type === 'Z') {
                endShape(CLOSE);
                drawing = false;
            }
        });
        if (drawing) endShape();
    });

    pop();
}

function windowResized() {
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        resizeCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
        drawScene();
    }
}

// --- Helper functions for font selection ---
function populateFontSelect() {
    if (!fontSelect) return;
    // clear
    fontSelect.innerHTML = '';
    loadedFonts.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name || f.id;
        if (f.id === activeFontId) opt.selected = true;
        fontSelect.appendChild(opt);
    });
}

function setActiveFontById(id) {
    const found = loadedFonts.find(f => f.id === id);
    if (!found) return;
    font = found.font;
    glyphCache = {};
    glyphPositions = {};
    activeFontId = id;
    if (fontNameEl) {
        fontNameEl.textContent = found.name;
    }
}