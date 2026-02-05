// Configuration globale
const COLORS = ['#FF3B30', '#4CD964', '#007AFF', '#FFCC00', '#FF9500', '#5856D6', '#FF2D55', '#8E8E93', '#AF52DE'];
const LETTERS = "ABCDEFGHI".split("");
let domeData = { struts: [], v: 4, radius: 2, type: 'starhub' };

// Initialisation 3D
let scene, camera, renderer, controls, group;

function init3D() {
    const container = document.getElementById('threejs-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 4, 4);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    group = new THREE.Group();
    scene.add(group);

    animate();
}

function updateAll() {
    // Récupération des inputs
    const v = parseInt(document.getElementById('v-freq').value);
    const r = parseFloat(document.getElementById('radius').value);
    const fraction = parseFloat(document.getElementById('fraction').value);
    const type = document.querySelector('input[name="type"]:checked').value;
    
    domeData.v = v;
    domeData.radius = r;
    domeData.type = type;

    generateDome(v, r, fraction);
    renderAllTabs();
}

function generateDome(v, r, fraction) {
    group.clear();
    domeData.struts = [];
    
    // On utilise la géométrie de base de Three.js (Icosaèdre Classe I)
    const geometry = new THREE.IcosahedronGeometry(r, v);
    const pos = geometry.attributes.position;
    const limitY = -r * (2 * fraction - 1);

    const tempStruts = new Map();

    for (let i = 0; i < pos.count; i += 3) {
        const vArr = [
            new THREE.Vector3().fromBufferAttribute(pos, i),
            new THREE.Vector3().fromBufferAttribute(pos, i + 1),
            new THREE.Vector3().fromBufferAttribute(pos, i + 2)
        ];

        [[0,1], [1,2], [2,0]].forEach(pair => {
            const p1 = vArr[pair[0]];
            const p2 = vArr[pair[1]];

            if (p1.y >= limitY - 0.01 && p2.y >= limitY - 0.01) {
                const len = parseFloat(p1.distanceTo(p2).toFixed(5));
                const key = [p1.x+p1.y+p1.z, p2.x+p2.y+p2.z].sort().join('|');
                
                if (!tempStruts.has(key)) {
                    tempStruts.set(key, { len, p1: p1.clone(), p2: p2.clone() });
                }
            }
        });
    }

    // Classement par longueur
    const uniqueLens = Array.from(new Set(Array.from(tempStruts.values()).map(s => s.len))).sort((a,b) => a-b);
    
    tempStruts.forEach(s => {
        const typeIdx = uniqueLens.indexOf(s.len);
        const letter = LETTERS[typeIdx] || `Z${typeIdx}`;
        const color = COLORS[typeIdx % COLORS.length];
        
        // Calcul des angles (Krushke simplifié pour démo géométrique)
        const theta = 2 * Math.asin(s.len / (2 * r));
        const miter = (Math.atan(Math.tan(theta/2) / Math.cos(Math.PI/3)) * 180/Math.PI).toFixed(2);
        const bevel = (Math.asin(Math.sin(theta/2) / Math.sin(Math.PI/3)) * 180/Math.PI).toFixed(2);

        const strut = { letter, length: s.len, color, miter, bevel, p1: s.p1, p2: s.p2 };
        domeData.struts.push(strut);

        // Ajout 3D
        const mat = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
        const geo = new THREE.BufferGeometry().setFromPoints([s.p1, s.p2]);
        group.add(new THREE.Line(geo, mat));
    });
}

function renderAllTabs() {
    renderResults();
    renderDetails();
    renderSchema();
    renderAssemblyPlan();
}

function renderResults() {
    const totalLen = domeData.struts.reduce((a, b) => a + b.length, 0);
    const score = Math.min(5, Math.ceil(domeData.v / 1.5));
    
    document.getElementById('results-display').innerHTML = `
        <div class="card">
            <p><strong>Hauteur :</strong> ${(domeData.radius * 1.2).toFixed(2)} m</p>
            <p><strong>Surface au sol :</strong> ${(Math.PI * Math.pow(domeData.radius, 2)).toFixed(2)} m²</p>
            <p><strong>Nombre de Montants :</strong> ${domeData.struts.length}</p>
            <p><strong>Longueur Cumulée :</strong> ${totalLen.toFixed(2)} m</p>
            <p><strong>Score de Complexité :</strong> <span style="color:var(--accent)">'${score} sur 5'</span></p>
        </div>
    `;
}

function renderDetails() {
    const summary = getSummary();
    let html = `<table><tr><th>Type</th><th>Couleur</th><th>Longueur (m)</th><th>Qté</th><th>Miter (°)</th><th>Bevel (°)</th></tr>`;
    summary.forEach(s => {
        html += `<tr><td><strong>${s.letter}</strong></td><td style="background:${s.color}"></td>
                 <td>${s.length.toFixed(4)}</td><td>${s.count}</td><td>${s.miter}</td><td>${s.bevel}</td></tr>`;
    });
    html += `</table>`;
    document.getElementById('details-table').innerHTML = html;
}

function renderSchema() {
    const summary = getSummary();
    let html = '';
    summary.forEach(s => {
        html += `<div class="card">
            <svg width="100" height="40"><line x1="10" y1="20" x2="90" y2="20" stroke="${s.color}" stroke-width="5"/></svg>
            <p><strong>${s.letter}</strong> : ${s.length.toFixed(3)}m</p>
        </div>`;
    });
    document.getElementById('schema-grid').innerHTML = html;
}

function renderAssemblyPlan() {
    let html = `<h3>Plan de Montage Dynamique</h3><ol>`;
    html += `<li><strong>Préparation :</strong> Découper les ${domeData.struts.length} montants selon le tableau de l'onglet Détails.</li>`;
    html += `<li><strong>Tri :</strong> Regrouper les montants par couleur et lettre (A à ${LETTERS[getSummary().length-1]}).</li>`;
    html += `<li><strong>Base :</strong> Assembler le premier rang au sol en formant un cercle avec les montants de type le plus long.</li>`;
    html += `<li><strong>Élévation :</strong> Monter les triangles rang par rang en suivant la courbure donnée par les angles Bevel.</li></ol>`;
    document.getElementById('assembly-plan').innerHTML = html;
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
    let csv = "Lettre;Couleur;Longueur_m;Quantite;Miter_deg;Bevel_deg;Score_Complexite\n";
    const scoreStr = `'${Math.min(5, Math.ceil(domeData.v / 1.5))} sur 5'`;
    
    summary.forEach(s => {
        csv += `${s.letter};${s.color};${s.length.toFixed(4)};${s.count};${s.miter};${s.bevel};${scoreStr}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Geodome_Pro_Export.csv";
    link.click();
}

function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#main-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btn-' + id)?.classList.add('active');
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