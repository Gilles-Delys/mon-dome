// Variable globale pour stocker les derniers calculs
let derniersResultats = [];

function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'trent') init3D();
}

function lancerCalculs() {
    const R = parseFloat(document.getElementById('rayon').value);
    const V = parseInt(document.getElementById('freqV').value);
    
    // Algorithme Kruschke (Coefficients de corde 3V Icosaèdre)
    // Longueur = R * Coefficient
    derniersResultats = [
        { type: 'A', cf: 0.3486, qte: 30, color: 'Rouge' },
        { type: 'B', cf: 0.4035, qte: 40, color: 'Vert' },
        { type: 'C', cf: 0.4124, qte: 50, color: 'Bleu' }
    ];

    let html = `<table><tr><th>Type</th><th>Couleur</th><th>Longueur (mm)</th><th>Quantité</th><th>Angle</th></tr>`;
    
    derniersResultats.forEach(s => {
        const mm = (s.cf * R * 1000).toFixed(1);
        const angle = (Math.acos(s.cf / 2) * (180 / Math.PI)).toFixed(2);
        s.longueurMM = mm; // Stockage pour l'export
        s.angleCoup = angle;
        html += `<tr><td>${s.type}</td><td>${s.color}</td><td><b>${mm}</b></td><td>${s.qte}</td><td>${angle}°</td></tr>`;
    });
    
    html += `</table>`;
    document.getElementById('table-results').innerHTML = html;
    showTab('schema');
}

function exporterCSV() {
    if (derniersResultats.length === 0) {
        alert("Veuillez d'abord lancer les calculs !");
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,Type;Couleur;Longueur_mm;Quantite;Angle_Coupe\n";
    derniersResultats.forEach(r => {
        csvContent += `${r.type};${r.color};${r.longueurMM};${r.qte};${r.angleCoup}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "decoupe_dome.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}