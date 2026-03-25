const imageInput = document.getElementById("image-input");
const predictButton = document.getElementById("predict-button");
const breedNameEl = document.getElementById("breed-name");
const confidenceText = document.getElementById("confidence-text");
const confidenceFill = document.getElementById("confidence-fill");
const resultCard = document.getElementById("result-card");
const resultBadge = document.getElementById("result-badge");
const imagePreview = document.getElementById("image-preview");
const previewContainer = document.getElementById("preview-container");
const uploadZone = document.getElementById("upload-zone");
const detailsButton = document.getElementById("details-button");
const detailsPanel = document.getElementById("details-panel");
const detailsContainer = document.getElementById("details-container");
const detailsTitle = document.getElementById("details-title");
const fileNameEl = document.getElementById("file-name");

let currentBreed = "";
let currentConfidence = "";
let currentDetails = "";
let historyLog = [];
let currentFile = null;

uploadZone.addEventListener('click', () => {
    imageInput.click();
});

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

function handleFile(file) {
    currentFile = file;
    const reader = new FileReader();
    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        previewContainer.style.display = 'block';
        predictButton.style.display = 'flex';
        uploadZone.style.display = 'none';
        fileNameEl.textContent = file.name;
    };
    reader.readAsDataURL(file);

    // Reset results
    resultCard.style.display = 'none';
    detailsPanel.style.display = 'none';
    detailsButton.style.display = 'none';
    document.getElementById("download-card-button").style.display = 'none';
    currentBreed = "";
}

