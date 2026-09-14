// Netzwerk-Schrift: Echte Glyph-Fusion (Version 2)
let font;
let glyphCache = {}; // Speichert geparste Glyphen
let glyphPositions = {}; // Speichert die finalen Positionen der Glyphen
let trackSlider, connSlider, densSlider, flowSlider, noisSlider, brchSlider, lineSlider, continuousCheckbox;

let FONT_SIZE = 140;
let LINE_SPACING = 1.2;

let currentText = "netzwerk\nschrift";

// Globale Jitter-Funktion für die NOIS-Achse
let currentNois = 0;
let currentJitterMax = 0;
function applyJitter(val) {
    if (val === undefined || isNaN(val)) return val;
    if (currentNois === 0) return val;
    return val + (Math.random() - 0.5) * 2 * currentJitterMax;
}

function keyTyped() {
    // Wenn fokussiertes Element ein Input ist (z.B. Export Name), nicht hier tippen
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT')) {
        return;
    }
    if (!font) return;
    if (key.length === 1 && key !== 'Unidentified') {
        currentText += key;
        redraw();
    }
}

function keyPressed() {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT')) {
        return;
    }
    if (!font) return;
    if (keyCode === BACKSPACE) {
        if (currentText.length > 0) {
            currentText = currentText.substring(0, currentText.length - 1);
            redraw();
        }
    } else if (keyCode === ENTER) {
        currentText += '\n';
        redraw();
    }
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function setup() {
    const canvasContainer = document.getElementById('canvas-container');
    // Canvas so groß wie der verfügbare Platz (100% der Höhe, Rest der Breite)
    const canvas = createCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
    canvas.parent(canvasContainer);
    
    // UI-Elemente
    trackSlider = document.getElementById('track-slider');
    connSlider = document.getElementById('conn-slider');
    densSlider = document.getElementById('dens-slider');
    flowSlider = document.getElementById('flow-slider');
    noisSlider = document.getElementById('nois-slider');
    brchSlider = document.getElementById('brch-slider');
    const sizeSlider = document.getElementById('size-slider');
    lineSlider = document.getElementById('line-slider');
    continuousCheckbox = document.getElementById('continuous-checkbox');

    // Event-Listener
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
    brchSlider.addEventListener('input', () => {
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
    lineSlider.addEventListener('input', () => {
        LINE_SPACING = parseFloat(lineSlider.value);
        drawScene();
    });
    if (continuousCheckbox) {
        continuousCheckbox.addEventListener('change', drawScene);
    }

    // Drag & Drop Setup für Font-Dateien auf dem Canvas Container
    if (canvasContainer) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            canvasContainer.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        canvasContainer.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                handleFontFile(files[0]);
            }
        });
    }

    // Font File Input Event Listener
    const fontFileInput = document.getElementById('font-file');
    if (fontFileInput) {
        fontFileInput.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (f) handleFontFile(f);
            // Reset input value so selecting the same font again triggers change event
            e.target.value = '';
        });
    }

    // Initialen leeren Zustand (weißer Hintergrund + Helvetica Text) zeichnen
    drawScene();
}

function handleFontFile(f) {
    if (!f) return;
    const name = f.name || 'Local Font';
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const ab = evt.target.result;
            const parsed = opentype.parse(ab);
            font = parsed;
            glyphCache = {};
            glyphPositions = {};
            
            const nameEl = document.getElementById('font-name');
            if (nameEl) {
                nameEl.textContent = name;
            }
            console.log('✓ Font loaded successfully:', name);
            updateText();
        } catch (err) {
            console.error('Error parsing font:', err);
            showFontError('Error parsing font: ' + err.message);
        }
    };
    reader.onerror = function(err) {
        console.error('FileReader error:', err);
        showFontError('Error reading file');
    };
    reader.readAsArrayBuffer(f);
}

function windowResized() {
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        resizeCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
        drawScene();
    }
}

function showFontError(message) {
    background(255);
    fill(255, 0, 0);
    textAlign(CENTER, CENTER);
    textFont('Helvetica, Arial, sans-serif');
    textSize(16);
    text(message, width / 2, height / 2);
}

function draw() {
    drawScene();
    noLoop();
}

function updateText() {
    drawScene();
}

