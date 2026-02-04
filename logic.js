const Logic = {
    // Couleurs distinctives pour les types A, B, C, D...
    typeColors: ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#7f8c8d', '#d35400'],

    getInputs() {
        return {
            poly: document.getElementById('polyhedron').value,
            freq: parseInt(document.getElementById('frequency').value),
            subdiv: document.getElementById('subdivision').value,
            cut: parseFloat(document.getElementById('sphere-cut').value),
            radius: parseFloat(document.getElementById('radius').value),
            conn: document.getElementById('connector').value,
            width: parseFloat(document.getElementById('beam-width').value),
            thick: parseFloat(document.getElementById('beam-thickness').value)
        };
    },

    // Calcul du dôme basé sur la géométrie réelle
    calculate() {
        const inp = this.getInputs();
        // Utilisation de la géométrie de base de Three.js pour la subdivision Classe I
        const geo = (inp.poly === 'icosahedron') ? 
            new THREE.IcosahedronGeometry(inp.radius, inp.freq) : 
            new THREE.OctahedronGeometry(inp.radius, inp.freq);

        const pos = geo.attributes.position;
        const threshold = -inp.radius * (2 * inp.cut - 1); // Calcul du plan de coupe
        
        const edges = new Map();
        const vertices = [];

        // Extraction des arêtes uniques au dessus de la coupe
        for (let i = 0; i < pos.count; i += 3) {
            for (let j = 0; j < 3; j++) {
                const v1 = new THREE.Vector3().fromBufferAttribute(pos, i + j);
                const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + (j + 1) % 3);

                if (v1.y >= threshold && v2.y >= threshold) {
                    const key = [v1.toArray().map(n => n.toFixed(4)).join(','), v2.toArray().map(n => n.toFixed(4)).join(',')].sort().join('|');
                    if (!edges.has(key)) {
                        edges.set(key, { v1, v2, len: v1.distanceTo(v2) });
                    }
                }
            }
        }

        // Tri des longueurs pour nomenclature A, B, C...
        const uniqueLens = Array.from(new Set(Array.from(edges.values()).map(e => e.len.toFixed(5)))).sort((a,b) => b-a);
        const nomenclature = {};
        let totalBeamLen = 0;

        edges.forEach(edge => {
            const typeIdx = uniqueLens.indexOf(edge.len.toFixed(5));
            const label = String.fromCharCode(65 + typeIdx);
            edge.label = label;
            edge.color = this.typeColors[typeIdx] || '#333';
            
            if (!nomenclature[label]) {
                nomenclature[label] = { len: edge.len, count: 0, color: edge.color };
            }
            nomenclature[label].count++;
            totalBeamLen += edge.len;
        });

        return { params: inp, edges: Array.from(edges.values()), nomenclature, totalBeamLen };
    }
};

function exportCSV() {
    const data = Logic.calculate();
    const p = data.params;
    
    // Formatage strict pour éviter les erreurs LibreOffice
    let csv = "\ufeffType;Longueur (mm);Quantite;Largeur;Epaisseur\n";
    for (let key in data.nomenclature) {
        const item = data.nomenclature[key];
        csv += `"${key}";"${(item.len * 1000).toFixed(2)}";"${item.count}";"${p.width}";"${p.thick}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Dome_${p.freq}V_${p.radius}m.csv`;
    link.click();
}