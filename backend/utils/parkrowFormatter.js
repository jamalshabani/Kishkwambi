/**
 * Utility function to format ParkRow API response to extract only essential container data
 * @param {Object} parkrowResponse - Raw response from ParkRow API
 * @returns {Object} Formatted response with only containerNumber and isoCode
 */
function formatParkRowResponse(parkrowResponse) {
    // Initialize the essential fields
    let containerNumber = '';
    let isoCode = '';
    let containerNumberConfidence = 0;
    let isoCodeConfidence = 0;
    
    // Handle new ParkRow API format with results array
    if (parkrowResponse.results && Array.isArray(parkrowResponse.results)) {
        let ownerCode = '';
        let serialNumber = '';
        let ownerCodeConfidence = 0;
        let serialNumberConfidence = 0;
        
        // Process each result object
        parkrowResponse.results.forEach(result => {
            if (result.texts && result.texts.length > 0) {
                const textValue = result.texts[0].value;
                const confidence = result.texts[0].score || 0;
                
                // Check the object label to determine what type of data this is
                if (result.object && result.object.label) {
                    switch (result.object.label) {
                        case 'Owner Code and Category Identifier':
                            ownerCode = textValue;
                            ownerCodeConfidence = confidence;
                            break;
                        case 'Serial Number':
                            serialNumber = textValue;
                            serialNumberConfidence = confidence;
                            break;
                        case 'Size and Type Codes':
                            isoCode = textValue;
                            isoCodeConfidence = confidence;
                            break;
                    }
                }
            }
        });
        
        // Calculate average confidence for container number (owner code + serial number)
        if (ownerCode && serialNumber) {
            containerNumberConfidence = (ownerCodeConfidence + serialNumberConfidence) / 2;
        }
        
        // Combine owner code and serial number to form container number
        if (ownerCode && serialNumber) {
            containerNumber = ownerCode + serialNumber;
        }
    }
    
    // Handle legacy ParkRow API format (direct fields)
    if (!containerNumber && parkrowResponse.container_number) {
        containerNumber = parkrowResponse.container_number;
    }
    
    if (!containerNumber && parkrowResponse.containerNumber) {
        containerNumber = parkrowResponse.containerNumber;
    }
    
    if (!isoCode && parkrowResponse.iso_code) {
        isoCode = parkrowResponse.iso_code;
    }
    
    if (!isoCode && parkrowResponse.isoCode) {
        isoCode = parkrowResponse.isoCode;
    }
    
    // Fallback: If structured data is not available, try to extract from raw text
    const rawText = parkrowResponse.raw_text || '';
    
    if (!containerNumber && rawText) {
        // Pattern: 4 letters + 6 or 7 digits (with optional spaces and check digit)
        const containerPattern = /[A-Z]{4}\s*\d{6,7}\s*\d?/g;
        const containerMatch = rawText.match(containerPattern);
        if (containerMatch) {
            containerNumber = containerMatch[0].replace(/\s/g, '');
            if (containerNumber.length < 11) {
                containerNumber = containerNumber.padEnd(11, '');
            }
        }
    }
    
    if (!isoCode && rawText) {
        // ISO Code extraction with OCR error correction
        // First, try to match the correct pattern: 2 digits + letter + digit
        const isoPattern = /\b\d{2}[A-Z]\d\b/g;
        const isoMatch = rawText.match(isoPattern);
        
        if (isoMatch) {
            isoCode = isoMatch[0];
        } else {
            // If no match, look for 4 consecutive digits (common OCR error)
            const fourDigitsPattern = /\b\d{4}\b/g;
            const fourDigitsMatch = rawText.match(fourDigitsPattern);
            
            if (fourDigitsMatch) {
                // Common OCR confusions for letters in ISO codes
                const digitToLetter = {
                    '0': 'O',
                    '1': 'I',
                    '5': 'S',
                    '6': 'G',
                    '8': 'B'
                };
                
                // Try each 4-digit match
                for (const candidate of fourDigitsMatch) {
                    // ISO code format: 2 digits + letter + digit
                    // So the 3rd character (index 2) should be a letter
                    const digits = candidate.split('');
                    const thirdChar = digits[2];
                    
                    // If third character is a commonly confused digit, replace it
                    if (digitToLetter[thirdChar]) {
                        digits[2] = digitToLetter[thirdChar];
                        isoCode = digits.join('');
                        break;
                    }
                }
            }
        }
    }

    return {
        success: true,
        data: {
            containerNumber,
            isoCode,
            containerNumberConfidence,
            isoCodeConfidence
        }
    };
}

/**
 * Utility function to format Google Vision AI response to extract container data
 * @param {string} rawText - Raw text extracted from Google Vision API
 * @returns {Object} Formatted response with containerNumber, isoCode, and confidence scores
 */
function formatGoogleVisionResponse(rawText) {
    // Initialize the essential fields
    let containerNumber = '';
    let isoCode = '';
    let containerNumberConfidence = 0;
    let isoCodeConfidence = 0;
    
    if (rawText) {
        // Container Number extraction: 4 letters + 6 or 7 digits (with optional spaces and check digit)
        const containerPattern = /[A-Z]{4}\s*\d{6,7}\s*\d?/g;
        const containerMatch = rawText.match(containerPattern);
        if (containerMatch) {
            containerNumber = containerMatch[0].replace(/\s/g, '');
            if (containerNumber.length < 11) {
                containerNumber = containerNumber.padEnd(11, '');
            }
            // Calculate confidence based on pattern match quality
            containerNumberConfidence = containerNumber.length === 11 ? 0.95 : 0.85;
        }
        
        // ISO Code extraction with OCR error correction
        // First, try to match the correct pattern: 2 digits + letter + digit
        const isoPattern = /\b\d{2}[A-Z]\d\b/g;
        const isoMatch = rawText.match(isoPattern);
        
        if (isoMatch) {
            isoCode = isoMatch[0];
            isoCodeConfidence = 0.95; // High confidence for perfect pattern match
        } else {
            // If no match, look for 4 consecutive digits (common OCR error)
            const fourDigitsPattern = /\b\d{4}\b/g;
            const fourDigitsMatch = rawText.match(fourDigitsPattern);
            
            if (fourDigitsMatch) {
                // Common OCR confusions for letters in ISO codes
                const digitToLetter = {
                    '0': 'O',
                    '1': 'I',
                    '5': 'S',
                    '6': 'G',
                    '8': 'B'
                };
                
                // Try each 4-digit match
                for (const candidate of fourDigitsMatch) {
                    // ISO code format: 2 digits + letter + digit
                    // So the 3rd character (index 2) should be a letter
                    const digits = candidate.split('');
                    const thirdChar = digits[2];
                    
                    // If third character is a commonly confused digit, replace it
                    if (digitToLetter[thirdChar]) {
                        digits[2] = digitToLetter[thirdChar];
                        isoCode = digits.join('');
                        isoCodeConfidence = 0.80; // Lower confidence for OCR correction
                        break;
                    }
                }
            }
        }
    }

    return {
        success: true,
        data: {
            containerNumber,
            isoCode,
            containerNumberConfidence,
            isoCodeConfidence
        }
    };
}

module.exports = {
    formatParkRowResponse,
    formatGoogleVisionResponse
};