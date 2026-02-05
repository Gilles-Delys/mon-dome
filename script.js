import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration ---
const state = {
    v: 4, // PAR DÉFAUT 4V
    radius: 2,
    fraction: 0.5,
    width: 120, 
    thickness: 40,
    typology: 'goodkarma'
};

const STRUT_COLORS = [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xff924c];
const STRUT_LETTERS = "ABCDEFGHIJK";

let geometryData = { struts: [], stats: {} };

// --- Three.js ---
let scene, camera, renderer, controls;
const container = document.getElementById('canvas-container');

function initThree() {
    scene = new THREE.Scene();
    
    // Caméra
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(5, 5, 5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Contrôles
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lumières
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(10, 20, 10);
    scene.add(dir);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// --- Moteur Mathématique ---
const PHI = (1 + Math.sqrt(5)) / 2;

function calculateGeodesic() {
    // 1. Icosaèdre de base
    const baseVerts = [
        [-1,PHI,0], [1,PHI,0], [-1,-PHI,0], [1,-PHI,0],
        [0,-1,PHI], [0,1,PHI], [0,-1,-PHI], [0,1,-PHI],
        [PHI,0,-1], [PHI,0,1], [-PHI,0,-1], [-PHI,0,1]
    ].map(v => new THREE.Vector3(...v).normalize().multiplyScalar(state.radius));

    const baseFaces = [
        [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
        [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
        [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
        [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
    ];

    // 2. Subdivision (Tessellation)
    let nodes = [];
    const getNodeIndex = (v) => {
        for(let i=0; i<nodes.length; i++) {
            if(nodes[i].distanceTo(v) < 0.001) return i;
        }
        nodes.push(v);
        return nodes.length - 1;
    };

    let rawStruts = []; // Paires d'indices
    const addStrut = (i1, i2) => {
        const min = Math.min(i1, i2);
        const max = Math.max(i1, i2);
        rawStruts.push(`${min}-${max}`);
    };

    baseFaces.forEach(tri => {
        const vA = baseVerts[tri[0]];
        const vB = baseVerts[tri[1]];
        const vC = baseVerts[tri[2]];
        
        let faceNodes = [];
        // Création grille
        for(let i=0; i<=state.v; i++) {
            faceNodes[i] = [];
            for(let j=0; j<=state.v-i; j++) {
                const vec = new THREE.Vector3()
                    .addScaledVector(vA, (state.v - i - j) / state.v)
                    .addScaledVector(vB, i / state.v)
                    .addScaledVector(vC, j / state.v)
                    .normalize()
                    .multiplyScalar(state.radius);
                faceNodes[i][j] = getNodeIndex(vec);
            }
        }
        // Création liens
        for(let i=0; i<state.v; i++) {
            for(let j=0; j<state.v-i; j++) {
                addStrut(faceNodes[i][j], faceNodes[i][j+1]); // Horizontal
                if(i < state.v) addStrut(faceNodes[i][j], faceNodes[i+1][j]); // Diag 1
                if(j > 0) addStrut(faceNodes[i][j], faceNodes[i+1][j-1]); // Diag 2
            }
        }
    });

    // 3. Filtrage (Coupe)
    let uniqueStrutKeys = [...new Set(rawStruts)];
    let finalStruts = [];
    
    // Seuil de coupe
    let threshold = -state.radius;
    if(state.fraction >= 0.5) threshold = -0.1; // Hémisphère approx
    if(state.fraction < 0.5) threshold = state.radius * 0.2; // 3/8
    
    // Tolérance pour base plate
    if(state.v % 2 === 0 && Math.abs(state.fraction - 0.5) < 0.1) threshold = -0.05;

    uniqueStrutKeys.forEach(key => {
        const [idx1, idx2] = key.split('-').map(Number);
        const p1 = nodes[idx1];
        const p2 = nodes[idx2];
        
        // Si les deux points sont au-dessus du seuil
        if(p1.y > threshold && p2.y > threshold) {
            finalStruts.push({
                p1: p1,
                p2: p2,
                length: p1.distanceTo(p2)
            });
        }
    });

    // 4. Classification
    let lengths = finalStruts.map(s => s.length);
    let uniqueLengths = [];
    lengths.forEach(l => {
        if(!uniqueLengths.some(ul => Math.abs(ul - l) < 0.001)) uniqueLengths.push(l);
    });
    uniqueLengths.sort((a,b) => a-b);

    finalStruts.forEach(s => {
        let idx = uniqueLengths.findIndex(ul => Math.abs(ul - s.length) < 0.001);
        s.type = STRUT_LETTERS[idx] || "?";
        s.color = STRUT_COLORS[idx % STRUT_COLORS.length];
        s.typeIndex = idx;
    });

    // 5. Stats
    let typesData = uniqueLengths.map((l, i) => ({
        id: STRUT_LETTERS[i],
        length: l,
        color: STRUT_COLORS[i % STRUT_COLORS.length],
        count: finalStruts.filter(s => s.typeIndex === i).length
    }));

    geometryData.struts = finalStruts;
    geometryData.stats = {
        types: typesData,
        totalStruts: finalStruts.length,
        totalLength: finalStruts.reduce((acc, s) => acc + s.length, 0),
        height: Math.max(...finalStruts.map(s => s.p1.y)) - Math.min(...finalStruts.map(s => s.p1.y)),
        radius: state.radius
    };
}

function drawDome() {
    // Nettoyer
    while(scene.children.length > 0) { scene.remove(scene.children[0]); }
    
    // Relancer lumières
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(10, 20, 10);
    scene.add(dir);

    // Dessiner
    const matW = state.width / 1000;
    const matT = state.thickness / 1000;

    geometryData.struts.forEach(s => {
        const len = s.length;
        // Géométrie simple (Box)
        const geo = new THREE.BoxGeometry(matT, len, matW);
        const mat = new THREE.MeshLambertMaterial({ color: s.color });
        const mesh = new THREE.Mesh(geo, mat);
        
        // Position & Orientation
        const mid = new THREE.Vector3().addVectors(s.p1, s.p2).multiplyScalar(0.5);
        mesh.position.copy(mid);
        mesh.lookAt(s.p2);
        mesh.rotateX(Math.PI / 2); // Aligner Y
        
        scene.add(mesh);
    });

    updateUI();
}

function updateUI() {
    // Stats
    document.getElementById('res-montants').textContent = geometryData.stats.totalStruts;
    document.getElementById('res-total-len').textContent = geometryData.stats.totalLength.toFixed(2);
    document.getElementById('res-hauteur').textContent = (geometryData.stats.height || 0).toFixed(2);
    document.getElementById('res-rayon').textContent = state.radius;

    // Tableaux Résultats
    const tableDiv = document.getElementById('strut-list-table');
    let html = `<table><tr><th>Type</th><th>Qté</th><th>Longueur (m)</th><th>Couleur</th></tr>`;
    geometryData.stats.types.forEach(t => {
        html += `<tr>
            <td>${t.id}</td>
            <td>${t.count}</td>
            <td>${t.length.toFixed(4)}</td>
            <td style="background-color:#${t.color.toString(16).padStart(6,'0')}; width:20px;"></td>
        </tr>`;
    });
    html += `</table>`;
    tableDiv.innerHTML = html;

    // Schéma (Liste simple)
    const schemaDiv = document.getElementById('schema-content');
    let schemaHtml = '';
    geometryData.stats.types.forEach(t => {
        schemaHtml += `<div class="schema-item" style="border-left: 5px solid #${t.color.toString(16).padStart(6,'0')}">
            <strong>Type ${t.id}</strong> - Longueur: ${(t.length*1000).toFixed(1)} mm <br>
            Quantité: ${t.count}
        </div>`;
    });
    schemaDiv.innerHTML = schemaHtml;
}

// Events
const inputs = ['frequence', 'rayon', 'fraction', 'largeur', 'epaisseur'];
inputs.forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
        if(id === 'frequence') state.v = parseInt(e.target.value);
        if(id === 'rayon') state.radius = parseFloat(e.target.value);
        if(id === 'fraction') state.fraction = parseFloat(e.target.value);
        if(id === 'largeur') state.width = parseFloat(e.target.value);
        if(id === 'epaisseur') state.thickness = parseFloat(e.target.value);
        recalc();
    });
});

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const tgt = e.target.getAttribute('data-target');
        
        if(tgt === 'parametres') {
            document.querySelector('.sidebar').classList.toggle('active-panel');
        } else {
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
            
            let vid = 'view-3d';
            if(tgt === 'schema') vid = 'view-schema';
            if(tgt === 'details') vid = 'view-details';
            if(tgt === 'resultats') vid = 'view-resultats';
            
            const v = document.getElementById(vid);
            if(v) { v.classList.remove('hidden'); v.classList.add('active'); }
        }
    });
});

document.getElementById('btn-export').addEventListener('click', () => {
    let rows = [["Type", "Quantite", "Longueur(m)"]];
    geometryData.stats.types.forEach(t => {
        rows.push([t.id, t.count, t.length.toFixed(4)]);
    });
    let csv = "data:text/csv;charset=utf-8," + rows.map(e => e.join(";")).join("\n");
    let link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "dome_export.csv";
    link.click();
});

function recalc() {
    calculateGeodesic();
    drawDome();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

initThree();
recalc();
animate();