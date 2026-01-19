exports.handler = async function(event, context) {
    // 1. CORS Headers (Allows your website to talk to this function)
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body);
        const { username, password } = payload;

        // --- 🔒 CONFIGURATION SECTION 🔒 ---
        
        // 1. Set your Login Credentials (for the website login)
        const VALID_USER = "admin";       
        const VALID_PASS = "solar123";    
        
        // 2. Set your Growatt Fixed Token
        const API_TOKEN = "YOUR_FIXED_TOKEN_HERE"; 

        // -----------------------------------

        // Step 1: Check Website Credentials
        if (username !== VALID_USER || password !== VALID_PASS) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: "Wrong username or password" })
            };
        }

        // Step 2: Prepare the Growatt V4 Request
        const GROWATT_URL = "https://openapi.growatt.com/v4/new-api/queryDeviceList"; 

        // IMPORTANT: V4 requires 'application/x-www-form-urlencoded'
        // We use URLSearchParams to format the body correctly
        const params = new URLSearchParams();
        params.append('page', '1');
        params.append('pagesize', '50'); // Get up to 50 devices

        const response = await fetch(GROWATT_URL, {
            method: 'POST',
            headers: { 
                'token': API_TOKEN, // Token goes in Header
                'Content-Type': 'application/x-www-form-urlencoded' 
            },
            body: params // Body is sent as form data
        });

        const rawText = await response.text();
        
        // Debugging: If it fails, we want to see exactly what Growatt said
        if (!response.ok) {
            console.log("Growatt Error:", rawText);
            return { statusCode: response.status, headers, body: `Growatt API Error: ${rawText}` };
        }

        // Parse the JSON response
        const data = JSON.parse(rawText);

        // Step 3: Return Data to Frontend
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};