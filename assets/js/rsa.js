// rsa.js - RSA Encryption/Decryption Logic

// Global variables (using BigInt for large numbers)
let P = 0n, Q = 0n, N = 0n, E = 0n, D = 0n, PhiN = 0n;

// DOM elements
const pVal = document.getElementById('p-val');
const qVal = document.getElementById('q-val');
const phinVal = document.getElementById('phin-val');
const publicN = document.getElementById('public-n');
const publicE = document.getElementById('public-e');
const privateD = document.getElementById('private-d');
const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const messageBox = document.getElementById('message-box');
const back_btn = document.getElementById('back-button');

back_btn.addEventListener('click', () => { window.location.href = '../index.html'; });
// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-generate').addEventListener('click', generateKey);
    document.getElementById('btn-clear').addEventListener('click', clearAllFields);
    document.getElementById('btn-encrypt').addEventListener('click', encrypt);
    document.getElementById('btn-decrypt').addEventListener('click', decrypt);
    document.getElementById('btn-open').addEventListener('click', openFile);
    document.getElementById('btn-export').addEventListener('click', exportFile);
    document.getElementById('btn-swap').addEventListener('click', swapText);
    document.getElementById('back-button').addEventListener('click', () => window.history.back());
});

// Utility functions
function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.classList.add('show');
    messageBox.style.backgroundColor = isError ? '#dc3545' : '#28a745';
    setTimeout(() => messageBox.classList.remove('show'), 3000);
}

function clearAllFields() {
    pVal.value = qVal.value = phinVal.value = publicN.value = publicE.value = privateD.value = inputText.value = outputText.value = '';
    P = Q = N = E = D = PhiN = 0n;
}

// Generate random prime between 100 and 1000 (can be adjusted for larger N)
function getRandomPrime() {
    let num;
    do {
        num = BigInt(Math.floor(Math.random() * (1000 - 100) + 100));
    } while (!checkPrime(num));
    return num;
}

// Check if a number is prime
function checkPrime(number) {
    if (number <= 1n) return false;
    if (number === 2n || number === 3n) return true;
    if (number % 2n === 0n || number % 3n === 0n) return false;
    for (let i = 5n; i * i <= number; i += 6n) {
        if (number % i === 0n || number % (i + 2n) === 0n) return false;
    }
    return true;
}

// Check if two numbers are coprime (gcd = 1)
function isCoprime(a, b) {
    while (b !== 0n) {
        let temp = b;
        b = a % b;
        a = temp;
    }
    return a === 1n;
}

// Extended Euclidean algorithm
function extendedGCD(a, b) {
    if (b === 0n) return { gcd: a, x: 1n, y: 0n };
    const result = extendedGCD(b, a % b);
    const x = result.y;
    const y = result.x - (a / b) * result.y;
    return { gcd: result.gcd, x, y };
}

// Modular exponentiation
function modPow(base, exponent, modulus) {
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent % 2n === 1n) result = (result * base) % modulus;
        exponent >>= 1n;
        base = (base * base) % modulus;
    }
    return result;
}

// Convert BigInt to byte array (little endian)
function bigIntToByteArray(value) {
    const bytes = [];
    for (let i = 0; i < 8; i++) {
        bytes.push(Number(value & 255n));
        value >>= 8n;
    }
    return bytes;
}

// Convert byte array to BigInt (little endian)
function byteArrayToBigInt(bytes) {
    let value = 0n;
    for (let i = 0; i < Math.min(bytes.length, 8); i++) {
        value |= BigInt(bytes[i]) << BigInt(i * 8);
    }
    return value;
}

// Get max block size for N (ensures 256^blockSize - 1 < N)
function getMaxBlockSize(N) {
    let k = 0;
    let val = 1n;
    while (val * 256n < N + 1n && k < 8) {
        val *= 256n;
        k++;
    }
    return k;
}

// Generate RSA keys
function generateKey() {
    if (pVal.value === '' && qVal.value === '') clearAllFields();

    const userProvidedP = pVal.value.trim() !== '';
    const userProvidedQ = qVal.value.trim() !== '';

    if (userProvidedP || userProvidedQ) {
        if (!userProvidedP || !userProvidedQ) {
            showMessage('Please provide both P and Q values or leave both empty for auto-generation.', true);
            return;
        }
        P = BigInt(pVal.value.trim());
        Q = BigInt(qVal.value.trim());
        if (!checkPrime(P)) {
            showMessage('P must be a prime number.', true);
            return;
        }
        if (!checkPrime(Q)) {
            showMessage('Q must be a prime number.', true);
            return;
        }
        if (P === Q) {
            showMessage('P and Q must be different prime numbers.', true);
            return;
        }
        // Kiểm tra tích số P*Q
        if (P * Q <= 255n) {
            showMessage('P × Q must be greater than 255. Please enter larger primes.', true);
            return;
        }
    } else {
        P = getRandomPrime();
        do {
            Q = getRandomPrime();
        } while (P === Q || P * Q <= 255n);
        pVal.value = P.toString();
        qVal.value = Q.toString();
    }

    generateRSAKeys();
}


