import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration Globale & État ---
const state = {
    v: 2,
    radius: 2,
    fraction: 0.5,
    classType: 1,
    typology: 'goodkarma',
    width: 120, // mm
    thickness: 40 // mm
};

let geometryData = {
    struts: [],
    faces: [],
    nodes: [],
    stats: {},
    strutTypes: []
};

// Couleurs par type de montant (A, B, C...)
const STRUT_COLORS = [
    0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xff924c, 0x4cff92, 0x4c92ff, 0xff4c92
];
const STRUT_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// --- Three.js Setup ---
let scene, camera, renderer, controls;
const container = document.getElementById('canvas-container');

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // Fond blanc demandé

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true }); // Alpha false pour fond blanc solide
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Éclairage amélioré pour fond blanc
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-10, -10, -5);
    scene.add(backLight);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// --- Moteur Mathématique Géodésique ---

const PHI = (1 + Math.sqrt(5)) / 2;

function calculateGeodesic() {
    // 1. Génération des sommets de base (Icosaèdre)
    const baseVerts = [
        [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
        [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
        [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
    ].map(v => new THREE.Vector3(...v).normalize());

    const baseFaces = [
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];

    let nodes = [];
    const getNodeIndex = (vec) => {
        for(let i=0; i<nodes.length; i++) {
            if(nodes[i].distanceTo(vec) < 0.0001) return i;
        }
        nodes.push(vec);
        return nodes.length - 1;
    };

    // 2. Tessellation (Subdivision)
    let rawFaces = []; // Stocke des triplets d'indices de noeuds

    baseFaces.forEach(faceIndices => {
        const vA = baseVerts[faceIndices[0]];
        const vB = baseVerts[faceIndices[1]];
        const vC = baseVerts[faceIndices[2]];
        
        // Grille de points sur la face
        let faceGrid = [];
        for (let i = 0; i <= state.v; i++) {
            faceGrid[i] = [];
            for (let j = 0; j <= state.v - i; j++) {
                 const vec = new THREE.Vector3()
                    .addScaledVector(vA, (state.v - i - j) / state.v)
                    .addScaledVector(vB, i / state.v)
                    .addScaledVector(vC, j / state.v)
                    .normalize()
                    .multiplyScalar(state.radius);
                faceGrid[i][j] = getNodeIndex(vec);
            }
        }

        // Création des faces triangulaires subdivisées
        for (let i = 0; i < state.v; i++) {
            for (let j = 0; j < state.v - i; j++) {
                // Triangle "debout"
                rawFaces.push([ faceGrid[i][j], faceGrid[i+1][j], faceGrid[i][j+1] ]);
                // Triangle "renversé" (si pas à la limite)
                if (j < state.v - i - 1) {
                    rawFaces.push([ faceGrid[i+1][j], faceGrid[i+1][j+1], faceGrid[i][j+1] ]);
                }
            }
        }
    });

    // 3. Filtrage selon la Fraction (Coupe)
    // Seuil de coupe (Cutoff Y)
    let maxY = -Infinity;
    nodes.forEach(n => { if(n.y > maxY) maxY = n.y; });
    
    // Déterminer le plan de coupe théorique
    // Pour 1/2, on coupe à ~0. Pour 3/8, on coupe plus haut.
    // Astuce: On cherche les "anneaux". Pour simplifier ici :
    let yThreshold = -Infinity;
    
    // Pour assurer une base plate et correcte :
    // On analyse la distribution des Y pour trouver les "niveaux"
    let yLevels = nodes.map(n => n.y).map(y => parseFloat(y.toFixed(3)));
    yLevels = [...new Set(yLevels)].sort((a,b) => a-b);
    
    // Logique simplifiée de sélection du niveau de base selon la fraction
    if (state.fraction <= 0.4) { // 3/8
        // On prend grossièrement les 40% supérieurs
        yThreshold = yLevels[Math.floor(yLevels.length * 0.4)]; 
    } else if (state.fraction <= 0.6) { // 1/2
        // Autour de 0, on cherche le niveau juste en dessous de 0 ou égal
        // Pour V pair, l'équateur est un niveau exact.
        // On fixe un seuil permissif pour inclure l'équateur (base plate)
        yThreshold = -0.01; 
        if(state.v % 2 !== 0) yThreshold = 0.1; // V impair, pas de base plate parfaite sans Krushke avancé, on coupe au-dessus
    } else { // 5/8
        yThreshold = -state.radius * 0.5;
    }

    // Filtrer les faces : une face est gardée si son centre est > seuil OU si tous ses points sont > seuil
    // Méthode stricte "Base plate" : on garde les faces dont les 3 sommets sont >= seuil (avec tolérance)
    let activeFaces = [];
    const TOLERANCE = 0.05; // Tolérance pour inclure les points limites

    rawFaces.forEach(tri => {
        const p1 = nodes[tri[0]];
        const p2 = nodes[tri[1]];
        const p3 = nodes[tri[2]];
        const centroidY = (p1.y + p2.y + p3.y) / 3;
        
        // Critère d'inclusion
        let keep = false;
        // Si les 3 points sont au dessus d'un seuil strict (ex: y > -0.1 pour hémisphère)
        // Pour inclure les struts de base, il faut que la face "pose" sur le sol ou soit au dessus.
        // Pour V2 1/2, la base est à Y ~ 0.
        // On utilise le yThreshold calculé plus haut.
        
        // Ajustement dynamique du threshold pour V2/V4 (base plate)
        let localThresh = yThreshold;
        if(state.v % 2 === 0 && Math.abs(state.fraction - 0.5) < 0.1) localThresh = -0.01;

        if (p1.y >= localThresh - TOLERANCE && p2.y >= localThresh - TOLERANCE && p3.y >= localThresh - TOLERANCE) {
            activeFaces.push(tri);
        }
    });

    // 4. Extraction des Struts Uniques à partir des faces actives
    let strutsMap = new Map(); // Key: "min-max", Value: {len, p1, p2, faces: []}
    
    activeFaces.forEach((tri, faceIdx) => {
        const edges = [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]];
        edges.forEach(edge => {
            const idx1 = Math.min(edge[0], edge[1]);
            const idx2 = Math.max(edge[0], edge[1]);
            const key = `${idx1}-${idx2}`;
            
            if(!strutsMap.has(key)) {
                strutsMap.set(key, {
                    key: key,
                    startIdx: idx1,
                    endIdx: idx2,
                    p1: nodes[idx1],
                    p2: nodes[idx2],
                    length: nodes[idx1].distanceTo(nodes[idx2]),
                    adjFaces: [] // Stocke les indices des faces adjacentes
                });
            }
            strutsMap.get(key).adjFaces.push(activeFaces[faceIdx]); // On stocke la face (triplet d'indices)
        });
    });

    // Conversion Map -> Array
    let finalStruts = Array.from(strutsMap.values());

    // 5. Classification des longueurs (A, B, C...)
    // Groupement (tolérance 1mm)
    let uniqueLengths = [];
    finalStruts.forEach(s => {
        let found = uniqueLengths.find(ul => Math.abs(ul - s.length) < 0.001);
        if (!found) uniqueLengths.push(s.length);
    });
    uniqueLengths.sort((a, b) => a - b); // Plus court au plus long

    // Assigner types
    finalStruts.forEach(s => {
        let typeIndex = uniqueLengths.findIndex(ul => Math.abs(ul - s.length) < 0.001);
        s.type = STRUT_LETTERS[typeIndex];
        s.color = STRUT_COLORS[typeIndex % STRUT_COLORS.length];
        s.typeIndex = typeIndex;
    });

    // 6. Calculs des Angles "Good Karma" (Miter & Bevel)
    let strutTypesData = uniqueLengths.map((len, i) => {
        return {
            id: STRUT_LETTERS[i],
            length: len,
            count: 0,
            color: STRUT_COLORS[i % STRUT_COLORS.length],
            miterAngle: 0,
            bevelAngle: 0
        };
    });

    finalStruts.forEach(s => {
        strutTypesData[s.typeIndex].count++;
        
        // Calcul Angles si pas encore fait pour ce type
        // On le fait une fois par type, sur une arête qui a 2 faces (pas bordure base) si possible
        // Si c'est une arête de base (1 seule face), le calcul est différent (souvent coupe droite ou angle sol)
        if (strutTypesData[s.typeIndex].miterAngle === 0 && s.adjFaces.length === 2) {
            
            // --- Calcul Bevel (Angle de lame) ---
            // Angle dièdre entre les deux faces
            const f1 = s.adjFaces[0];
            const f2 = s.adjFaces[1];
            
            const getNormal = (tri) => {
                const u = new THREE.Vector3().subVectors(nodes[tri[1]], nodes[tri[0]]);
                const v = new THREE.Vector3().subVectors(nodes[tri[2]], nodes[tri[0]]);
                return new THREE.Vector3().crossVectors(u, v).normalize();
            };
            
            const n1 = getNormal(f1);
            const n2 = getNormal(f2);
            
            // Angle entre normales. Dièdre = 180 - angle_normales (ou l'inverse selon orientation)
            // Dot product gives cos(theta)
            let dot = n1.dot(n2);
            // Clamp pour éviter erreurs float
            dot = Math.max(-1, Math.min(1, dot));
            const angleRad = Math.acos(dot);
            const angleDeg = THREE.MathUtils.radToDeg(angleRad);
            
            // Dans un dôme convexe, l'angle Dièdre intérieur est (180 - angleDeg).
            // Le Bevel (angle de lame par rapport à la verticale du bois) est angleDeg / 2.
            // Ex: Icosaèdre, dièdre ~138°. Angle entre normales ~41.8°. Bevel = 20.9°.
            const bevel = angleDeg / 2;
            strutTypesData[s.typeIndex].bevelAngle = bevel;

            // --- Calcul Miter (Angle de coupe en bout) ---
            // C'est l'angle du triangle de la face au coin correspondant.
            // On prend la première face f1. L'arête s est un côté.
            // Trouver le 3ème sommet de f1 qui n'est pas sur s
            const otherIdx = f1.find(idx => idx !== s.startIdx && idx !== s.endIdx);
            const pApex = nodes[otherIdx]; // Sommet opposé
            const pStart = nodes[s.startIdx];
            const pEnd = nodes[s.endIdx];
            
            // On calcule l'angle au sommet pStart (angle entre s et l'autre arête)
            const vecS = new THREE.Vector3().subVectors(pEnd, pStart).normalize(); // vecteur le long du strut
            const vecO = new THREE.Vector3().subVectors(pApex, pStart).normalize(); // vecteur vers l'autre sommet
            
            const angleCornerRad = vecS.angleTo(vecO);
            const angleCornerDeg = THREE.MathUtils.radToDeg(angleCornerRad);
            
            // Miter Angle (complémentaire pour coupe scie à onglet) : 90 - angleCorner
            const miter = 90 - angleCornerDeg; 
            strutTypesData[s.typeIndex].miterAngle = miter;
        }
    });

    // 7. Calculs Statistiques Finaux
    // Hauteur max réelle
    let realMaxY = -Infinity;
    let realMinY = Infinity;
    activeFaces.forEach(f => f.forEach(idx => {
        if(nodes[idx].y > realMaxY) realMaxY = nodes[idx].y;
        if(nodes[idx].y < realMinY) realMinY = nodes[idx].y;
    }));
    
    // Rayon au sol : rayon du cercle circonscrit aux points les plus bas
    // On prend un point du bas (p.ex realMinY)
    let groundPoints = nodes.filter(n => Math.abs(n.y - realMinY) < 0.05);
    let groundRadius = 0;
    if(groundPoints.length > 0) {
        // Distance horizontale au centre (0,0)
        groundRadius = Math.sqrt(groundPoints[0].x**2 + groundPoints[0].z**2);
    } else {
        groundRadius = state.radius; // Fallback
    }

    const height = realMaxY - realMinY;
    
    // Surface Sol = Pi * r_sol^2
    const surfaceSol = Math.PI * Math.pow(groundRadius, 2);
    
    // Surface Couverture = Somme des aires des faces actives
    let surfaceCouv = 0;
    activeFaces.forEach(tri => {
        const a = nodes[tri[0]];
        const b = nodes[tri[1]];
        const c = nodes[tri[2]];
        const ab = a.distanceTo(b);
        const bc = b.distanceTo(c);
        const ca = c.distanceTo(a);
        // Héron
        const s = (ab + bc + ca) / 2;
        surfaceCouv += Math.sqrt(s * (s - ab) * (s - bc) * (s - ca));
    });

    geometryData.struts = finalStruts;
    geometryData.faces = activeFaces;
    geometryData.strutTypes = strutTypesData;
    geometryData.stats = {
        height: height,
        radiusSol: groundRadius,
        surfaceSol: surfaceSol,
        surfaceCouv: surfaceCouv,
        countFaces: activeFaces.length,
        countStruts: finalStruts.length,
        totalLength: finalStruts.reduce((acc, s) => acc + s.length, 0)
    };
}

// --- Visualisation ---

function drawDome() {
    // Nettoyer la scène (garder les lumières)
    const toRemove = [];
    scene.traverse(child => {
        if (child.isMesh || child.isLine) toRemove.push(child);
    });
    toRemove.forEach(c => scene.remove(c));

    const materialData = { width: state.width / 1000, thickness: state.thickness / 1000 };

    geometryData.struts.forEach(strut => {
        const path = new THREE.Vector3().subVectors(strut.p2, strut.p1);
        const len = path.length();
        
        // Géométrie
        let geometry;
        if (state.typology === 'starhub') {
            geometry = new THREE.CylinderGeometry(materialData.width/2, materialData.width/2, len, 8);
        } else {
            // Good Karma : Box
            // Attention : BoxGeometry(width, height, depth)
            // On veut longueur = Y (ThreeJS standard pour cylindre/alignement)
            // Largeur (face visible) = state.width
            // Epaisseur (profondeur) = state.thickness
            geometry = new THREE.BoxGeometry(materialData.thickness, len, materialData.width);
        }

        const material = new THREE.MeshLambertMaterial({ color: strut.color });
        const mesh = new THREE.Mesh(geometry, material);

        // Position au milieu
        const center = new THREE.Vector3().addVectors(strut.p1, strut.p2).multiplyScalar(0.5);
        mesh.position.copy(center);
        
        // Orientation
        mesh.lookAt(strut.p2);
        mesh.rotateX(Math.PI / 2); // Aligner Y de la box avec le vecteur lookAt
        
        scene.add(mesh);
    });
    
    updateResultsUI();
    updateSchemaUI();
}

// --- Interface Utilisateur ---

function updateResultsUI() {
    const s = geometryData.stats;
    document.getElementById('res-hauteur').textContent = s.height.toFixed(3);
    document.getElementById('res-rayon').textContent = s.radiusSol.toFixed(3);
    document.getElementById('res-sol').textContent = s.surfaceSol.toFixed(2);
    document.getElementById('res-couv').textContent = s.surfaceCouv.toFixed(2);
    
    document.getElementById('res-faces').textContent = s.countFaces;
    document.getElementById('res-montants').textContent = s.countStruts;
    document.getElementById('res-total-len').textContent = s.totalLength.toFixed(2);

    // Tableau Résumé
    const tableContainer = document.getElementById('strut-list-table');
    let html = `<table class="result-table">
        <thead><tr><th>Type</th><th>Qté</th><th>Longueur (m)</th><th>Couleur</th></tr></thead>
        <tbody>`;
    
    geometryData.strutTypes.forEach(type => {
        html += `<tr>
            <td><b>${type.id}</b></td>
            <td>${type.count}</td>
            <td>${type.length.toFixed(4)}</td>
            <td style="background-color:#${type.color.toString(16).padStart(6, '0')};"></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
}

function updateSchemaUI() {
    const container = document.getElementById('schema-content');
    let html = `<div class="schema-list">`;
    
    geometryData.strutTypes.forEach(type => {
        const colorHex = `#${type.color.toString(16).padStart(6, '0')}`;
        html += `
        <div class="schema-item">
            <div class="schema-header" style="border-left: 5px solid ${colorHex}">
                <h3>Type ${type.id} <span style="font-size:0.8em; font-weight:normal;">(x${type.count})</span></h3>
            </div>
            <div class="schema-details">
                <div class="detail-row">
                    <span>Longueur : <strong>${(type.length * 1000).toFixed(1)} mm</strong></span>
                    <span>Largeur : ${state.width} mm</span>
                    <span>Épaisseur : ${state.thickness} mm</span>
                </div>
                <div class="angles-row">
                    <div class="angle-box">
                        <span class="angle-label">Angle Coupe (Miter)</span>
                        <span class="angle-value">${type.miterAngle.toFixed(1)}°</span>
                    </div>
                    <div class="angle-box">
                        <span class="angle-label">Angle Lame (Bevel)</span>
                        <span class="angle-value">${type.bevelAngle.toFixed(1)}°</span>
                    </div>
                </div>
                <div class="strut-viz-container">
                    <div class="strut-viz" style="background-color:${colorHex}; width: 100%;">
                        <span class="strut-viz-text">${type.id}</span>
                        <div class="cut-left" style="transform: skewX(-${type.miterAngle}deg)"></div>
                        <div class="cut-right" style="transform: skewX(${type.miterAngle}deg)"></div>
                    </div>
                </div>
            </div>
        </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// Gestion des onglets
document.querySelectorAll('.nav-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const targetId = e.target.getAttribute('data-target');
        
        if(targetId === 'parametres') {
            document.querySelector('.sidebar').classList.toggle('active-panel');
            // Force refresh 3D when coming back/toggling
            setTimeout(() => {
                onWindowResize();
            }, 100);
        } else {
            document.querySelectorAll('.view-panel').forEach(div => div.classList.add('hidden'));
            document.querySelectorAll('.view-panel').forEach(div => div.classList.remove('active'));
            
            let viewId = 'view-3d';
            if (targetId === 'schema') viewId = 'view-schema';
            if (targetId === 'details') viewId = 'view-details';
            if (targetId === 'resultats') viewId = 'view-resultats';
            
            const targetDiv = document.getElementById(viewId);
            if(targetDiv) {
                targetDiv.classList.remove('hidden');
                targetDiv.classList.add('active');
            }
        }
    });
});

// Listeners inputs
const inputIds = ['frequence', 'rayon', 'fraction', 'classe', 'largeur', 'epaisseur'];
inputIds.forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
        if(id === 'frequence') state.v = parseInt(e.target.value);
        if(id === 'rayon') state.radius = parseFloat(e.target.value);
        if(id === 'fraction') state.fraction = parseFloat(e.target.value);
        if(id === 'largeur') state.width = parseFloat(e.target.value);
        if(id === 'epaisseur') state.thickness = parseFloat(e.target.value);
        recalculateAll();
    });
});

document.querySelectorAll('input[name="typologie"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        state.typology = e.target.value;
        recalculateAll();
    });
});

// Export CSV corrigé (LibreOffice Friendly)
document.getElementById('btn-export').addEventListener('click', () => {
    // Séparateur ; pour compatibilité Excel FR / LibreOffice
    const sep = ";";
    const rows = [
        ["Type", "Quantite", "Longueur (mm)", "Miter (deg)", "Bevel (deg)", "Largeur (mm)", "Epaisseur (mm)"].join(sep)
    ];
    
    geometryData.strutTypes.forEach(t => {
        // Remplacement point par virgule pour formats FR si nécessaire, ou standard point.
        // On garde point pour compatibilité universelle, LibreOffice gère souvent les deux.
        rows.push([
            t.id, 
            t.count, 
            (t.length * 1000).toFixed(1), 
            t.miterAngle.toFixed(1),
            t.bevelAngle.toFixed(1),
            state.width, 
            state.thickness
        ].join(sep));
    });
    
    let csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "dome_goodkarma_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

function recalculateAll() {
    calculateGeodesic();
    drawDome();
}

initThree();
recalculateAll();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();