export function jsonFileParser(filePath) {
    fetch(filePath)
    .then(response => {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text(); // Get the response as plain text
    })
    .then(jsonString => {
    const data = JSON.parse(jsonString); // Parse the JSON string
    console.log(data);
    })
    .catch(error => console.error('Error fetching or parsing JSON:', error));
}