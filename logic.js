let derniersResultats = [];
let derniersHubs = {};

function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'trent') init3D();
}

function lancerCalculs() {
    const R = parseFloat(document.getElementById('rayon').value);
    const decoupe = document.getElementById('decoupe').value; // 0.5 ou 0.583
    
    // Logique Kruschke 3V Icosaèdre
    // En 7/12 (0.583), on ajoute une rangée de triangles (ceinture)
    if (decoupe === "0.5") {
        derniersResultats = [
            { type: 'A', cf: 0.34862, qte: 30, color: 'Rouge' },
            { type: 'B', cf: 0.40355, qte: 40, color: 'Vert' },
            { type: 'C', cf: 0.41241, qte: 50, color: 'Bleu' }
        ];
        derniersHubs = { total: 61, h6: 25, h5: 6, h4: 15 };
    } else {
        // Correction pour le 7/12
        derniersResultats = [
            { type: 'A', cf: 0.34862, qte: 30, color: 'Rouge' },
            { type: 'B', cf: 0.40355, qte: 55, color: 'Vert' },
            { type: 'C', cf: 0.41241, qte: 80, color: 'Bleu' }
        ];
        derniersHubs = { total: 91, h6: 40, h5: 6, h4: 15 }; 
    }

    // Calcul des longueurs réelles
    derniersResultats.forEach(s => {
        s.longMM = (s.cf * R * 1000).toFixed(1);
        s.angle = (Math.acos(s.cf / 2) * (180 / Math.PI)).toFixed(2);
    });

    // Affichage des Hubs
    document.getElementById('resultats-hubs').innerHTML = `
        <div class="hub-info">
            <div><strong>Total Connecteurs:</strong> ${derniersHubs.total}</div>
            <div><strong>6-branches:</strong> ${derniersHubs.h6}</div>
            <div><strong>5-branches:</strong> ${derniersHubs.h5}</div>
            <div><strong>Base (4-branches):</strong> ${derniersHubs.h4}</div>
        </div>`;

    // Affichage du tableau
    let html = `<table><tr><th>Type</th><th>Couleur</th><th>Longueur (mm)</th><th>Qté</th><th>Angle de coupe</th></tr>`;
    derniersResultats.forEach(s => {
        html += `<tr><td>Strut ${s.type}</td><td style="color:${colorToHex(s.color)}">● ${s.color}</td><td><strong>${s.longMM}</strong></td><td>${s.qte}</td><td>${s.angle}°</td></tr>`;
    });
    html += `</table>`;
    
    document.getElementById('table-results').innerHTML = html;
    showTab('schema');
}

function colorToHex(c) {
    if(c === 'Rouge') return '#e74c3c';
    if(c === 'Vert') return '#2ecc71';
    return '#3498db';
}

function exporterCSV() {
    if (derniersResultats.length === 0) return alert("Calculez d'abord !");
    
    let csv = "Fiche de fabrication Dome Geodesique\n";
    csv += "Type;Couleur;Longueur_mm;Quantite;Angle\n";
    derniersResultats.forEach(r => {
        csv += `${r.type};${r.color};${r.longMM};${r.qte};${r.angle}\n`;
    });
    csv += `\nConnecteurs;Total;${derniersHubs.total}\n6-branches;${derniersHubs.h6}\n5-branches;${derniersHubs.h5}\nBase;${derniersHubs.h4}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Projet_Dome_7_12.csv");
    link.click();
}