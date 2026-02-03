<?php
// Set content type to JSON
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Samo su POST zahtjevi dozvoljeni.']);
    exit;
}

// Get the raw POST data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Check if JSON is valid and contains the required keys
if ($data === null || !isset($data['fileName']) || !isset($data['jsonData'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Nevažeći JSON ili nedostaju potrebni ključevi (fileName, jsonData).']);
    exit;
}

$fileName = $data['fileName'];
$jsonData = $data['jsonData'];

// --- Security Check ---
// A simple whitelist of allowed filenames to prevent directory traversal attacks
$allowedFiles = [
    'ucionice.json',
    'predmeti.json',
    'profesori.json',
    'razredi.json',
    'program.json',
    'kurikulum.json',
    'raspored.json'
];

if (!in_array($fileName, $allowedFiles)) {
    http_response_code(403); // Forbidden
    echo json_encode(['error' => 'Pristup datoteci ' . htmlspecialchars($fileName) . ' nije dozvoljen.']);
    exit;
}

// The path to the file. We assume the PHP script is in /server/ and the JSON files are in the root.
$filePath = '../' . $fileName;

// Convert the data back to a nicely formatted JSON string
$jsonString = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// Write the file
if (file_put_contents($filePath, $jsonString) === false) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Spremanje u datoteku nije uspjelo. Provjerite dozvole (permissions).']);
    exit;
}

// Success
echo json_encode(['success' => true, 'message' => 'Datoteka ' . htmlspecialchars($fileName) . ' je uspješno spremljena.']);
?>
