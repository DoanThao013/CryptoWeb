document.addEventListener("DOMContentLoaded", () => {
  const inputText = document.getElementById("input-text");
  const outputText = document.getElementById("output-text");
  const keyInput = document.getElementById("playfair-key");
  const radio5x5 = document.getElementById("size-5x5");
  const radio6x6 = document.getElementById("size-6x6");
  const matrixGrid = document.getElementById("matrix-grid");

  const ALPHA_5 = "ABCDEFGHIKLMNOPQRSTUVWXYZ"; // J excluded
  const ALPHA_6 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  document.getElementById("btn-open").addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".txt";
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => (inputText.value = ev.target.result);
      reader.readAsText(file, "UTF-8");
    };
    fileInput.click();
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([outputText.value], {
      type: "text/plain;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Playfair_Result.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  radio5x5.addEventListener("change", () => updateMatrix());
  radio6x6.addEventListener("change", () => updateMatrix());
  keyInput.addEventListener("input", () => updateMatrix());

  function updateMatrix() {
    const size = radio6x6.checked ? 6 : 5;
    const key = keyInput.value.toUpperCase();
    generateMatrix(key, size);
  }

  function generateMatrix(rawKey, size) {
    const allowed = size === 5 ? ALPHA_5 : ALPHA_6;

    let key = rawKey.toUpperCase();
    if (size === 5) key = key.replace(/J/g, "I");

    let seen = new Set();
    let normalized = "";
    for (let c of key) {
      if (allowed.includes(c) && !seen.has(c)) {
        seen.add(c);
        normalized += c;
      }
    }

    for (let c of allowed) {
      if (!seen.has(c)) normalized += c;
    }

    const matrix = [];
    for (let i = 0; i < size; i++) {
      matrix.push(normalized.slice(i * size, (i + 1) * size).split(""));
    }

    renderMatrix(matrix);
    return matrix;
  }

  function renderMatrix(matrix) {
    matrixGrid.innerHTML = "";
    matrixGrid.style.setProperty("--grid-cols", matrix.length);
    matrix.flat().forEach((ch) => {
      const cell = document.createElement("input");
      cell.value = ch;
      cell.readOnly = true;
      cell.className = "form-control";
      matrixGrid.appendChild(cell);
    });
  }

  function normalizeInput(text, size) {
    let cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (size === 5) cleaned = cleaned.replace(/J/g, "I");
    return cleaned;
  }

  function findPosition(matrix, c) {
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (matrix[i][j] === c) return [i, j];
      }
    }
    return null;
  }

  function processPlayfair(text, matrix, size, shift) {
    if (!text || text.length < 2) return "";

    let prepared = [];
    let i = 0;

    while (i < text.length) {
      let a = text[i];
      let b = text[i + 1];

      if (!b) {
        prepared.push(a + "X");
        i++;
      } else if (a === b) {
        prepared.push(a + "X");
        i++;
      } else {
        prepared.push(a + b);
        i += 2;
      }
    }

    let output = "";

    for (let pair of prepared) {
      const pos1 = findPosition(matrix, pair[0]);
      const pos2 = findPosition(matrix, pair[1]);

      if (!pos1 || !pos2) continue;

      const [x1, y1] = pos1;
      const [x2, y2] = pos2;

      if (x1 === x2) {
        output += matrix[x1][(y1 + shift + size) % size];
        output += matrix[x2][(y2 + shift + size) % size];
      } else if (y1 === y2) {
        output += matrix[(x1 + shift + size) % size][y1];
        output += matrix[(x2 + shift + size) % size][y2];
      } else {
        output += matrix[x1][y2];
        output += matrix[x2][y1];
      }
    }

    return output;
  }

  document.getElementById("btn-encrypt").addEventListener("click", () => {
    const size = radio6x6.checked ? 6 : 5;
    const matrix = generateMatrix(keyInput.value, size);
    const text = normalizeInput(inputText.value, size);

    if (!text) {
      outputText.value = "";
      return;
    }

    outputText.value = processPlayfair(text, matrix, size, +1);
  });

  document.getElementById("btn-decrypt").addEventListener("click", () => {
    const size = radio6x6.checked ? 6 : 5;
    const matrix = generateMatrix(keyInput.value, size);
    const text = normalizeInput(inputText.value, size);

    let decrypted = processPlayfair(text, matrix, size, -1);

    let clean = "";
    for (let i = 0; i < decrypted.length; i++) {
      if (
        decrypted[i] === "X" &&
        i > 0 &&
        i < decrypted.length - 1 &&
        decrypted[i - 1] === decrypted[i + 1]
      ) {
        continue;
      }
      clean += decrypted[i];
    }

    if (clean.endsWith("X")) clean = clean.slice(0, -1);
    outputText.value = clean;
  });

  document.getElementById("btn-swap").addEventListener("click", () => {
    inputText.value = outputText.value;
    outputText.value = "";
  });

  document.getElementById("back-button").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  generateMatrix("", 5);
});
