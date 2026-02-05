/**
 * Asynchronously saves data to a JSON file on the server.
 * @param {string} fileName - The name of the JSON file to save (e.g., 'ucionice.json').
 * @param {object | Array} jsonData - The JavaScript object or array to be saved.
 * @returns {Promise<object>} A promise that resolves with the server's response.
 */
export async function spremiJSON(fileName, jsonData) {
  const url = "server/SaveJSON.php";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: fileName,
        jsonData: jsonData,
      }),
    });

    // Check if the response is ok (status in the range 200-299)
    if (!response.ok) {
      // Try to parse the error response body
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! Status: ${response.status}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Greška pri spremanju JSON-a:", error);
    // Re-throw the error to be handled by the caller, or return a standard error format
    // This allows the calling function to display a specific error message
    return { success: false, message: error.message };
  }
}