function generateRSAKeys() {
    try {
        N = P * Q;
        if (N < 2n) {
            showMessage('N is too small. Please use larger prime numbers.', true);
            return;
        }
        if (N < 256n) {
            showMessage('Warning: N is small. Only bytes < N will be encrypted; others will be skipped.', false);
        }
        publicN.value = N.toString();
        PhiN = (P - 1n) * (Q - 1n);
        phinVal.value = PhiN.toString();
        do {
            E = BigInt(Math.floor(Math.random() * Number(PhiN - 2n)) + 2);
        } while (!isCoprime(E, PhiN));
        publicE.value = E.toString();
        const egcd = extendedGCD(E, PhiN);
        D = egcd.x < 0n ? egcd.x + PhiN : egcd.x;
        privateD.value = D.toString();
        showMessage('Keys generated successfully!');
    } catch (ex) {
        showMessage(`Error generating keys: ${ex.message}`, true);
    }
}

// Encrypt
function encrypt() {
    if (D === 0n) {
        showMessage('Please generate keys first!', true);
        return;
    }
    const plaintext = inputText.value.trim();
    if (!plaintext) {
        showMessage('Please enter text to encrypt.', true);
        return;
    }
    try {
        // encryptRSA giờ trả về ciphertext dạng Base64
        const ciphertext = encryptRSA(plaintext, E, N);
        outputText.value = ciphertext;
        showMessage('Encryption successful!', false);
    } catch (ex) {
        showMessage(`Encryption failed: ${ex.message}`, true);
    }
}

// Decrypt
function decrypt() {
    if (D === 0n) {
        showMessage('Please generate keys first!', true);
        return;
    }
    const base64Input = inputText.value.trim();
    if (!base64Input) {
        showMessage('No data to decrypt!', true);
        return;
    }
    try {
        // Giờ decryptRSA cần truyền cả D và N
        const decryptedText = decryptRSA(base64Input, D, N);
        outputText.value = decryptedText;
        showMessage('Decryption successful!', false);
    } catch (ex) {
        showMessage(`Decryption failed: ${ex.message}`, true);
    }
}

// RSA Encryption (basic, block-based)
function encryptRSA(plaintext, E, N) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(plaintext);
    const encryptedBlocks = [];

    // Tính kích thước khối tối đa sao cho giá trị < N
    let maxBlockSize = 1;
    while (true) {
        const testBytes = new Uint8Array(maxBlockSize).fill(255); // khối toàn byte 0xFF
        const testValue = BigInt('0x' + [...testBytes].map(b => b.toString(16).padStart(2, '0')).join(''));
        if (testValue >= N) break;
        maxBlockSize++;
    }
    maxBlockSize--; // giảm lại 1 để đảm bảo < N

    for (let i = 0; i < bytes.length; i += maxBlockSize) {
        const block = bytes.slice(i, i + maxBlockSize);
        const m = BigInt('0x' + [...block].map(b => b.toString(16).padStart(2, '0')).join(''));
        const c = modPow(m, E, N);
        const blockLength = Math.ceil(N.toString(16).length / 2); // số byte cần để biểu diễn ciphertext
        const hex = c.toString(16).padStart(blockLength * 2, '0');
        encryptedBlocks.push(hex);
    }

    // Ghép các block lại và encode Base64
    const ciphertextHex = encryptedBlocks.join('');
    const ciphertextBytes = new Uint8Array(ciphertextHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const ciphertextBase64 = btoa(String.fromCharCode(...ciphertextBytes));

    return ciphertextBase64;
}



// RSA Decryption
function decryptRSA(base64Ciphertext, D, N) {
    // Giải mã Base64 về mảng byte
    const encryptedBytes = Uint8Array.from(atob(base64Ciphertext), c => c.charCodeAt(0));

    // Chuyển mảng byte thành chuỗi hex
    const ciphertextHex = [...encryptedBytes]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const decryptedBytes = [];

    if (N <= 255n) {
        // Trường hợp N nhỏ: mỗi byte được mã hóa riêng
        for (let i = 0; i < ciphertextHex.length; i += 2) {
            const c = BigInt('0x' + ciphertextHex.slice(i, i + 2));
            const m = modPow(c, D, N);
            decryptedBytes.push(Number(m));
        }
    } else {
        // Trường hợp N lớn: chia theo blockSize
        const blockSize = (N.toString(16).length + 1) >> 1;
        for (let i = 0; i < ciphertextHex.length; i += blockSize * 2) {
            const blockHex = ciphertextHex.slice(i, i + blockSize * 2);
            const c = BigInt('0x' + blockHex);
            const m = modPow(c, D, N);

            // Chuyển kết quả về byte array
            let mHex = m.toString(16);
            if (mHex.length % 2 !== 0) mHex = '0' + mHex; // đảm bảo chẵn
            const blockBytes = mHex.match(/.{2}/g).map(b => parseInt(b, 16));

            // Loại bỏ các byte 0 ở đầu (padding)
            while (blockBytes.length > 0 && blockBytes[0] === 0) {
                blockBytes.shift();
            }

            decryptedBytes.push(...blockBytes);
        }
    }

    return new TextDecoder().decode(new Uint8Array(decryptedBytes));
}



// Open file
function openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => inputText.value = reader.result;
            reader.readAsText(file, 'UTF-8');
        }
    };
    input.click();
}

// Export file
function exportFile() {
    const content = outputText.value;
    if (!content) {
        showMessage('No content to export!', true);
        return;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.txt';
    a.click();
    URL.revokeObjectURL(url);
    showMessage('File exported successfully!');
}

