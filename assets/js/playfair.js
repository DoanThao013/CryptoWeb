document.addEventListener("DOMContentLoaded", () => {

    // ==========================
    // 🔹 CÁC PHẦN TỬ GIAO DIỆN
    // ==========================
    const inputText = document.getElementById("input-text");
    const outputText = document.getElementById("output-text");
    const keyInput = document.getElementById("playfair-key");
    const radio5x5 = document.getElementById("size-5x5");
    const radio6x6 = document.getElementById("size-6x6");
    const matrixGrid = document.getElementById("matrix-grid");

    // ==========================
    // 🔹 HẰNG SỐ
    // ==========================
    const ALPHA_5 = "ABCDEFGHIKLMNOPQRSTUVWXYZ"; // J excluded
    const ALPHA_6 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    // ==========================
    // 🔹 1. NÚT MỞ FILE INPUT
    // ==========================
    document.getElementById("btn-open").addEventListener("click", () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".txt";
        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => inputText.value = ev.target.result;
            reader.readAsText(file, "UTF-8");
        };
        fileInput.click();
    });

    // ==========================
    // 🔹 2. NÚT EXPORT OUTPUT
    // ==========================
    document.getElementById("btn-export").addEventListener("click", () => {
        const blob = new Blob([outputText.value], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Playfair_Result.txt";
        link.click();
        URL.revokeObjectURL(link.href);
    });

    // ==========================
    // 🔹 3. CHỌN 5x5 HOẶC 6x6
    // ==========================
    radio5x5.addEventListener("change", () => updateMatrix());
    radio6x6.addEventListener("change", () => updateMatrix());
    keyInput.addEventListener("input", () => updateMatrix());

    function updateMatrix() {
        const size = radio6x6.checked ? 6 : 5;
        const key = keyInput.value.toUpperCase();
        generateMatrix(key, size);
    }

    // ==========================
    // 🔹 4. TẠO MA TRẬN
    // ==========================
    function generateMatrix(rawKey, size) {
        const allowed = size === 5 ? ALPHA_5 : ALPHA_6;

        // Chuẩn hóa key
        let key = rawKey.toUpperCase();
        if (size === 5) key = key.replace(/J/g, "I");

        // Loại bỏ ký tự trùng, chỉ giữ ký tự hợp lệ
        let seen = new Set();
        let normalized = "";
        for (let c of key) {
            if (allowed.includes(c) && !seen.has(c)) {
                seen.add(c);
                normalized += c;
            }
        }

        // Thêm ký tự còn thiếu
        for (let c of allowed) {
            if (!seen.has(c)) normalized += c;
        }

        // Tạo mảng 2D
        const matrix = [];
        for (let i = 0; i < size; i++) {
            matrix.push(normalized.slice(i * size, (i + 1) * size).split(""));
        }

        // Cập nhật giao diện
        renderMatrix(matrix);
        return matrix;
    }

    function renderMatrix(matrix) {
        matrixGrid.innerHTML = "";
        matrixGrid.style.setProperty("--grid-cols", matrix.length);
        matrix.flat().forEach(ch => {
            const cell = document.createElement("input");
            cell.value = ch;
            cell.readOnly = true;
            cell.className = "form-control";
            matrixGrid.appendChild(cell);
        });
    }

    // ==========================
    // 🔹 5. CHUẨN HÓA VĂN BẢN
    // ==========================
    function normalizeInput(text, size) {
        let cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (size === 5) cleaned = cleaned.replace(/J/g, "I");
        return cleaned;
    }

    // ==========================
    // 🔹 6. TÌM VỊ TRÍ TRONG MA TRẬN
    // ==========================
    function findPosition(matrix, c) {
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                if (matrix[i][j] === c) return [i, j];
            }
        }
        throw new Error("Character not found in matrix: " + c);
    }

    // ==========================
    // 🔹 7. THUẬT TOÁN PLAYFAIR
    // ==========================
    function processPlayfair(text, matrix, size, shift) {
        let prepared = "";
        for (let i = 0; i < text.length; i += 2) {
            let a = text[i];
            let b = text[i + 1] || "X";
            if (a === b) {
                prepared += a + "X";
                i--;
            } else prepared += a + b;
        }

        let output = "";
        for (let i = 0; i < prepared.length; i += 2) {
            const [x1, y1] = findPosition(matrix, prepared[i]);
            const [x2, y2] = findPosition(matrix, prepared[i + 1]);

            if (x1 === x2) { // cùng hàng
                output += matrix[x1][(y1 + shift + size) % size];
                output += matrix[x2][(y2 + shift + size) % size];
            } else if (y1 === y2) { // cùng cột
                output += matrix[(x1 + shift + size) % size][y1];
                output += matrix[(x2 + shift + size) % size][y2];
            } else { // hình chữ nhật
                output += matrix[x1][y2];
                output += matrix[x2][y1];
            }
        }

        return output;
    }

    // ==========================
    // 🔹 8. NÚT MÃ HÓA
    // ==========================
    document.getElementById("btn-encrypt").addEventListener("click", () => {
        const size = radio6x6.checked ? 6 : 5;
        const matrix = generateMatrix(keyInput.value, size);
        const text = normalizeInput(inputText.value, size);
        outputText.value = processPlayfair(text, matrix, size, +1);
    });

    // ==========================
    // 🔹 9. NÚT GIẢI MÃ
    // ==========================
    document.getElementById("btn-decrypt").addEventListener("click", () => {
        const size = radio6x6.checked ? 6 : 5;
        const matrix = generateMatrix(keyInput.value, size);
        const text = normalizeInput(inputText.value, size);
        let decrypted = processPlayfair(text, matrix, size, -1);

        // Xóa ký tự X thừa
        let clean = "";
        for (let i = 0; i < decrypted.length; i++) {
            if (decrypted[i] === "X" && decrypted[i - 1] === decrypted[i + 1]) continue;
            clean += decrypted[i];
        }
        if (clean.endsWith("X")) clean = clean.slice(0, -1);
        outputText.value = clean;
    });

    // ==========================
    // 🔹 10. NÚT SWAP
    // ==========================
    document.getElementById("btn-swap").addEventListener("click", () => {
        inputText.value = outputText.value;
        outputText.value = "";
    });

    // ==========================
    // 🔹 11. NÚT QUAY LẠI
    // ==========================
    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "index.html";
    });

    // Tạo ma trận mặc định ban đầu
    generateMatrix("", 5);
});