predictButton.addEventListener("click", async () => {
    const file = currentFile || imageInput.files[0];
    if (!file) {
        alert("Please select an image first.");
        return;
    }

    // Loading state
    predictButton.disabled = true;
    predictButton.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div>`;

    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch("/predict", { method: "POST", body: formData });
        const data = await response.json();

        if (response.ok && data.breed) {
            currentBreed = data.breed;
            const confValue = parseFloat(data.confidence);

            breedNameEl.textContent = data.breed.replace(/_/g, ' ');
            confidenceText.textContent = data.confidence;
            confidenceFill.style.width = confValue + '%';

            if (confValue >= 70) {
                resultBadge.className = 'result-badge';
                resultBadge.textContent = '✓ Identified with high confidence';
            } else if (confValue >= 40) {
                resultBadge.className = 'result-badge warning';
                resultBadge.textContent = '⚠️ Low confidence — try a clearer image';
            } else {
                resultBadge.className = 'result-badge error';
                resultBadge.textContent = '✗ Very low confidence — result may be incorrect';
            }

            resultCard.style.display = 'block';
            detailsButton.style.display = 'block';
            document.getElementById("download-card-button").style.display = 'block';
            detailsButton.textContent = `📋 Get Details for ${data.breed.replace(/_/g, ' ')}`;
            detailsPanel.style.display = 'none';
            currentConfidence = data.confidence;
            currentDetails = "";
            addToHistory(data.breed, data.confidence);

        } else {
            breedNameEl.textContent = "Could not identify";
            confidenceText.textContent = "---";
            confidenceFill.style.width = '0%';
            resultBadge.className = 'result-badge error';
            resultBadge.textContent = '✗ Error';
            resultCard.style.display = 'block';
            document.getElementById("download-card-button").style.display = 'none';
        }
    } catch (error) {
        breedNameEl.textContent = "Connection error";
        resultBadge.className = 'result-badge error';
        resultBadge.textContent = '✗ Error';
        resultCard.style.display = 'block';
        document.getElementById("download-card-button").style.display = 'none';
    }

    predictButton.disabled = false;
    predictButton.innerHTML = `<span>🔍</span> Identify Breed →`;
});

detailsButton.addEventListener("click", async () => {
    if (!currentBreed) return;

    detailsTitle.textContent = `${currentBreed.replace(/_/g, ' ')} — Breed Profile`;
    detailsPanel.style.display = 'block';
    detailsContainer.innerHTML = `<div class="details-loading"><div class="spinner"></div> Generating breed information...</div>`;
    detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
        const response = await fetch("/get_details", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ breed: currentBreed })
        });
        const data = await response.json();

        if (response.ok && data.details) {
            currentDetails = data.details;
            detailsContainer.innerHTML = formatDetails(data.details);
        } else {
            detailsContainer.innerHTML = `<p style="color:#b43232;">Error: ${data.error || 'Failed to load details.'}</p>`;
        }
    } catch (error) {
        detailsContainer.innerHTML = `<p style="color:#b43232;">Connection error. Please try again.</p>`;
    }
});

function formatDetails(text) {
    const iconMap = {
        'origin': '🌍', 'region': '🌍',
        'primary use': '🎯', 'use': '🎯', 'purpose': '🎯',
        'milk': '🥛', 'dairy': '🥛',
        'physical': '📐', 'characteristic': '📐', 'appearance': '📐', 'coat': '📐', 'color': '📐', 'colour': '📐', 'size': '📐', 'weight': '📐',
        'temperament': '🧠', 'behavior': '🧠', 'nature': '🧠',
        'breed': '🐄', 'history': '📜'
    };

    function getIcon(label) {
        const lower = (label || '').toLowerCase();
        for (const [key, icon] of Object.entries(iconMap)) {
            if (lower.includes(key)) return icon;
        }
        return '•';
    }

    const lines = text.split('\n');
    const items = [];

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        const isSubBullet = /^\s*[-–]\s/.test(rawLine) || /^\s{2,}[\*\-•]/.test(rawLine) || /^[-–]\s/.test(trimmed);
        const clean = trimmed.replace(/^[\*\-•\d\.]+\s*/, '').trim();
        if (!clean) continue;

        const colonIdx = clean.indexOf(':');
        const hasLabel = colonIdx > 0 && colonIdx < 40;

        if (isSubBullet && items.length > 0) {
            const append = clean;
            items[items.length - 1].value += (items[items.length - 1].value ? ', ' : '') + append;
        } else if (hasLabel) {
            const rawLabel = clean.substring(0, colonIdx).replace(/\*\*/g, '').trim();
            const value = clean.substring(colonIdx + 1).replace(/\*\*/g, '').trim();
            items.push({ label: rawLabel, value, icon: getIcon(rawLabel) });
        }
    }

    if (items.length === 0) {
        return `<div class="details-raw"><p>${text.replace(/\n/g, '<br>')}</p></div>`;
    }

    let html = '<div class="details-grid">';
    for (const item of items) {
        html += `
        <div class="detail-item">
            <span class="detail-icon">${item.icon}</span>
            ${item.label ? `<div class="detail-label">${item.label}</div>` : ''}
            <div class="detail-value">${item.value}</div>
        </div>`;
    }
    html += '</div>';
    return html;
}

function formatHistoryTime(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${h}:${m}`;
}

function addToHistory(breed, confidence) {
    historyLog.unshift({
        breed,
        confidence,
        timestamp: new Date()
    });
    renderHistory();
}

function renderHistory() {
    const empty = document.getElementById("history-empty");
    const wrap = document.getElementById("history-table-wrap");
    const tbody = document.getElementById("history-tbody");
    empty.style.display = historyLog.length ? "none" : "block";
    wrap.style.display = historyLog.length ? "block" : "none";
    tbody.innerHTML = "";
    for (const h of historyLog) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${h.breed.replace(/_/g, ' ')}</td>
            <td>${h.confidence}</td>
            <td>${formatHistoryTime(h.timestamp)}</td>
        `;
        tbody.appendChild(tr);
    }
}

document.getElementById("change-image-btn").addEventListener("click", () => {
    imageInput.click();
});

document.getElementById("clear-history-btn").addEventListener("click", () => {
    historyLog = [];
    renderHistory();
});

document.getElementById("download-card-button").addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    const cream = "#F5F0E8";
    const brown = "#3D2B1F";
    const amber = "#C17A3A";
    const green = "#2D5A3D";
    ctx.fillStyle = cream;
    ctx.fillRect(0, 0, 480, 320);
    ctx.strokeStyle = amber;
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 456, 296);
    ctx.fillStyle = brown;
    ctx.font = "bold 22px Georgia";
    ctx.fillText("Bovine Breed AI — Report", 24, 48);
    ctx.font = "24px Georgia";
    ctx.fillText(currentBreed.replace(/_/g, ' '), 24, 88);
    ctx.fillStyle = amber;
    ctx.font = "18px sans-serif";
    ctx.fillText(`Confidence: ${currentConfidence}`, 24, 120);
    if (currentDetails) {
        const lines = currentDetails.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 6);
        ctx.fillStyle = brown;
        ctx.font = "14px sans-serif";
        let y = 160;
        for (const line of lines) {
            const short = line.length > 55 ? line.slice(0, 52) + "..." : line;
            ctx.fillText(short, 24, y);
            y += 22;
        }
    }
    const link = document.createElement("a");
    link.download = `breed-result-${currentBreed}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
});