function drawScene() {
    randomSeed(42);
    background(255);
    const dropPrompt = document.getElementById('drop-prompt');
    if (!font) {
        if (dropPrompt) dropPrompt.style.display = 'block';
        return;
    }
    if (dropPrompt) dropPrompt.style.display = 'none';
    
    let text = currentText;
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

        let glyph;
        try {
            glyph = font.charToGlyph(char);
        } catch (e) {
            console.warn('Glyph not found for char:', char);
            continue;
        }

        if (!glyph || !glyph.advanceWidth) {
            cumulativeX += FONT_SIZE * 0.5 + TRACKING;
            continue;
        }

        const scale = FONT_SIZE / font.unitsPerEm;
        const advance = (glyph.advanceWidth * scale) + TRACKING;

        if (cumulativeX + advance > canvasWidth && cumulativeX > 0) {
            y += lineHeight;
            cumulativeX = 0;
        }

        const posX = cumulativeX + 20;
        const posY = y;
        
        let path;
        try {
            path = glyph.getPath(posX, posY, FONT_SIZE);
        } catch(e) {
            cumulativeX += advance;
            continue;
        }
        
        const cmds = path ? path.commands : [];
        
        const points = [];
        let lx, ly, startX, startY;
        cmds.forEach(cmd => {
            if (cmd.type === 'M') {
                lx = cmd.x; ly = cmd.y;
                startX = cmd.x; startY = cmd.y;
                points.push({x: cmd.x, y: cmd.y});
            } else if (cmd.type === 'Z') {
                if (lx !== undefined && startX !== undefined) {
                    const distPts = dist(lx, ly, startX, startY);
                    const steps = Math.max(1, Math.floor(distPts / 8)); // Dichtes Sampling: extra Punkte alle 8px
                    for (let s = 1; s < steps; s++) points.push({ x: lerp(lx, startX, s/steps), y: lerp(ly, startY, s/steps) });
                }
                lx = startX; ly = startY;
            } else if (cmd.x !== undefined && cmd.y !== undefined) {
                if (lx !== undefined) {
                    const distPts = dist(lx, ly, cmd.x, cmd.y);
                    const steps = Math.max(1, Math.floor(distPts / 8));
                    for (let s = 1; s < steps; s++) points.push({ x: lerp(lx, cmd.x, s/steps), y: lerp(ly, cmd.y, s/steps) });
                }
                points.push({x: cmd.x, y: cmd.y});
                lx = cmd.x; ly = cmd.y;
            }
        });

        let cx = posX + (glyph.advanceWidth * scale) / 2;
        let cy = posY - FONT_SIZE / 3;

        screenGlyphs.push({ char, posX, posY, cmds, points, cx, cy });
        cumulativeX += advance;
    }

    // 2. DAS NETZWERK ZEICHNEN (Innere Brücken)
    const isContinuous = continuousCheckbox ? continuousCheckbox.checked : true;

    if (CONN > 5) {
        // Strichstärke dynamisch über BRCH-Slider steuern (0.2px bis 6px)
        const BRCH = brchSlider && brchSlider.value ? parseInt(brchSlider.value) : 20;
        const currentStrokeWeight = map(BRCH, 0, 100, 0.2, 6.0);
        
        stroke(0);
        strokeWeight(currentStrokeWeight);
        noFill();
        
        // Passen maxBridgeDist für interne Verbindungen drastisch an
        const internalMaxBridgeDist = map(CONN, 0, 100, 0, FONT_SIZE * 0.3);
        
        if (isContinuous) {
            // --- ANSATZ 2: Endlos-Fäden ("Spinnen") ---
            for (let i = 0; i < screenGlyphs.length; i++) {
                const g = screenGlyphs[i];
                if (!g.points || g.points.length === 0) continue;
                
                // DENS steuert nun wie lang und wie viele Endlos-Fäden ("Spinnen") es gibt
                const numSpiders = Math.max(1, Math.floor(map(DENS, 0, 100, 1, 15)));
                const stepsPerSpider = Math.max(10, Math.floor(map(DENS, 0, 100, 10, 400)));
                
                for (let s = 0; s < numSpiders; s++) {
                    let currIdx = Math.floor(Math.random() * g.points.length);
                    
                    for (let step = 0; step < stepsPerSpider; step++) {
                        const p1 = g.points[currIdx];
                        
                        let candidates = [];
                        for (let n = 0; n < g.points.length; n++) {
                            if (n === currIdx) continue;
                            
                            let idxDist = Math.abs(n - currIdx);
                            let wrappedDist = g.points.length - idxDist;
                            if (Math.min(idxDist, wrappedDist) < 6) continue;
                            
                            const p2 = g.points[n];
                            const d = dist(p1.x, p1.y, p2.x, p2.y);
                            
                            if (d > 5 && d < internalMaxBridgeDist) {
                                candidates.push(n);
                            }
                        }
                        
                        if (candidates.length === 0) {
                            currIdx = Math.floor(Math.random() * g.points.length);
                            continue;
                        }
                        
                        let nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
                        const p2 = g.points[nextIdx];
                        const d = dist(p1.x, p1.y, p2.x, p2.y);
                        
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
                        
                        currIdx = nextIdx;
                    }
                }
            }
        } else {
            // --- ANSATZ 1: Unabhängige Einzellinien ---
            for (let i = 0; i < screenGlyphs.length; i++) {
                const g = screenGlyphs[i];
                for (let p1_idx = 0; p1_idx < g.points.length; p1_idx++) {
                    for (let p2_idx = p1_idx + 1; p2_idx < g.points.length; p2_idx++) {
                        const p1 = g.points[p1_idx];
                        const p2 = g.points[p2_idx];
                        const d = dist(p1.x, p1.y, p2.x, p2.y);
                        
                        if (d > 3 && d < internalMaxBridgeDist && Math.random() < densityFactor) {
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

    // Blinkender Schreib-Cursor am Ende des Textes
    if (Math.floor(millis() / 500) % 2 === 0) {
        stroke(0);
        strokeWeight(2);
        const cursorX = cumulativeX + 24;
        const cursorYTop = y - FONT_SIZE * 0.7;
        const cursorYBottom = y + FONT_SIZE * 0.1;
        line(cursorX, cursorYTop, cursorX, cursorYBottom);
    }

    pop();
}

function windowResized() {
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        resizeCanvas(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
        drawScene();
    }
}

// --- FONT EXPORT LOGIK ---
document.getElementById('export-btn').addEventListener('click', () => {
    if (!font) return;
    const btn = document.getElementById('export-btn');
    const oldText = btn.innerText;
    btn.innerText = "Processing... Please wait!";
    btn.disabled = true;

    // Timeout damit der Button-Text sich updatet
    setTimeout(() => {
        try {
            generateAndDownloadOTF();
        } catch(e) {
            console.error(e);
            alert("Export failed: " + e.message);
        }
        btn.innerText = oldText;
        btn.disabled = false;
    }, 100);
});

// Cubic bezier formel
function getBezierPoint(a, b, c, d, t) {
    const invT = 1 - t;
    return (Math.pow(invT, 3) * a) + 
           (3 * Math.pow(invT, 2) * t * b) + 
           (3 * invT * Math.pow(t, 2) * c) + 
           (Math.pow(t, 3) * d);
}

// Fügt ein dünnes Rechteck (als Linie) in einen Opentype-Pfad ein
function addThickLineToPath(path, x1, y1, x2, y2, thickness) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 0.1) return;
    const nx = (-dy / len) * (thickness / 2);
    const ny = (dx / len) * (thickness / 2);
    
    path.moveTo(x1 + nx, y1 + ny);
    path.lineTo(x2 + nx, y2 + ny);
    path.lineTo(x2 - nx, y2 - ny);
    path.lineTo(x1 - nx, y1 - ny);
    path.close();
}

function generateAndDownloadOTF() {
    const notdefGlyph = new opentype.Glyph({
        name: '.notdef', unicode: 0, advanceWidth: 650, path: new opentype.Path()
    });
    const newGlyphs = [notdefGlyph];

    // Standard-Zeichensatz zum Exportieren
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?-+ ";
    
    const CONN = parseInt(connSlider.value);
    const DENS = parseInt(densSlider.value);
    const BRCH = brchSlider && brchSlider.value ? parseInt(brchSlider.value) : 20;
    const NOIS = noisSlider && noisSlider.value ? parseInt(noisSlider.value) : 0;
    const FLOW = parseInt(flowSlider.value);
    const isContinuous = continuousCheckbox ? continuousCheckbox.checked : true;
    
    // Globale Variablen setzen
    currentNois = NOIS;
    currentJitterMax = NOIS > 0 ? map(NOIS, 0, 100, 0, 25) : 0;

    const maxBridgeDist = map(CONN, 0, 100, 0, FONT_SIZE * 0.3);
    const densityFactor = map(DENS, 0, 100, 0.0, 0.15);
    const scale = FONT_SIZE / font.unitsPerEm;
    const lineThicknessCanvas = map(BRCH, 0, 100, 0.2, 6.0); 
    const lineThicknessNet = lineThicknessCanvas / scale; // Native Einheiten

    for (let c = 0; c < charset.length; c++) {
        const char = charset[c];
        const origGlyph = font.charToGlyph(char);
        
        let newPath = new opentype.Path();
        
        // Wenn es ein Leerzeichen ist, belassen wir es dabei (oder andere leere Glyphs)
        if (char === ' ') {
            newGlyphs.push(new opentype.Glyph({
                name: char, unicode: char.charCodeAt(0), advanceWidth: origGlyph.advanceWidth, path: newPath
            }));
            continue;
        }

        // --- 1. Punkte sammeln (Genau so wie im Zeichnen) ---
        // Wir setzen posX = 0 und posY = FONT_SIZE (eine feste Baseline für die Berechnung)
        const posX = 0;
        const baselineY = FONT_SIZE;
        const drawingPath = origGlyph.getPath(posX, baselineY, FONT_SIZE);
        
        const points = [];
        let lx, ly, startX, startY;
        drawingPath.commands.forEach(cmd => {
            if (cmd.type === 'M') {
                lx = cmd.x; ly = cmd.y;
                startX = cmd.x; startY = cmd.y;
                points.push({x: cmd.x, y: cmd.y});
            } else if (cmd.type === 'Z') {
                if (lx !== undefined && startX !== undefined) {
                    const distPts = dist(lx, ly, startX, startY);
                    const steps = Math.max(1, Math.floor(distPts / 8));
                    for (let s = 1; s < steps; s++) points.push({ x: lerp(lx, startX, s/steps), y: lerp(ly, startY, s/steps) });
                }
                lx = startX; ly = startY;
            } else if (cmd.x !== undefined && cmd.y !== undefined) {
                if (lx !== undefined) {
                    const distPts = dist(lx, ly, cmd.x, cmd.y);
                    const steps = Math.max(1, Math.floor(distPts / 8));
                    for (let s = 1; s < steps; s++) points.push({ x: lerp(lx, cmd.x, s/steps), y: lerp(ly, cmd.y, s/steps) });
                }
                points.push({x: cmd.x, y: cmd.y});
                lx = cmd.x; ly = cmd.y;
            }
        });

        // Helfer-Funktion zum Umrechnen von Canvas (x,y) zurück zu Font-Einheiten (x,y)
        const toFontUnits = (cx, cy) => {
            return {
                x: (cx - posX) / scale,
                y: (baselineY - cy) / scale // Y ist in Fonts umgekehrt (unten->oben)
            };
        };

        // --- 2. Linien generieren und als Rechtecke zum newPath hinzufügen ---
        if (CONN > 5 && points.length > 0) {
            if (isContinuous) {
                const numSpiders = Math.max(1, Math.floor(map(DENS, 0, 100, 1, 15)));
                const stepsPerSpider = Math.max(10, Math.floor(map(DENS, 0, 100, 10, 400)));
                
                for (let s = 0; s < numSpiders; s++) {
                    let currIdx = Math.floor(Math.random() * points.length);
                    for (let step = 0; step < stepsPerSpider; step++) {
                        const p1 = points[currIdx];
                        let candidates = [];
                        for (let n = 0; n < points.length; n++) {
                            if (n === currIdx) continue;
                            let idxDist = Math.abs(n - currIdx);
                            let wrappedDist = points.length - idxDist;
                            if (Math.min(idxDist, wrappedDist) < 6) continue;
                            const p2 = points[n];
                            const d = dist(p1.x, p1.y, p2.x, p2.y);
                            if (d > 5 && d < maxBridgeDist) candidates.push(n);
                        }
                        
                        if (candidates.length === 0) {
                            currIdx = Math.floor(Math.random() * points.length);
                            continue;
                        }
                        
                        let nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
                        const p2 = points[nextIdx];
                        const d = dist(p1.x, p1.y, p2.x, p2.y);
                        
                        if (FLOW !== 0 || currentNois > 0) {
                            const sag = FLOW !== 0 ? map(FLOW, -100, 100, -d * 0.6, d * 0.6) : 0;
                            const c1x = lerp(p1.x, p2.x, 0.33);
                            const c1y = lerp(p1.y, p2.y, 0.33) + sag;
                            const c2x = lerp(p1.x, p2.x, 0.66);
                            const c2y = lerp(p1.y, p2.y, 0.66) + sag;
                            
                            // Bezier in kleine gerade Linien zerlegen
                            const bzSteps = 6;
                            let lastBX = p1.x, lastBY = p1.y;
                            for(let b=1; b<=bzSteps; b++) {
                                const t = b / bzSteps;
                                const bx = getBezierPoint(p1.x, applyJitter(c1x), applyJitter(c2x), p2.x, t);
                                const by = getBezierPoint(p1.y, applyJitter(c1y), applyJitter(c2y), p2.y, t);
                                const pStart = toFontUnits(lastBX, lastBY);
                                const pEnd = toFontUnits(bx, by);
                                addThickLineToPath(newPath, pStart.x, pStart.y, pEnd.x, pEnd.y, lineThicknessNet);
                                lastBX = bx; lastBY = by;
                            }
                        } else {
                            const pfOut1 = toFontUnits(p1.x, p1.y);
                            const pfOut2 = toFontUnits(p2.x, p2.y);
                            addThickLineToPath(newPath, pfOut1.x, pfOut1.y, pfOut2.x, pfOut2.y, lineThicknessNet);
                        }
                        currIdx = nextIdx;
                    }
                }
            } else {
                for (let p1_idx = 0; p1_idx < points.length; p1_idx++) {
                    for (let p2_idx = p1_idx + 1; p2_idx < points.length; p2_idx++) {
                        const p1 = points[p1_idx];
                        const p2 = points[p2_idx];
                        const d = dist(p1.x, p1.y, p2.x, p2.y);
                        
                        if (d > 3 && d < maxBridgeDist && Math.random() < densityFactor) {
                            if (FLOW !== 0 || currentNois > 0) {
                                const sag = FLOW !== 0 ? map(FLOW, -100, 100, -d * 0.6, d * 0.6) : 0;
                                const c1x = lerp(p1.x, p2.x, 0.33);
                                const c1y = lerp(p1.y, p2.y, 0.33) + sag;
                                const c2x = lerp(p1.x, p2.x, 0.66);
                                const c2y = lerp(p1.y, p2.y, 0.66) + sag;
                                
                                const bzSteps = 6;
                                let lastBX = p1.x, lastBY = p1.y;
                                for(let b=1; b<=bzSteps; b++) {
                                    const t = b / bzSteps;
                                    const bx = getBezierPoint(p1.x, applyJitter(c1x), applyJitter(c2x), p2.x, t);
                                    const by = getBezierPoint(p1.y, applyJitter(c1y), applyJitter(c2y), p2.y, t);
                                    const pStart = toFontUnits(lastBX, lastBY);
                                    const pEnd = toFontUnits(bx, by);
                                    addThickLineToPath(newPath, pStart.x, pStart.y, pEnd.x, pEnd.y, lineThicknessNet);
                                    lastBX = bx; lastBY = by;
                                }
                            } else {
                                const pfOut1 = toFontUnits(p1.x, p1.y);
                                const pfOut2 = toFontUnits(p2.x, p2.y);
                                addThickLineToPath(newPath, pfOut1.x, pfOut1.y, pfOut2.x, pfOut2.y, lineThicknessNet);
                            }
                        }
                    }
                }
            }
        }

        // Glyph erstellen und zur Liste hinzufügen
        const customGlyph = new opentype.Glyph({
            name: origGlyph.name || char,
            unicode: char.charCodeAt(0),
            advanceWidth: origGlyph.advanceWidth,
            path: newPath
        });
        newGlyphs.push(customGlyph);
    }

    // Die neue Font generieren
    const exportNameInput = document.getElementById('font-export-name');
    let customFontName = exportNameInput && exportNameInput.value.trim() !== '' ? exportNameInput.value.trim() : 'Shapeshifter';
    
    // Vermeide ungültige Zeichen im Dateinamen
    let safeFileName = customFontName.replace(/[^a-z0-9]/gi, '_');

    const networkFont = new opentype.Font({
        familyName: customFontName,
        styleName: 'Regular',
        unitsPerEm: font.unitsPerEm || 1000,
        ascender: font.ascender || 800,
        descender: font.descender || -200,
        glyphs: newGlyphs
    });

    // Font herunterladen
    networkFont.download(safeFileName + '.otf');
}
