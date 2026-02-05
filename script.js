const COLORS = ['#FF3B30', '#4CD964', '#007AFF', '#FFCC00', '#FF9500', '#5856D6', '#FF2D55', '#8E8E93', '#AF52DE'];
const LETTERS = "ABCDEFGHI".split("");
let scene, camera, renderer, controls, group;
let domeData = { struts: [], v: 4, radius: 2 };

// 1. INITIALISATION 3D
function init3D() {
    const container = document.getElementById('threejs-canvas');
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(3, 3, 3);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    group = new THREE.Group();
    scene.add(group);

    animate();
}

// 2. RÉINITIALISATION ET RAFRAÎCHISSEMENT
function resetAndShow(tabId) {
    // Réinitialise les valeurs par défaut
    document.getElementById('v-freq').value = "4";
    document.getElementById('radius').value = "2";
    document.getElementById('fraction').value = "0.625";
    document.getElementById('width-mm').value = "120";
    document.getElementById('thickness-mm').value = "40";
    
    updateAll();
    showTab(tabId);
}

function updateAll() {
    const v = parseInt(document.getElementById('v-freq').value);
    const r = parseFloat(document.getElementById('radius').value);
    const fraction = parseFloat(document.getElementById('fraction').value);
    const type = document.querySelector('input[name="type"]:checked').value;

    group.clear();
    domeData.struts = [];

    // GÉOMÉTRIE CLASSE I
    const geo = new THREE.IcosahedronGeometry(r, v);
    const pos = geo.attributes.position;
    const limitY = -r * (2 * fraction - 1); // Calcul de la coupe

    const tempStruts = new Map();

    for (let i = 0; i < pos.count; i += 3) {
        const v1 = new THREE.Vector3().fromBufferAttribute(pos, i);
        const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
        const v3 = new THREE.Vector3().fromBufferAttribute(pos, i + 2);

        [[v1, v2], [v2, v3], [v3, v1]].forEach(edge => {
            // Tolérance de 0.05 pour inclure la base
            if (edge[0].y >= limitY - 0.05 && edge[1].y >= limitY - 0.05) {
                const len = parseFloat(edge[0].distanceTo(edge[1]).toFixed(5));
                const key = [edge[0].x+edge[0].y+edge[0].z, edge[1].x+edge[1].y+edge[1].z].sort().join('|');
                if (!tempStruts.has(key)) {
                    tempStruts.set(key, { len, p1: edge[0].clone(), p2: edge[1].clone() });
                }
            }
        });
    }

    const uniqueLens = Array.from(new Set(Array.from(tempStruts.values()).map(s => s.len))).sort((a,b) => a-b);
    
    tempStruts.forEach(s => {
        const typeIdx = uniqueLens.indexOf(s.len);
        const letter = LETTERS[typeIdx] || `Z${typeIdx}`;
        const color = COLORS[typeIdx % COLORS.length];
        
        // Calculs Krushke / Star-Hub / Fuller
        const theta = 2 * Math.asin(s.len / (2 * r));
        let miter = (Math.atan(Math.tan(theta/2) / Math.cos(Math.PI/3)) * 180/Math.PI).toFixed(2);
        let bevel = (Math.asin(Math.sin(theta/2) / Math.sin(Math.PI/3)) * 180/Math.PI).toFixed(2);

        domeData.struts.push({ letter, length: s.len, color, miter, bevel });

        const mat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
        const lineGeo = new THREE.BufferGeometry().setFromPoints([s.p1, s.p2]);
        group.add(new THREE.Line(lineGeo, mat));
    });

    renderTabs();
}

function renderTabs() {
    // Onglet Résultats
    const totalM = domeData.struts.reduce((acc, s) => acc + s.length, 0).toFixed(2);
    const scoreVal = Math.min(5, Math.ceil(domeData.struts.length / 50));
    document.getElementById('results-output').innerHTML = `
        <p><strong>Hauteur au sol :</strong> ${ (parseFloat(document.getElementById('radius').value) * (1.2)).toFixed(2) } m</p>
        <p><strong>Rayon au sol :</strong> ${ document.getElementById('radius').value } m</p>
        <p><strong>Surface au sol :</strong> ${ (Math.PI * Math.pow(document.getElementById('radius').value, 2)).toFixed(2) } m²</p>
        <h3>Quantités</h3>
        <p><strong>Montants :</strong> ${domeData.struts.length}</p>
        <p><strong>Dimensions (Total) :</strong> ${totalM} m</p>
        <p><strong>Score :</strong> <span class="score-format">'${scoreVal} sur 5'</span></p>
    `;

    // Onglet Détails
    const summary = getSummary();
    let detailHtml = `<table><tr><th>Type</th><th>Longueur (m)</th><th>Qté</th><th>Miter (°)</th><th>Bevel (°)</th></tr>`;
    summary.forEach(s => {
        detailHtml += `<tr><td><b style="color:${s.color}">${s.letter}</b></td><td>${s.length.toFixed(4)}</td><td>${s.count}</td><td>${s.miter}</td><td>${s.bevel}</td></tr>`;
    });
    document.getElementById('details-output').innerHTML = detailHtml + `</table>`;

    // Onglet Schéma
    let schemaHtml = `<div style="display:flex; gap:20px; flex-wrap:wrap;">`;
    summary.forEach(s => {
        schemaHtml += `<div style="border:1px solid #ddd; padding:10px; border-radius:8px; text-align:center;">
            <svg width="80" height="30"><line x1="5" y1="15" x2="75" y2="15" stroke="${s.color}" stroke-width="6" /></svg>
            <p><b>${s.letter}</b><br>${s.length.toFixed(3)}m</p>
        </div>`;
    });
    document.getElementById('schema-output').innerHTML = schemaHtml + `</div>`;
}

function getSummary() {
    const map = new Map();
    domeData.struts.forEach(s => {
        if(!map.has(s.letter)) map.set(s.letter, {...s, count: 0});
        map.get(s.letter).count++;
    });
    return Array.from(map.values()).sort((a,b) => a.letter.localeCompare(b.letter));
}

function exportCSV() {
    const summary = getSummary();
    const scoreVal = Math.min(5, Math.ceil(domeData.struts.length / 50));
    let csv = "Lettre;Longueur_m;Quantite;Miter_deg;Bevel_deg;Score_LibreOffice\n";
    summary.forEach(s => {
        csv += `${s.letter};${s.length.toFixed(4)};${s.count};${s.miter};${s.bevel};'${scoreVal} sur 5'\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Dome_Geodesique.csv'; a.click();
}

function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#main-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
    if(id === 'parametres') onWindowResize();
}

function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
function onWindowResize() {
    const container = document.getElementById('threejs-canvas');
    if(!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

window.onload = () => { init3D(); updateAll(); window.addEventListener('resize', onWindowResize); };